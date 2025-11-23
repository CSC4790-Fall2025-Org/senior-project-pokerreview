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

  React.useEffect(() => {
    if (isOpen && hand && !hasInitialAnalysis) {
      getInitialAnalysis();
    }
  }, [isOpen, hand]);

  const getInitialAnalysis = async () => {
    setIsLoading(true);
    
    const handSummary = formatHandForGPT(hand);
    
    try {
      const response = await fetch('/api/ai/analyze-hand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an expert poker coach and strategist with years of experience analyzing hand histories. Provide detailed, actionable analysis focusing on:
1. Preflop strategy and position play
2. Post-flop decision making on each street
3. Bet sizing and its strategic implications
4. Range considerations for each player
5. Missed opportunities or alternative lines
6. Specific recommendations for improvement

Be specific about which decisions were good or bad and explain WHY. Reference specific actions and pot sizes.`
            },
            {
              role: 'user',
              content: `Please analyze this poker hand in detail:\n\n${handSummary}`
            }
          ],
          maxTokens: 1000
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

  const formatHandForGPT = (hand: any) => {
    const allPlayers = hand.all_players || [];
    const currentPlayer = allPlayers.find((p: any) => p.user_id);
    
    let summary = `**Hand Details**\n`;
    summary += `Table: ${hand.table_id}\n`;
    summary += `Stakes: ${hand.small_blind || 5}/${hand.big_blind || 10} (Small Blind/Big Blind)\n`;
    summary += `Final Pot: ${hand.pot_size}\n`;
    summary += `Duration: Started ${new Date(hand.started_at).toLocaleTimeString()}\n\n`;

    summary += `**Players & Starting Stacks:**\n`;
    allPlayers.forEach((player: any, idx: number) => {
      const position = idx === 0 ? ' (Button)' : idx === 1 ? ' (Small Blind)' : idx === 2 ? ' (Big Blind)' : '';
      summary += `${idx + 1}. ${player.username}${position}: Stack ${player.starting_chips || 'N/A'}`;
      if (player.hole_cards) {
        const cards = typeof player.hole_cards === 'string' ? JSON.parse(player.hole_cards) : player.hole_cards;
        summary += ` [Hole Cards: ${cards.join(', ')}]`;
      }
      summary += `\n`;
    });

    // Add board cards if they exist
    if (hand.board_flop || hand.board_turn || hand.board_river) {
      summary += `\n**Community Cards:**\n`;
      if (hand.board_flop) {
        const flop = typeof hand.board_flop === 'string' ? JSON.parse(hand.board_flop) : hand.board_flop;
        summary += `Flop: ${flop.join(', ')}\n`;
      }
      if (hand.board_turn) summary += `Turn: ${hand.board_turn}\n`;
      if (hand.board_river) summary += `River: ${hand.board_river}\n`;
    }

    // Add detailed action sequence
    if (hand.actions && hand.actions.length > 0) {
      summary += `\n**Action Sequence:**\n`;
      let currentPhase = '';
      let actionNum = 1;
      
      hand.actions.forEach((action: any) => {
        if (action.phase !== currentPhase) {
          currentPhase = action.phase;
          summary += `\n--- ${currentPhase.toUpperCase()} ---\n`;
          actionNum = 1;
        }
        const player = action.player || 'Dealer';
        summary += `${actionNum}. ${player}: ${action.action}`;
        if (action.pot) summary += ` (Pot: ${action.pot})`;
        summary += `\n`;
        actionNum++;
      });
    }

    // Add final results
    summary += `\n**Final Results:**\n`;
    allPlayers.forEach((player: any) => {
      const profit = player.profit || 0;
      const profitStr = profit > 0 ? `+${profit}` : profit < 0 ? `-${Math.abs(profit)}` : '$0';
      const winnerTag = player.is_winner ? ' 🏆 WINNER' : '';
      summary += `- ${player.username}: ${profitStr}${winnerTag}`;
      if (player.final_hand) {
        summary += ` (${player.final_hand})`;
      }
      summary += `\n`;
    });

    return summary;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Build conversation history for Claude
      const conversationMessages = [
        {
          role: 'system',
          content: `You are an expert poker coach continuing a conversation about this hand. Answer follow-up questions with specific, actionable advice.`
        },
        {
          role: 'user',
          content: `Here's the hand we're discussing:\n\n${formatHandForGPT(hand)}`
        },
        {
          role: 'assistant',
          content: messages[0].content
        }
      ];

      // Add subsequent messages
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
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 shadow-2xl z-[60] flex flex-col border-l border-gray-700">
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