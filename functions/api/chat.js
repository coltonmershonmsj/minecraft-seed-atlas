export async function onRequestPost({ request, env }) {
  const { question, platform } = await request.json();

  const knowledge = `
Java uses mods (Forge/Fabric). Bedrock uses add-ons.
Villagers restock trades up to twice per day.
For building plans: choose a style, footprint, palette, then detail.
`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: "You are a Minecraft guide. Tailor answers to Java or Bedrock."
        },
        {
          role: "user",
          content: `Platform: ${platform}\nKnowledge:\n${knowledge}\nQuestion: ${question}`
        }
      ]
    })
  });

  const data = await response.json();
  const answer =
    data.output_text ||
    "No answer returned yet.";

  return new Response(JSON.stringify({ answer }), {
    headers: { "Content-Type": "application/json" }
  });
}

