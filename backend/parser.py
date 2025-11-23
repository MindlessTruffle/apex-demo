import xml.etree.ElementTree as ET
from typing import List, Dict, Tuple, Set
import html

class ConversationParser:
    """Parser for XML conversation files."""
    
    def __init__(self, xml_file_path: str):
        """Initialize parser with XML file path."""
        self.xml_file_path = xml_file_path
        self.tree = ET.parse(xml_file_path)
        self.root = self.tree.getroot()
    
    def parse_conversation(self, conversation_id: str = None) -> Dict:
        """
        Parse a single conversation from the XML file.
        
        Args:
            conversation_id: Optional ID of specific conversation to parse.
                           If None, parses the first conversation.
        
        Returns:
            Dictionary containing:
                - conversation_id: ID of the conversation
                - user_ids: List of unique user IDs (2 users)
                - messages: List of message dictionaries
                - times: List of message timestamps
                - concatenated_text: Full conversation as single string
        """
        if conversation_id:
            conv = self.root.find(f".//conversation[@id='{conversation_id}']")
        else:
            conv = self.root.find('.//conversation')
        
        if conv is None:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        conv_id = conv.get('id')
        user_ids_set: Set[str] = set()
        messages: List[Dict] = []
        text_parts: List[str] = []
        
        for msg in conv.findall('message'):
            author = msg.find('author').text.strip()
            time = msg.find('time').text.strip()
            text = msg.find('text').text or ""
            line = msg.get('line')
            
            user_ids_set.add(author)
            
            message_dict = {
                'line': line,
                'author': author,
                'time': time,
                'text': text
            }
            messages.append(message_dict)
            text_parts.append(text)
        
        return {
            'conversation_id': conv_id,
            'user_ids': list(user_ids_set),
            'messages': messages,
            'concatenated_text': ' '.join(text_parts)
        }
    
    def parse_all_conversations(self) -> List[Dict]:
        """
        Parse all conversations in the XML file.
        
        Returns:
            List of dictionaries, one for each conversation.
        """
        conversations = []
        for conv in self.root.findall('.//conversation'):
            conv_id = conv.get('id')
            parsed = self.parse_conversation(conv_id)
            conversations.append(parsed)
        
        return conversations
    
    def get_conversation_ids(self) -> List[str]:
        """Get list of all conversation IDs in the file."""
        return [conv.get('id') for conv in self.root.findall('.//conversation')]

if __name__ == "__main__":
    parser = ConversationParser(r"c:\Users\Tristan\Downloads\pan12-sexual-predator-identification-test-corpus-2012-05-21\pan12-sexual-predator-identification-test-corpus-2012-05-17.xml")
    # print("?")
    all_convs = parser.parse_conversation("affc2df0951b733d14ba92d19d9b7695")
    for messages in all_convs['messages']:
        print(messages["time"])
    # print(all_convs)
    # for conv in all_convs:
    #     print(f"Conversation ID: {conv['conversation_id']}")
    #     print(f"User IDs: {conv['user_ids']}")
    #     print(f"Number of messages: {len(conv['messages'])}")
    #     print(f"Concatenated text (first 100 chars): {conv['concatenated_text'][:100]}")
    #     print("-" * 40)