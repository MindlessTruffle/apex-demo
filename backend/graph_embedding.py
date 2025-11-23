import numpy as np
import cohere
from typing import List, Dict, Tuple
import os
from sklearn.metrics.pairwise import cosine_similarity
from parser import ConversationParser
import networkx as nx

class MessageEmbedder:
    """Embeds messages into vector representations using Cohere."""
    
    def __init__(self, api_key: str, model: str = 'embed-v4.0'):
        self.client = cohere.ClientV2(api_key=api_key)
        self.model = model
    
    def embed_messages(self, messages: List[Dict]) -> np.ndarray:
        texts = [msg['text'] for msg in messages]
        texts = [text if text.strip() else " " for text in texts]
        
        text_inputs = []
        template = {"content": [{"type": "text"}]}
        for msg in texts:
            ti = template.copy()
            ti["content"][0]["text"] = msg
            text_inputs.append(ti)
            
        chunk_size = 96
        embeddings = []
        
        for i in range(0, len(text_inputs), chunk_size):
            chunk = text_inputs[i:i + chunk_size]
            try:
                response = self.client.embed(
                    inputs=chunk,
                    model="embed-v4.0",
                    input_type="classification",
                    embedding_types=["float"],
                )
                embeddings.extend(response.embeddings.float)
            except Exception as e:
                print(f"Error embedding chunk: {e}")
                embeddings.extend([np.zeros(1536) for _ in chunk])
        
        return np.array(embeddings)

class Conversation:
    def __init__(self, conversation_data: Dict, conversation_embeddings: np.ndarray):
        self.data = conversation_data
        self.embeddings = conversation_embeddings
        self.messages = conversation_data['messages']
    
        self.message_times = []
        for msg in self.messages:
            self.message_times.append(self.parse_time(msg['time']))
        
        self.graph = {i: [] for i in range(len(self.messages))}
        self.cos_sim_matrix = cosine_similarity(self.embeddings)
        self._cached_weighted_vector = None
     
    @staticmethod
    def parse_time(time: str) -> float:
        try:
            parts = list(map(int, time.split(':')))
            if len(parts) == 2:
                return parts[0] * 3600 + parts[1] * 60
            elif len(parts) == 3:
                return parts[0] * 3600 + parts[1] * 60 + parts[2]
        except:
            pass
        return 0.0

    def same_speaker(self, idx_i: int, idx_j: int) -> bool:
        return self.messages[idx_i]['author'] == self.messages[idx_j]['author']

    def detect_reply(self, idx_i: int, idx_j: int) -> bool:
        if idx_j != idx_i + 1:
            return False
        if self.messages[idx_i]['author'] == self.messages[idx_j]['author']:
            return False
        return True

    def get_edge_list(self) -> List[Tuple[int, int, float, Dict]]:
        edges = []
        seen = set()
        for i in range(len(self.messages)):
            for j, weight, attributes in self.graph[i]:
                edge_key = tuple(sorted([i, j]))
                if edge_key not in seen:
                    edges.append((i, j, weight, attributes))
                    seen.add(edge_key)
        return edges
    
    def to_networkx(self):
        G = nx.Graph()
        for i, msg in enumerate(self.messages):
            G.add_node(i, author=msg['author'], time=msg['time'])
        for i, j, weight, attrs in self.get_edge_list():
            G.add_edge(i, j, **attrs)
        return G

    def get_weighted_embedding(self) -> np.ndarray:
        """
        Returns a single 1536-d vector representing the conversation.
        Uses Graph PageRank to weight 'important' messages higher.
        """
        # FIX: Handle unpickled objects that miss this attribute
        if not hasattr(self, '_cached_weighted_vector'):
            self._cached_weighted_vector = None
            
        if self._cached_weighted_vector is not None:
            return self._cached_weighted_vector
            
        G = self.to_networkx()
        
        # If graph is empty or failed, return simple mean
        if G is None or G.number_of_nodes() == 0:
            self._cached_weighted_vector = np.mean(self.embeddings, axis=0)
            return self._cached_weighted_vector
            
        # Calculate PageRank to find "Central" messages
        try:
            # Use weight if available, else unweighted
            centrality = nx.pagerank(G, weight='weight', alpha=0.85)
        except:
            # Fallback for disconnected graphs or errors
            centrality = {i: 1.0/G.number_of_nodes() for i in G.nodes()}
            
        weighted_sum = np.zeros(self.embeddings.shape[1])
        total_weight = 0.0
        
        for i, score in centrality.items():
            # Multiply embedding by its structural importance
            weighted_sum += self.embeddings[i] * score
            total_weight += score
            
        # Normalize
        if total_weight > 0:
            self._cached_weighted_vector = weighted_sum / total_weight
        else:
            self._cached_weighted_vector = np.mean(self.embeddings, axis=0)
            
        return self._cached_weighted_vector
    
    def update_graph(self, graph: Dict[int, List[Tuple[int, float, Dict]]]):
        self.graph = graph
        self._cached_weighted_vector = None # Invalidate cache
    
    def get_messages(self): return self.messages
    def get_embeddings(self): return self.embeddings
    def get_similarity_matrix(self): return self.cos_sim_matrix

class GraphBuilder:
    def __init__(self, 
                 min_semantic_score: float = 0.55,
                 half_life_seconds: float = 300.0, 
                 max_edges_per_node: int = 3,
                 w_reply: float = 0.4,
                 w_speaker: float = 0.1):
        
        self.min_semantic_score = min_semantic_score
        self.half_life_seconds = half_life_seconds
        self.max_edges_per_node = max_edges_per_node
        self.w_reply = w_reply
        self.w_speaker = w_speaker
        
    def build_graph(self, conversation: Conversation) -> Dict:
        n_messages = len(conversation.get_messages())
        times = conversation.message_times
        temp_graph = {i: [] for i in range(n_messages)}
        
        for i in range(n_messages):
            potential_edges = []
            for j in range(i + 1, n_messages):
                weight, attributes = self.calculate_edge_weight(conversation, i, j, times)
                if weight > 0.2: 
                    potential_edges.append((j, weight, attributes))
            
            potential_edges.sort(key=lambda x: x[1], reverse=True)
            top_edges = potential_edges[:self.max_edges_per_node]
            
            for j, weight, attributes in top_edges:
                temp_graph[i].append((j, weight, attributes))
                temp_graph[j].append((i, weight, attributes))
                    
        conversation.update_graph(temp_graph)
        
    def calculate_edge_weight(self, conversation: Conversation, idx_i: int, idx_j: int, times: List[float]) -> Tuple[float, Dict]:
        sim_text = conversation.get_similarity_matrix()[idx_i, idx_j]
        delta_seconds = abs(times[idx_j] - times[idx_i])
        decay = 0.5 ** (delta_seconds / self.half_life_seconds)
        base_score = sim_text * decay
        
        bonus = 0.0
        if conversation.detect_reply(idx_i, idx_j): bonus += self.w_reply
        if conversation.same_speaker(idx_i, idx_j): bonus += self.w_speaker
            
        total_weight = base_score + bonus
        attrs = {'weight': total_weight, 'is_reply': conversation.detect_reply(idx_i, idx_j)}
        return total_weight, attrs