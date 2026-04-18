'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Send, User, MessageCircle } from 'lucide-react';

// --- Types ---
interface Message {
  id: string;
  sender: 'user' | 'other';
  content: string;
  timestamp: string;
}

// --- Components ---

// 1. Message Bubble Component
const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex flex-col max-w-xs sm:max-w-md ${isUser ? 'items-end' : 'items-start'}`}>

        {/* Avatar/Icon (Optional) */}
        {!isUser && <div className="text-xl mb-1">{<MessageCircle className="text-indigo-500" size={24} />}</div>}

        {/* The Bubble */}
        <div className={`p-3 rounded-xl shadow-md text-white ${
            isUser 
            ? 'bg-indigo-600 rounded-br-none'
            : 'bg-gray-700 rounded-tl-none'
        } flex items-end`}>
          <p className="text-sm">{message.content}</p>
        </div>

        {/* Timestamp */}
        <span className={`text-xs mt-1 ${isUser ? 'text-right text-gray-300' : 'text-left text-gray-400'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

// 2. Main Chat Page Component
export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch messages on component mount
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch('/api/messages');
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  // Handles sending a message
  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '') return;

    try {
      // Send message to API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: 'user',
          content: inputValue.trim(),
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessages((prev) => [...prev, newMessage]);
        setInputValue('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [inputValue]);

  return (      
    <div className="flex flex-col h-screen bg-gray-50">
        {/* Chat Header */}
        <header className="p-4 border-b bg-white shadow-sm flex items-center sticky top-0 z-10">
            <div className="flex items-center space-x-3">
                {/* Profile Icon */}
                <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xl">
                    <User className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-bold text-gray-800">AI Assistant</h1>
            </div>
            <p className="text-sm text-gray-500 ml-8">Online | {loading ? 'Loading...' : `${messages.length} messages`}</p>
        </header>

        {/* Message Area (Scrollable) */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <div className="pt-4">
                {messages.length === 0 && !loading && (
                  <p className="text-center text-gray-400">No messages yet. Start the conversation!</p>
                )}
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
            </div>
        </main>

        {/* Input Form */}
        <div className="sticky bottom-0 bg-white p-4 border-t shadow-lg">
            <form onSubmit={handleSend} className="flex items-center space-x-3">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your message here..."
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150 text-gray-700"
                    aria-label="Message input"
                />
                <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className={`p-3 rounded-full transition duration-200 ${inputValue.trim() ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300' : 'bg-gray-300 cursor-not-allowed'}`}
                    aria-label="Send message"
                >
                    <Send className="w-6 h-6 text-white" />
                </button>
            </form>
        </div>
    </div>
  );
}
                  