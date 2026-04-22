from flask import Blueprint, request, jsonify
import os
import google.generativeai as genai  # FIX: Correct SDK import

chatbot_bp = Blueprint('chatbot', __name__)

# Configure Gemini API
API_KEY = os.getenv('GEMINI_API_KEY')
if API_KEY:
    genai.configure(api_key=API_KEY)

# Menu data for context
MENU_CONTEXT = """
You are a friendly boba tea shop assistant. Our menu includes:

MILK TEAS: Classic Milk Tea, Jasmine Green Milk Tea, Taro Milk Tea, Thai Milk Tea, Honey Milk Tea, Brown Sugar Milk Tea, Strawberry Milk Tea, Wintermelon Milk Tea, Coffee Milk Tea, Coconut Milk Tea, Chocolate Milk Tea, Oreo Milk Tea, March Milk Tea

FRUIT TEAS: Mango Green Tea, Passion Fruit Tea, Lychee Green Tea, Peach Oolong Tea, Wintermelon Tea, Honey Lemon Tea, Mint Tea

SPECIALTIES: Matcha Latte, Jayden Special, Fresh Milk

TOPPINGS: Boba Pearls, Lychee Jelly

You should:
1. Help customers find the perfect drink based on their preferences
2. Provide drink recommendations with brief descriptions
3. Be enthusiastic and friendly
4. Mention toppings when appropriate
5. For questions about pricing and hours, politely direct them to ask staff
6. Keep responses EXTREMELY short (1 to 2 sentences maximum). Be punchy and conversational. Do not list out the whole menu unless explicitly asked.
7. Use emojis occasionally to be friendly (🧋 🥛 🍊 ✨)
"""

def get_gemini_response(user_message, conversation_history):
    """Get response from Gemini API"""
    try:
        if not API_KEY:
            return "Sorry, I'm not configured yet. Please set up the Gemini API key."
        
        # FIX: Ensure you are using a valid, standard model name
        model = genai.GenerativeModel('gemini-3-flash-preview')
        
        # Prepare conversation history for context
        messages = []
        for msg in conversation_history[-5:]:  # Keep last 5 messages for context
            # FIX: Use .get() to prevent KeyErrors if data is missing
            sender = msg.get('sender', 'user')
            text = msg.get('text', '')
            
            if sender == 'user':
                messages.append(f"Customer: {text}")
            else:
                messages.append(f"Assistant: {text}")
        
        # Build the full prompt
        system_prompt = MENU_CONTEXT
        conversation_text = "\n".join(messages)
        
        full_prompt = f"""{system_prompt}\n\nPrevious conversation:\n{conversation_text}\n\nCustomer: {user_message}\n\nRespond as the boba shop assistant:"""
        
        response = model.generate_content(full_prompt)
        
        if response.text:
            return response.text
        else:
            return "I'm having trouble understanding. Can you ask that again?"
    
    except Exception as e:
        print(f"Gemini API error: {str(e)}")
        return "Sorry, I'm having trouble connecting to my AI brain right now. Please try again in a moment!"


@chatbot_bp.route('/chat', methods=['POST'])
def chat():
    """Handle chat messages from the frontend"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        # FIX: Moved this logic OUT of the except block and fixed the function call
        conversation_history = data.get('history', [])
        
        # Generate response using Gemini
        bot_response = get_gemini_response(user_message, conversation_history)
        
        return jsonify({'response': bot_response}), 200
    
    except Exception as e:
        print(f"Chatbot error: {str(e)}")
        return jsonify({'error': 'An error occurred'}), 500