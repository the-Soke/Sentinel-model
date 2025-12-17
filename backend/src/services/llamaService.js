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

// const HF_TOKEN = process.env.HF_TOKEN;

// if (!HF_TOKEN) {
//   console.warn("⚠️ HF_TOKEN is missing. LLaMA explanations will fallback.");
// }

// export async function generateRiskExplanation(data) {
//   // 🧠 Build prompt
//   const prompt = `
// You are Sentinel AI, a calm and responsible safety assistant.

// Location:
// Latitude ${data.lat}, Longitude ${data.lng}

// Risk Level: ${data.label}
// Confidence: ${(data.score * 100).toFixed(1)}%
// Nearby Incidents: ${data.incidents}

// Explain this risk briefly and clearly for a civilian.
// Be calm, factual, and reassuring.
// Do NOT exaggerate or cause panic.
// `;

//   // 🪵 Debug
//   console.log("🦙 Calling LLM with:", {
//     label: data.label,
//     score: data.score,
//     incidents: data.incidents
//   });

//   // ❌ No token → fallback immediately
//   if (!HF_TOKEN) {
//     return fallbackExplanation(data);
//   }

//   try {
//     const res = await fetch(
//       "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${HF_TOKEN}`,
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//           inputs: prompt,
//           parameters: {
//             max_new_tokens: 120,
//             temperature: 0.5
//           }
//         })
//       }
//     );

//     console.log("🦙 HF status:", res.status);

//     if (!res.ok) {
//       throw new Error(`HF API error ${res.status}`);
//     }

//     const json = await res.json();

//     console.log("🦙 HF response:", JSON.stringify(json, null, 2));

//     if (Array.isArray(json) && json[0]?.generated_text) {
//       return json[0].generated_text
//         .replace(prompt, "")
//         .trim();
//     }

//     // Unexpected response shape
//     return fallbackExplanation(data);

//   } catch (err) {
//     console.error("🦙 LLM Error:", err.message);
//     return fallbackExplanation(data);
//   }
// }

// /* =========================
//    FALLBACK (VERY IMPORTANT)
// ========================= */
// function fallbackExplanation(data) {
//   if (data.label === "High") {
//     return "This area shows higher-than-usual risk based on recent activity. Stay alert and avoid unnecessary exposure.";
//   }

//   if (data.label === "Medium") {
//     return "This area has some recorded incidents. It is generally okay, but staying aware of your surroundings is advised.";
//   }

//   return "This area currently shows low risk based on available data. Normal caution is sufficient.";
// }


// src/services/llamaService.js

// src/services/llamaService.js

const HF_TOKEN = process.env.HF_TOKEN;

/**
 * Generates a human-readable explanation of risk using LLaMA via Hugging Face.
 */
export async function generateRiskExplanation(data) {
  const messages = [
    {
      role: "user",
      content: `You are Sentinel AI, a safety assistant. Location: Lat ${data.lat}, Lng ${data.lng}. Risk Level: ${data.label}. Nearby Incidents: ${data.incidents}. Explain this risk briefly (under 50 words) for a civilian. Be calm and factual.`
    }
  ];

  if (!HF_TOKEN) {
    console.warn("⚠️ HF_TOKEN missing; using fallback.");
    return fallbackExplanation(data);
  }

  // Working models on the new router
  const models = [
    "meta-llama/Llama-3.2-3B-Instruct",
    "meta-llama/Llama-3.2-1B-Instruct",
    "mistralai/Mistral-7B-Instruct-v0.3"
  ];

  for (const model of models) {
    try {
      console.log(`🦙 Trying model: ${model}`);
      
      const res = await fetch(
        `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: 100,
            temperature: 0.7,
            stream: false
          })
        }
      );

      if (res.status === 503) {
        console.log(`⏳ Model ${model} is loading, trying next...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ Model ${model} error (${res.status}):`, errorText);
        continue;
      }

      const json = await res.json();

      // Handle OpenAI-style response format
      if (json.choices && json.choices[0]?.message?.content) {
        const response = json.choices[0].message.content.trim();
        console.log(`✅ Got response from ${model}`);
        return response;
      }

    } catch (err) {
      console.error(`❌ Error with model ${model}:`, err.message);
      continue;
    }
  }

  // If all models failed, use fallback
  console.warn("⚠️ All models failed, using fallback");
  return fallbackExplanation(data);
}

/**
 * Fallback messages in case the AI API is down.
 */
function fallbackExplanation(data) {
  const { label, incidents } = data;
  
  const messages = {
    High: `⚠️ High risk detected. ${incidents} incident${incidents !== 1 ? 's' : ''} reported nearby. Avoid this area if possible and stay in well-populated zones.`,
    Moderate: `⚡ Moderate risk level. ${incidents} incident${incidents !== 1 ? 's' : ''} recorded nearby. Stay vigilant, keep to well-lit areas, and be aware of your surroundings.`,
    Low: `✅ Low risk area with ${incidents} incident${incidents !== 1 ? 's' : ''}. Area appears generally safe. Normal caution advised as always.`
  };
  
  let explanation = messages[label] || "Risk assessed based on local activity patterns.";
  
  // Add time-based warning
  const hour = new Date().getHours();
  if (hour >= 20 || hour <= 5) {
    explanation += " 🌙 Note: It's nighttime - extra caution advised.";
  }
  
  return explanation;
}