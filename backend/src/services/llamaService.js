// import dotenv from "dotenv";
// dotenv.config();

// import OpenAI from "openai";

// const client = new OpenAI({
//   apiKey: process.env.HF_TOKEN,   // 👈 THIS FIXES IT
//   baseURL: "https://router.huggingface.co/v1"
// });

// export async function explainRisk({ risk, location, time }) {
//   const response = await client.chat.completions.create({
//     model: "meta-llama/Llama-3.1-8B-Instruct",
//     messages: [
//       {
//         role: "system",
//         content:
//           "You are SentinelAI, a calm Nigerian security alert assistant."
//       },
//       {
//         role: "user",
//         content: `
// Risk Level: ${risk}
// Location: ${location}
// Time: ${time}

// Explain this risk clearly in under 3 sentences.
// Avoid panic.
//         `
//       }
//     ],
//     max_tokens: 120
//   });

//   return response.choices[0].message.content;
// }

const HF_TOKEN = process.env.HF_TOKEN;

export async function generateRiskExplanation(data) {
  const prompt = `
You are Sentinel AI, a safety assistant.

Location:
Latitude ${data.lat}, Longitude ${data.lng}

Risk Level: ${data.label}
Confidence: ${(data.score * 100).toFixed(1)}%
Nearby Incidents: ${data.incidents}

Explain this risk briefly, calmly, and clearly for a civilian.
Do not exaggerate or panic the user.
`;

  const res = await fetch(
    "https://api-inference.huggingface.co/models/meta-llama/Llama-3-8B-Instruct",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 120,
          temperature: 0.5
        }
      })
    }
  );

  const json = await res.json();

  if (Array.isArray(json)) {
    return json[0]?.generated_text
      ?.replace(prompt, "")
      ?.trim();
  }

  return "Risk assessed based on nearby activity patterns.";
}
