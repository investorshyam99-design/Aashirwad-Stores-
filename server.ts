import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API constraints
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API;
  
  // AI Conversational Smart Ordering Endpoint
  app.post('/api/voice-assistant', async (req, res) => {
    try {
      if (!apiKey) {
        throw new Error("GEMINI_API or GEMINI_API_KEY environment variable is missing. Please configure it in your hosting environment.");
      }
      
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      const { text, products, history = [], cart = [] } = req.body;
      
      const prompt = `
      You are a highly advanced, extremely natural, warm, and friendly grocery shop assistant for an Indian local store.
      Your goal is to converse smoothly and casually with customers as a real human, taking grocery orders primarily via voice text which may be in Hindi, Marathi, English, or Hinglish.
      
      CRITICAL VOICE & PERSONALITY REQUIREMENTS (Translate these into how you form the "reply" string):
      - Sound warm, friendly, natural, and emotionally realistic. Avoid robotic vocabulary and overly formal language.
      - Automatically switch based on the user's input language. If they speak Marathi, reply purely in natural Marathi (e.g. "किती पॅकेट पाहिजे?"). If they speak Hindi, reply in Hindi. If they mix Hindi and English, reply naturally in Hinglish.
      - Use smooth conversational flow like a real Indian grocery shop owner on a phone call. (e.g., "Thik hai, maine add kar diya", "Clinic Plus kitni patti chahiye?").
      - Keep responses naturally short and directly conversational. Your goal is to make the customer forget they are talking to an AI.

      Conversation History:
      ${JSON.stringify(history, null, 2)}
      
      Current Items in Cart:
      ${JSON.stringify(cart, null, 2)}
      
      Latest User Input: "${text}"

      Inventory List:
      ${JSON.stringify(products.map((p: any) => ({ id: p.id, name: p.name, price: p.price, unit: p.unit })), null, 2)}
      
      Rules for your behavior:
      1. Parse the user's input to find matching products from the inventory. Use approximate matching for spelling mistakes. 
         - IMPORTANT: We have MULTIPLE AND INFINITE stock of EVERYTHING. If a product the user asks for is NOT in the Inventory List (e.g. Clinic Plus, special rice, etc.), you MUST STILL ACCEPT IT.
         - For products NOT in the list, include them in "cartUpdates" with a generated "id" (e.g., "custom-1"), the "name" they requested, and an estimated "price" (e.g. 50).
         - DO NOT say the item is out of stock or not in inventory.
      2. If a user asks for a product BUT missing the quantity, you MUST ask the user "Kitne chahiye?" in the current conversational language.
      3. If product name is unclear or there are multiple matches, ask for clarification smoothly (e.g., "Coca Cola 1 litre ya 2 litre?").
      4. If user adds more items, include them in "cartUpdates". DO NOT include items that are already in the "Current Items in Cart" unless the user explicitly asks to add MORE of them.
      5. Inform the user you added them (e.g. "Thik hai, maine Maggi 2 packet add kar diya hai.").
      6. After adding the requested products, and when the user finishes ordering, ask the user for their name if it hasn't been provided yet. (e.g., "Aapka order ready hai. Order place karne ke liye kripya apna naam bataiye?").
      7. Note the user's name if they give it, and then ask "Kya main order place kar doon?". If the user says "Haan", "Yes", "Place order", and you know their name, respond with action "place_order" AND include the customer's name in the JSON as "customerName".
      
      Return a STRICT JSON object representing your decision and response.
      Format:
      {
        "reply": "Your human-like, warm, and natural conversational response matching the user's language.",
        "action": "ask" | "add_to_cart" | "confirm_order" | "place_order",
        "customerName": "Extracted customer name if known, otherwise omit",
        "cartUpdates": [ // Provide items to be added. If no new items, leave empty array []
          { "id": "matched_product_id", "quantity": number, "name": "Required only if not in inventory", "price": 50 }
        ]
      }
      
      Do not return markdown. Only raw JSON string.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const resultText = response.text || "{}";
      let parsed: any = {};
      try {
         parsed = JSON.parse(resultText.trim());
      } catch (e) {
         console.error("AI parse error", e);
      }

      // Generate TTS Audio via gemini-3.1-flash-tts-preview
      if (parsed.reply) {
        try {
          const ttsInteraction = await ai.interactions.create({
            model: "gemini-3.1-flash-tts-preview",
            input: parsed.reply,
            response_modalities: ['audio'],
            generation_config: {
              speech_config: {
                voice: "Aoede"
              }
            }
          });

          for (const step of ttsInteraction.steps) {
            if (step.type === 'model_output') {
              const audioContent = step.content?.find((c: any) => c.type === 'audio');
              if (audioContent && audioContent.data) {
                 parsed.audioBase64 = audioContent.data; // Base64 PCM data
                 break;
              }
            }
          }
        } catch (ttsErr: any) {
          console.error("TTS generation error:", ttsErr);
        }
      }

      res.json(parsed);
    } catch (error: any) {
      console.error(error);
      const strError = String(error);
      const strMessage = error.message || strError;
      
      // Fallback for RATE limits (Code 429) so users get a simple free fallback response
      if (strMessage.includes('429') || strMessage.includes('Quota') || strMessage.includes('Exceeded') || strMessage.includes('RESOURCE_EXHAUSTED')) {
         return res.json({
           reply: "Main abhi thoda busy hoon (too many requests limit reached), kripya ek minute baad dobara koshish karein.",
           action: "ask",
           cartUpdates: []
         });
      }
      res.status(500).json({ error: strMessage });
    }
  });

  app.post('/api/create-order', async (req, res) => {
     // Here we would typically create Razorpay order or directly create DB order.
     // For now, Razorpay COD/Direct flows can be simulated.
     res.json({ success: true, message: 'Simulated Order API' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
