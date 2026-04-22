import { useState, useRef, useEffect } from "react";
import "./Chatbot.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Hey! 👋 I'm your boba shop AI assistant. Ask me anything about our drinks, get recommendations, or chat about what you're in the mood for!",
            sender: "bot",
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        // Add user message
        const userMessage = {
            id: messages.length + 1,
            text: inputValue,
            sender: "user",
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/api/chatbot/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: inputValue,
                    history: messages,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                const botMessage = {
                    id: messages.length + 2,
                    text: data.response,
                    sender: "bot",
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, botMessage]);
            } else {
                const errorMessage = {
                    id: messages.length + 2,
                    text: "Sorry, I encountered an error. Please try again.",
                    sender: "bot",
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error("Chat error:", error);
            const errorMessage = {
                id: messages.length + 2,
                text: "Sorry, I'm having trouble connecting. Please try again later.",
                sender: "bot",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chatbot-container">
            {/* Floating Button */}
            <button
                className="chatbot-button"
                onClick={() => setIsOpen(!isOpen)}
                title="Chat with us"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <h3>Boba Assistant</h3>
                        <button
                            className="close-button"
                            onClick={() => setIsOpen(false)}
                            title="Close chat"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="chatbot-messages">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`message ${message.sender}`}
                            >
                                <div className="message-content">
                                    {message.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="message bot">
                                <div className="message-content typing">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form
                        onSubmit={handleSendMessage}
                        className="chatbot-input-form"
                    >
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask for recommendations..."
                            disabled={loading}
                            className="chatbot-input"
                        />
                        <button
                            type="submit"
                            disabled={loading || !inputValue.trim()}
                            className="send-button"
                        >
                            Send
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
