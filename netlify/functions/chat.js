exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Use POST" }),
      };
    }

    // Make sure the API key exists
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY in Netlify environment variables" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const question = (body.question || "").trim();
    const platform = body.platform || "bedrock";

    if (!question) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing question" }),
      };
    }

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You are a Bedrock-first Minecraft guide for a group world of 7. " +
              "Give practical step-by-step answers. If info is missing, ask 1 short question.",
          },
          {
            role: "user",
            content: `Platform: ${platform}\nQuestion: ${question}`,
          },
        ],
      }),
    });

    const text = await resp.text();

    // If OpenAI returns an error, show it clearly
    if (!resp.ok) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "OpenAI error", status: resp.status, details: text }),
      };
    }

    const data = JSON.parse(text);

    // Reliable extraction
    const answer =
      data.output_text ??
      data.output?.[0]?.content?.[0]?.text ??
      null;

    if (!answer) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No answer text found", raw: data }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server error", details: String(e) }),
    };
  }
};
