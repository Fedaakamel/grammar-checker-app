import fetch from "node-fetch";

export async function handler(event) {
    try {
        const { languageName, inputText } = JSON.parse(event.body);

        const prompt = `
You are an expert ${languageName} grammar checker.

Return ONLY JSON with:
- correctedText
- suggestions (array of strings)

Text:
${inputText}
`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: "llama3-70b-8192",
                messages: [{ role: "user", content: prompt }]
            })
        });

        const json = await response.json();
        const answer = json.choices[0].message.content;
        const parsed = JSON.parse(answer);

        return {
            statusCode: 200,
            body: JSON.stringify(parsed)
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
}
