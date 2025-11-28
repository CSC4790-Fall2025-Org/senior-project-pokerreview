import React, { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';

interface AIHandAnalysisProps {
  hand: any;
  isOpen: boolean;
  onClose: () => void;
}

export const AIHandAnalysis: React.FC<AIHandAnalysisProps> = ({ hand, isOpen, onClose }) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialAnalysis, setHasInitialAnalysis] = useState(false);
  const [currentHandId, setCurrentHandId] = useState<string | null>(null);

  React.useEffect(() => {
    const handId = hand?.id || hand?.hand_id;
    
    // If hand changed, reset everything
    if (handId && handId !== currentHandId) {
      setCurrentHandId(handId);
      setMessages([]);
      setHasInitialAnalysis(false);
      setInput('');
    }
  }, [hand]);

  React.useEffect(() => {
    if (isOpen && hand && !hasInitialAnalysis) {
      getInitialAnalysis();
    }
  }, [isOpen, hand, hasInitialAnalysis]);

  const getInitialAnalysis = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/ai/analyze-hand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hand: hand, // Send the full hand object
          maxTokens: 1000
          // Don't send messages array on initial analysis
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get analysis');
      }

      setMessages([{ role: 'assistant', content: data.content }]);
      setHasInitialAnalysis(true);
    } catch (error) {
      console.error('Error getting analysis:', error);
      setMessages([{ 
        role: 'assistant', 
        content: 'Sorry, I encountered an error analyzing this hand. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Build conversation history
      const conversationMessages = [
        {
          role: 'system',
          content: `You are an expert poker coach continuing a conversation about this hand. Answer follow-up questions with specific, actionable advice.`
        },
        {
          role: 'assistant',
          content: messages[0].content
        }
      ];

      // Add all messages after the initial analysis
      for (let i = 1; i < messages.length; i++) {
        conversationMessages.push({
          role: messages[i].role,
          content: messages[i].content
        });
      }

      // Add new user message
      conversationMessages.push({
        role: 'user',
        content: userMessage
      });

      const response = await fetch('/api/ai/analyze-hand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: conversationMessages,
          hand: hand, // Include hand for context
          maxTokens: 500
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[550px] bg-gray-900 shadow-2xl z-[60] flex flex-col border-l border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-bold text-white">AI Hand Analysis</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-lg p-3">
              <Loader2 className="animate-spin text-blue-400" size={20} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about this hand..."
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};