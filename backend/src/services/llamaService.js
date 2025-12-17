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

// Multiple AI provider options - uses the first available one
const HF_TOKEN = process.env.HF_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Generates a human-readable explanation of risk using AI
 * Tries multiple providers in order: Groq -> OpenRouter -> HuggingFace -> Fallback
 */
export async function generateRiskExplanation(data) {
  const prompt = `You are Sentinel AI, a safety assistant. Location: Lat ${data.lat}, Lng ${data.lng}. Risk Level: ${data.label}. Nearby Incidents: ${data.incidents}. Explain this risk briefly (under 50 words) for a civilian. Be calm and factual.`;

  // Try Groq first (FAST & FREE)
  if (GROQ_API_KEY) {
    try {
      return await tryGroq(prompt);
    } catch (err) {
      console.error('❌ Groq failed:', err.message);
    }
  }

  // Try OpenRouter (FREE tier available)
  if (OPENROUTER_API_KEY) {
    try {
      return await tryOpenRouter(prompt);
    } catch (err) {
      console.error('❌ OpenRouter failed:', err.message);
    }
  }

  // Try Hugging Face (updated URL)
  if (HF_TOKEN) {
    try {
      return await tryHuggingFace(prompt);
    } catch (err) {
      console.error('❌ HuggingFace failed:', err.message);
    }
  }

  // Fallback to local response
  console.warn("⚠️ All AI providers failed, using fallback");
  return fallbackExplanation(data);
}

/**
 * Groq API - FASTEST and FREE (Recommended!)
 * Get API key: https://console.groq.com
 */
async function tryGroq(prompt) {
  console.log('🚀 Trying Groq API...');
  
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', // Fast and accurate
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.7
    })
  });

  if (!res.ok) {
    throw new Error(`Groq API error: ${res.status}`);
  }

  const json = await res.json();
  const response = json.choices[0].message.content.trim();
  console.log('✅ Got response from Groq');
  return response;
}

/**
 * OpenRouter API - Multiple models, free tier available
 * Get API key: https://openrouter.ai/keys
 */
async function tryOpenRouter(prompt) {
  console.log('🔀 Trying OpenRouter API...');
  
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://sentinel-ai.vercel.app',
      'X-Title': 'Sentinel AI'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.2-3b-instruct:free', // Free model
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.7
    })
  });

  if (!res.ok) {
    throw new Error(`OpenRouter API error: ${res.status}`);
  }

  const json = await res.json();
  const response = json.choices[0].message.content.trim();
  console.log('✅ Got response from OpenRouter');
  return response;
}

/**
 * Hugging Face API - Updated to use new router endpoint
 * Get API key: https://huggingface.co/settings/tokens
 */
async function tryHuggingFace(prompt) {
  console.log('🤗 Trying Hugging Face API...');
  
  const models = [
    'meta-llama/Llama-3.2-3B-Instruct',
    'mistralai/Mistral-7B-Instruct-v0.3'
  ];

  for (const model of models) {
    try {
      console.log(`   Testing ${model}...`);
      
      // Updated URL to use router instead of api-inference
      const res = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 100,
          temperature: 0.7,
          stream: false
        })
      });

      if (res.status === 503) {
        console.log(`   Model loading, trying next...`);
        continue;
      }

      if (!res.ok) {
        console.log(`   Error ${res.status}, trying next...`);
        continue;
      }

      const json = await res.json();
      if (json.choices && json.choices[0]?.message?.content) {
        const response = json.choices[0].message.content.trim();
        console.log(`✅ Got response from Hugging Face (${model})`);
        return response;
      }
    } catch (err) {
      console.log(`   Error: ${err.message}`);
      continue;
    }
  }

  throw new Error('All Hugging Face models failed');
}

/**
 * Fallback messages when all AI services are down
 */
function fallbackExplanation(data) {
  const { label, incidents } = data;
  
  const messages = {
    High: `⚠️ High risk detected. ${incidents} incident${incidents !== 1 ? 's' : ''} reported nearby. Avoid this area if possible and stay in well-populated zones.`,
    Medium: `⚡ Moderate risk level. ${incidents} incident${incidents !== 1 ? 's' : ''} recorded nearby. Stay vigilant, keep to well-lit areas, and be aware of your surroundings.`,
    Low: `✅ Low risk area with ${incidents} incident${incidents !== 1 ? 's' : ''}. Area appears generally safe. Normal caution advised as always.`
  };
  
  let explanation = messages[label] || messages.Medium || "Risk assessed based on local activity patterns.";
  
  // Add time-based warning
  const hour = new Date().getHours();
  if (hour >= 20 || hour <= 5) {
    explanation += " 🌙 Note: It's nighttime - extra caution advised.";
  }
  
  return explanation;
}