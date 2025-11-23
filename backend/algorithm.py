# Tristan Put Code Here
# then we turn in into functions w returns
from feature_extraction import *
from graph_embedding import *
from parser import *
import os
from dotenv import load_dotenv 

load_dotenv
API_KEY = os.getenv("COHERE_API_KEY")

def runInference(chat_data):
    """
    Runs the algorithm

    Args:
        chat_data (Dict): 
        This is formatted in a really specific way. Example:
            mock_conv_data = {
            'conversation_id': 'MANUAL_TEST',
            'user_ids': list(set(m['author'] for m in chat_data)),
            'messages': chat_data
        }
        where chat_data is like:
        suspicious_chat = [
            {"author": "SuspiciousPerson", "time": "23:30", "text": "Hey there, how are you?"},
            {"author": "TeenUser", "time": "23:32", "text": "Who is this?"},
            {"author": "SuspiciousPerson", "time": "23:33", "text": "Just a friend. You look beautiful in your profile pic."},
            {"author": "TeenUser", "time": "23:34", "text": "Thanks, I guess?"}, 
            {"author": "SuspiciousPerson", "time": "23:35", "text": "I think you're so cute. Wanna chat more?"},
            {"author": "TeenUser", "time": "23:37", "text": "Not sure... I'm kinda busy."},
            {"author": "SuspiciousPerson", "time": "23:40", "text": "Don’t tell anyone we are talking, okay? I don’t want others to know."},
            {"author": "TeenUser", "time": "23:42", "text": "Hmm... okay?"}
        ]

    Returns:
        Dict
        Keys:
        is_predator: bool
        confidence: float
        risk_keywords: int
        dist_pred: float
        dist_norm float
    """
    model_path = r".\mini_predator_model.pt"
    detector = PredatorDetector("dummy.txt")
    detector.load_model(model_path)
    embedder = MessageEmbedder(API_KEY)
    graph_builder = GraphBuilder()
    
    # Accept either a raw list of messages or a conversation dict with a 'messages' key.
    if isinstance(chat_data, dict):
        conversation_dict = chat_data
        messages = conversation_dict.get('messages', [])
    else:
        # assume chat_data is a list of message dicts
        messages = chat_data
        conversation_dict = {
            'conversation_id': 'MANUAL_TEST',
            'user_ids': list(set(m.get('author') for m in messages if isinstance(m, dict))),
            'messages': messages
        }

    embeddings = embedder.embed_messages(messages)
    conversation = Conversation(conversation_dict, embeddings)
    graph_builder.build_graph(conversation)
    
    result = detector.predict_new(conversation)

    print("Inference Result:", result)
    
    return result
    



