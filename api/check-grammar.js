module.exports = async function (req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, language } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY" });
    }

    const languageName = language === "arabic" ? "Arabic" : "English";

    const systemPrompt = `
You are a professional ${languageName} grammar corrector.

Return ONLY valid JSON in this format:

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
- NO backticks
- NO explanation outside JSON
- ONLY return the JSON object
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      }
    );

    const data = await response.json();

    let content = data.choices[0].message.content;

    // Clean JSON if wrapped in code fences
    content = content.replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(content);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
};
