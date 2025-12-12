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
You are an advanced ${languageName} grammar corrector and language improver.

Analyze the user's text and return ONLY valid JSON in this format:

{
  "correctedText": "the fully corrected and improved version of the user's full text",
  "overallQuality": 1-10,
  "errors": [
    {
      "type": "grammar | spelling | punctuation | style",
      "original": "incorrect part",
      "correction": "correct version",
      "explanation": "why this change was needed"
    }
  ],
  "suggestions": [
    "suggestion 1",
    "suggestion 2"
  ]
}

Rules:
- DO NOT output markdown.
- DO NOT output backticks.
- DO NOT output anything outside the JSON.
- "correctedText" must be the FULL corrected sentence, not only word corrections.
- Always include suggestions and a quality score.
`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    const data = await response.json();

    let content = data.choices[0].message.content;
    content = content.replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(content);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message
    });
  }
};
