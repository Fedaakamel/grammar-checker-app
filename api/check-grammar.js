exports.handler = async function(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const { text, language } = JSON.parse(event.body);

    if (!text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Text is required' })
      };
    }

    // Get API key from environment variable
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.error('GROQ_API_KEY not found in environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    const languageName = language === 'english' ? 'English' : 'Arabic';

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // Fast and accurate model
        messages: [
          {
            role: 'system',
            content: `You are an expert ${languageName} grammar checker and language improver. Analyze text and respond ONLY with valid JSON (no markdown, no preamble) in this exact format:
{
  "correctedText": "the fully corrected version",
  "errors": [{"type": "error type", "original": "wrong text", "correction": "fixed text", "explanation": "why it was wrong"}],
  "overallQuality": 8,
  "suggestions": ["suggestion 1", "suggestion 2"]
}`
          },
          {
            role: 'user',
            content: `Check this ${languageName} text:\n\n${text}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API Error:', errorData);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to check grammar',
          details: errorData 
        })
      };
    }

    const data = await response.json();
    
    // Extract the AI's response
    const aiResponse = data.choices[0].message.content;
    
    // Clean and parse JSON (remove markdown if present)
    const cleanJson = aiResponse.replace(/```json\n?|```\n?/g, '').trim();
    const result = JSON.parse(cleanJson);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};
