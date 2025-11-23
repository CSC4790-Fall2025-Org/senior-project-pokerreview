// server/routes/ai.js
const express = require('express');
const router = express.Router();

router.post('/analyze-hand', async (req, res) => {
  try {
    const { messages, maxTokens = 1000 } = req.body;

    console.log('Calling OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
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