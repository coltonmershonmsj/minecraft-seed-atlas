export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Use POST", { status: 405 });
    }

    const { question, platform } = await req.json();

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
              "You are a Bedrock-first Minecraft guide for a group world. " +
              "Give practical step-by-step answers. If you need missing info, ask 1 short question.",
          },
          {
            role: "user",
            content: `Platform: ${platform}\nQuestion: ${question}`,
          },
        ],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return new Response(JSON.stringify({ error: err }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();

// Try multiple known places where the text can appear
const answer =
  data.output_text ??
  data.output?.[0]?.content?.[0]?.text ??
  data.output?.[0]?.content?.[0]?.value ??
  data.response?.output_text ??
  null;

if (!answer) {
  // If we still can't find it, return the whole response for debugging
  return new Response(JSON.stringify({ error: "No text found in response", raw: data }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}

return new Response(JSON.stringify({ answer }), {
  headers: { "Content-Type": "application/json" },
});
    return new Response(JSON.stringify({ answer }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
