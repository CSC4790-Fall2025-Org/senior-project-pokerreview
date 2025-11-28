const express = require('express');
const router = express.Router();
const { 
  POKER_ANALYSIS_SYSTEM_PROMPT, 
  POKER_FOLLOWUP_PROMPT,
  formatHandForAnalysis 
} = require('../prompts/pokerAnalysisPrompt');

router.post('/analyze-hand', async (req, res) => {
  try {
    const { messages, maxTokens = 1000, hand } = req.body;

    console.log('Calling OpenAI API...');
    
    // Determine if this is initial analysis or follow-up
    let processedMessages;
    
    if (hand && (!messages || messages.length === 0)) {
      // Initial analysis - format hand data
      processedMessages = [
        {
          role: 'system',
          content: POKER_ANALYSIS_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Please analyze this poker hand in detail:\n\n${formatHandForAnalysis(hand)}`
        }
      ];
    } else if (messages && messages.length > 0) {
      // Follow-up conversation - use provided messages
      processedMessages = messages;
    } else {
      // Fallback - shouldn't happen but handle it
      return res.status(400).json({
        success: false,
        error: 'Either hand data or messages must be provided'
      });
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: processedMessages,
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      return res.status(response.status).json({ 
        success: false,
        error: data.error?.message || 'AI service error' 
      });
    }

    console.log('OpenAI response received successfully');
    
    res.json({ 
      success: true, 
      content: data.choices[0].message.content 
    });
  } catch (error) {
    console.error('Error calling AI service:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze hand' 
    });
  }
});

module.exports = router;