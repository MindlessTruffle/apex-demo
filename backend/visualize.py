import os
import time
import numpy as np
import matplotlib.pyplot as plt
import networkx as nx
from sklearn.decomposition import PCA
from dotenv import load_dotenv

# Import your existing modules

from feature_extraction import PredatorDetector

from graph_embedding import MessageEmbedder, Conversation, GraphBuilder

# Load environment variables
load_dotenv()
API_KEY = os.getenv("COHERE_API_KEY")

class ModelVisualizer:
    def __init__(self, model_path=r"apex-demo\backend\mini_predator_model.pt"):
        print("Initializing System...")
        
        # 1. Load the "Brain" (The Detector)
        # Using dummy.txt as placeholder for ground truth file, handled safely by class
        self.detector = PredatorDetector("dummy.txt") 
        if os.path.exists(model_path):
            self.detector.load_model(model_path)
        else:
            print(f"Warning: {model_path} not found. Visualization will be limited.")

        # 2. Setup Embedder and Graph Builder
        if not API_KEY:
            print("WARNING: No API Key found. Using Mock Embedder (Random Noise).")
            print("   -> For the real trajectory effect, you need a valid Cohere API Key.")
            self.embedder = self.MockEmbedder()
        else:
            self.embedder = MessageEmbedder(API_KEY)
            
        self.graph_builder = GraphBuilder()
        
        # 3. Trajectory History Storage
        self.history_coords = []

        # 4. Prepare Visualization (PCA)
        self.pca = PCA(n_components=2)
        
        # Fit PCA on the model's learned centroids to define the "Map"
        if self.detector.predator_centroids is not None:
            all_centroids = np.vstack([
                self.detector.predator_centroids, 
                self.detector.normal_centroids
            ])
            self.pca.fit(all_centroids)
            
            # Pre-calculate map markers
            self.pred_coords = self.pca.transform(self.detector.predator_centroids)
            self.norm_coords = self.pca.transform(self.detector.normal_centroids)
        
        # Setup Plotting Window
        plt.ion() # Interactive mode on
        self.fig, (self.ax_scatter, self.ax_graph) = plt.subplots(1, 2, figsize=(16, 7))

    class MockEmbedder:
        """Helper to allow code to run without API key (returns random noise)"""
        def embed_messages(self, messages):
            return np.random.rand(len(messages), 1536)

    def update_plots(self, conversation_obj, result_dict):
        """Updates the live dashboard visuals with Trajectory Trails."""
        self.ax_scatter.clear()
        self.ax_graph.clear()
        
        # --- PLOT 1: THE RADAR (Semantic Space) ---
        if hasattr(self, 'pred_coords'):
            # 1. Plot Background Archetypes (The Map)
            self.ax_scatter.scatter(self.pred_coords[:, 0], self.pred_coords[:, 1], 
                                   c='red', marker='x', s=100, alpha=0.4, label='Predator Zones')
            self.ax_scatter.scatter(self.norm_coords[:, 0], self.norm_coords[:, 1], 
                                   c='green', marker='o', s=100, alpha=0.4, label='Normal Zones')
            
            # 2. Calculate Current Position
            current_vec = conversation_obj.get_weighted_embedding().reshape(1, -1)
            current_coord = self.pca.transform(current_vec)[0] # Get x,y pair
            
            # 3. Store in History for the "Trail"
            self.history_coords.append(current_coord)
            
            # 4. Draw the Trajectory Trail (The Snake)
            history_array = np.array(self.history_coords)
            if len(history_array) > 1:
                # Plot the path line
                self.ax_scatter.plot(history_array[:, 0], history_array[:, 1], 
                                    c='gray', linestyle='--', alpha=0.5, linewidth=2, label='Chat Trajectory')
                # Plot previous points as small dots
                self.ax_scatter.scatter(history_array[:-1, 0], history_array[:-1, 1], 
                                       c='gray', s=30, alpha=0.5)

            # 5. Plot CURRENT Star (Head of the snake)
            # Color turns red if flagged
            curr_color = 'red' if result_dict['is_predator'] else 'blue'
            marker_type = '*' if result_dict['is_predator'] else 'o'
            
            self.ax_scatter.scatter(current_coord[0], current_coord[1], 
                                   c=curr_color, marker=marker_type, s=400, edgecolors='black', label='Current State')
            
            # 6. Keywords Label
            if result_dict['risk_keywords'] > 0:
                self.ax_scatter.text(current_coord[0], current_coord[1] + 0.08, 
                                     f"⚠️ KEYWORDS: {result_dict['risk_keywords']}", 
                                     color='red', fontweight='bold', ha='center')

            self.ax_scatter.set_title("Semantic Trajectory Analysis (PCA)")
            self.ax_scatter.legend(loc='lower right')
            self.ax_scatter.grid(True, alpha=0.3)
            self.ax_scatter.set_xlabel("Principal Component 1")
            self.ax_scatter.set_ylabel("Principal Component 2")

        # --- PLOT 2: THE NETWORK (Connectivity) ---
        G = conversation_obj.to_networkx()
        if G.number_of_nodes() > 0:
            # Use spring layout but fix seed for stability
            pos = nx.spring_layout(G, seed=42)
            
            colors = []
            sizes = []
            for node in G.nodes():
                author = G.nodes[node]['author']
                if 'Suspicious' in author: 
                    colors.append('#ff9999') # Light red
                    sizes.append(600)
                elif 'Teen' in author: 
                    colors.append('#99ff99') # Light green
                    sizes.append(600)
                else: 
                    colors.append('lightblue')
                    sizes.append(400)
                
            nx.draw_networkx_nodes(G, pos, ax=self.ax_graph, node_color=colors, node_size=sizes, edgecolors='gray')
            
            if G.number_of_edges() > 0:
                weights = [G[u][v]['weight'] * 4 for u,v in G.edges()]
                nx.draw_networkx_edges(G, pos, ax=self.ax_graph, width=weights, alpha=0.6)
            
            # Draw labels (Author names or indices)
            # Shortening labels for clarity
            labels = {n: f"{G.nodes[n]['author'][:4]}.." for n in G.nodes()}
            nx.draw_networkx_labels(G, pos, labels, ax=self.ax_graph, font_size=8)
            
        self.ax_graph.set_title("Interaction Graph")

        # Refresh
        plt.tight_layout()
        plt.draw()
        plt.pause(2.0) # Pause to let the viewer absorb the frame

    def run_simulation(self, chat_data):
        """Simulates the chat message by message to show the arc."""
        print("\nStarting Grooming Arc Simulation...")
        print("Close the plot window to stop.")
        
        current_messages = []
        
        for i, msg in enumerate(chat_data):
            print(f"\n--- Message {i+1}/{len(chat_data)} ---")
            print(f"{msg['author']}: {msg['text']}")
            
            # 1. Add message to current history
            current_messages.append(msg)
            
            # 2. Re-embed context (simulating real-time processing)
            embeddings = self.embedder.embed_messages(current_messages)
            
            # 3. Re-build Graph Context
            conv_data = {
                'conversation_id': 'SIMULATION',
                'user_ids': list(set(m['author'] for m in current_messages)),
                'messages': current_messages
            }
            conversation = Conversation(conv_data, embeddings)
            self.graph_builder.build_graph(conversation)
            
            # 4. Predict Risk
            result = self.detector.predict_new(conversation)
            
            # 5. Report
            print(f"   [Risk Score]: {result['confidence']}%")
            if result['is_predator']:
                print("   [ALERT]: PREDATORY BEHAVIOR DETECTED")
            
            # 6. Update Visuals
            self.update_plots(conversation, result)

        print("\nSimulation Complete. Final State Displayed.")
        plt.show(block=True)

if __name__ == "__main__":
    # The Optimized "Grooming Arc" Dataset
    # Designed to move from Green Zone -> Red Zone
    optimized_chat = [
        # PHASE 1: NORMAL / RAPPORT BUILDING (Green Zone)
        {"author": "SuspiciousPerson", "time": "20:00", "text": "Hi there! I saw you in the music group chat."},
        {"author": "TeenUser", "time": "20:01", "text": "Oh hey. Yeah I love music."},
        {"author": "SuspiciousPerson", "time": "20:02", "text": "Me too. What bands are you listening to lately?"},
        {"author": "TeenUser", "time": "20:05", "text": "Mostly Taylor Swift and some indie stuff."},
        {"author": "SuspiciousPerson", "time": "20:06", "text": "Nice taste! I play guitar myself."},
        
        # PHASE 2: BOUNDARY TESTING (Drifting)
        {"author": "SuspiciousPerson", "time": "20:10", "text": "So, are your parents home right now?"},
        {"author": "TeenUser", "time": "20:11", "text": "No, they are working late. Just me."},
        {"author": "SuspiciousPerson", "time": "20:12", "text": "Must be nice to have the place to yourself."},
        
        # PHASE 3: ESCALATION (Accelerating to Red)
        {"author": "SuspiciousPerson", "time": "20:13", "text": "You seem really mature for your age."},
        {"author": "TeenUser", "time": "20:14", "text": "Thanks, people say that a lot."},
        {"author": "SuspiciousPerson", "time": "20:18", "text": "I hate this app. Do you have Kik or a number?"},
        {"author": "TeenUser", "time": "20:19", "text": "I have Kik."},
        
        # PHASE 4: HIGH RISK (Deep Red Zone)
        {"author": "SuspiciousPerson", "time": "20:20", "text": "Add me. We can go somewhere more private."},
        {"author": "SuspiciousPerson", "time": "20:22", "text": "I bet you look cute today. Send me a pic?"},
        {"author": "TeenUser", "time": "20:23", "text": "Idk if I should..."},
        {"author": "SuspiciousPerson", "time": "20:24", "text": "Don't be shy. It will be our secret."},
        {"author": "SuspiciousPerson", "time": "20:25", "text": "Turn on your cam. I want to see you."},
        {"author": "SuspiciousPerson", "time": "20:27", "text": "Come on. I want to see you naked."} 
    ]

    viz = ModelVisualizer()
    viz.run_simulation(optimized_chat)
