import numpy as np
import joblib
import re
from typing import List, Dict, Set
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_distances

class PredatorDetector:
    def __init__(self, ground_truth_path: str, n_clusters: int = 5):
        self.predator_ids = self._load_ground_truth(ground_truth_path)
        self.n_clusters = n_clusters
        
        # We will store centroids (archetypes)
        self.predator_centroids = None
        self.normal_centroids = None
        
        self.risk_keywords = {
            'cam', 'camera', 'pic', 'picture', 'age', 'old', 'meet', 'live', 
            'location', 'address', 'number', 'phone', 'secret', 'private', 
            'parents', 'mom', 'dad', 'nude', 'naked', 'kik', 'snap'
        }
        
    def _load_ground_truth(self, path: str) -> Set[str]:
        try:
            with open(path, 'r') as f:
                return set(line.strip() for line in f if line.strip())
        except FileNotFoundError:
            return set()

    def is_predatory_conversation(self, user_ids: List[str]) -> bool:
        for uid in user_ids:
            if uid in self.predator_ids:
                return True
        return False

    def count_risk_keywords(self, messages: List[Dict]) -> int:
        count = 0
        for msg in messages:
            text = msg['text'].lower()
            # Basic boundary check to avoid matching 'age' in 'page'
            words = set(re.findall(r'\b\w+\b', text))
            if words.intersection(self.risk_keywords):
                count += 1
        return count

    def train(self, conversations: List):
        print("Vectorizing conversations using Graph-Weighted Embeddings...")
        
        X_pred = []
        X_normal = []
        
        for conv in conversations:
            # This gets the 1536-d vector
            vec = conv.get_weighted_embedding()
            
            if self.is_predatory_conversation(conv.data['user_ids']):
                X_pred.append(vec)
            else:
                X_normal.append(vec)
        
        X_pred = np.array(X_pred)
        X_normal = np.array(X_normal)
        
        print(f"Training Data: {len(X_pred)} Predator Vectors / {len(X_normal)} Normal Vectors")
        
        # 1. Cluster Predators (Find Archetypes)
        # If we have fewer samples than clusters, adjust k
        k_pred = min(self.n_clusters, len(X_pred)) if len(X_pred) > 0 else 1
        self.kmeans_pred = KMeans(n_clusters=k_pred, random_state=42, n_init=10)
        if len(X_pred) > 0:
            self.kmeans_pred.fit(X_pred)
            self.predator_centroids = self.kmeans_pred.cluster_centers_
        
        # 2. Cluster Normal (Find Normal Types)
        k_norm = min(self.n_clusters, len(X_normal)) if len(X_normal) > 0 else 1
        self.kmeans_norm = KMeans(n_clusters=k_norm, random_state=42, n_init=10)
        if len(X_normal) > 0:
            self.kmeans_norm.fit(X_normal)
            self.normal_centroids = self.kmeans_norm.cluster_centers_
            
        print("Clustering Complete. Archetypes learned.")

    def predict_new(self, conversation_obj) -> Dict:
        if self.predator_centroids is None or self.normal_centroids is None:
            return {"is_predator": False, "confidence": 0.0, "reason": "Model not trained"}
            
        # 1. Get Vector
        vec = conversation_obj.get_weighted_embedding().reshape(1, -1)
        
        # 2. Calculate Distances to Archetypes
        # returns array of shape (1, n_clusters)
        dists_to_preds = cosine_distances(vec, self.predator_centroids)
        dists_to_norms = cosine_distances(vec, self.normal_centroids)
        
        # Find closest single archetype in each category
        min_dist_pred = np.min(dists_to_preds)
        min_dist_norm = np.min(dists_to_norms)
        
        # 3. Risk Keyword Adjustment
        # If user says "cam" or "secret", we artificially pull them closer to the predator cluster
        risk_count = self.count_risk_keywords(conversation_obj.messages)
        
        # RISK FACTOR: Each keyword reduces predator distance by 15%
        # This is a heuristic to bridge the gap between pure semantic/graph and explicit risk
        risk_modifier = max(0.1, 1.0 - (risk_count * 0.15)) 
        adjusted_pred_dist = min_dist_pred * risk_modifier
        
        # 4. Final Score (Similarity Ratio)
        # If dist to pred is 0.2 and dist to norm is 0.8, score is high.
        # Add small epsilon to avoid division by zero
        total_dist = adjusted_pred_dist + min_dist_norm + 1e-6
        predator_probability = 1 - (adjusted_pred_dist / total_dist)
        
        return {
            "is_predator": predator_probability > 0.65,
            "confidence": round(predator_probability * 100, 2),
            "risk_keywords": risk_count,
            "dist_pred": min_dist_pred,
            "dist_norm": min_dist_norm
        }

    def save_model(self, path: str):
        state = {
            'pred_centroids': self.predator_centroids,
            'norm_centroids': self.normal_centroids,
            'risk_keywords': self.risk_keywords
        }
        joblib.dump(state, path)
    
    def load_model(self, path: str):
        state = joblib.load(path)
        self.predator_centroids = state['pred_centroids']
        self.normal_centroids = state['norm_centroids']
        if 'risk_keywords' in state:
            self.risk_keywords = state['risk_keywords']
        print("Cluster Centroids loaded.")