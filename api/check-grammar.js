export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text, language } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key missing' });

    const languageName = language === 'arabic' ? 'Arabic' : 'English';

    const systemPrompt = `
You are a professional ${languageName} grammar corrector.

You MUST return ONLY a valid JSON object:
{
  "correctedText": "text",
  "overallQuality": 1-10,
  "errors": [
    { 
      "type": "grammar | spelling | punctuation",
      "original": "text",
      "correction": "text",
      "explanation": "why it was wrong"
    }
  ],
  "suggestions": ["advice 1", "advice 2"]
}

RULES:
- NO markdown
- NO code blocks
- NO natural language outside JSON
- NO comments
- Only the JSON object.
`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.2,
        max_tokens: 1200
      })
    });

    const data = await response.json();

    let content = data.choices[0].message.content;

    // remove markdown if the model adds it
    content = content.replace(/```json|```/g, '').trim();

    const parsed = JSON.parse(content);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
