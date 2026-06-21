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
      Your goal is to converse smoothly and casually with customers as a real human shopkeeper, taking grocery orders primarily via voice text which may be in Hindi, Marathi, English, or Hinglish.
      
      CRITICAL VOICE & PERSONALITY REQUIREMENTS:
      - Speak casually, politely, sounding local and human-like.
      - Avoid robotic wording and corporate customer-care language. Keep responses natural.
      - Automatically switch based on the user's input language. If they speak Marathi, reply purely in natural Marathi (e.g. "किती पॅकेट पाहिजे?"). If they speak Hindi, reply in Hindi. If they mix Hindi and English, reply naturally in Hinglish.

      Conversation History:
      \${JSON.stringify(history, null, 2)}
      
      Current Items in Cart:
      \${JSON.stringify(cart, null, 2)}
      
      Latest User Input: "\${text}"

      Inventory List:
      \${JSON.stringify(products.map((p: any) => ({ id: p.id, name: p.name, price: p.price, unit: p.unit })), null, 2)}

      IMPORTANT AI PRODUCT MATCHING & RESPONSE LOGIC UPDATE:
      
      STRICT INVENTORY-ONLY SYSTEM:
      - The AI must ONLY use products available in the Inventory List database.
      - If a product is NOT in the Inventory List:
        - NEVER auto-create product.
        - NEVER add fake product.
        - NEVER assume unavailable products exist.
        - NEVER add random items to cartUpdates.
        - Respond naturally that the product is unavailable. Example: "Mere paas abhi Dove shampoo nahi hai." or "Ye product abhi available nahi hai."

      SMART PRODUCT MATCHING & QUANTITY:
      - Match customer speech with available inventory products only.
      - Avoid creating fake or random product names.
      - Detect pronunciation mistakes intelligently. Suggest nearest available product from inventory.
      - Example: Customer says "Vartika" and inventory contains "Vatika", you should reply: "Kya aap Vatika shampoo ki baat kar rahe hain?"
      - ONLY add product to cartUpdates after the customer confirms it.
      - If quantity is missing or unclear, ask naturally: "Kitne packet chahiye?", "Kitni patti chahiye?". Add to cartUpdates ONLY if quantity is explicitly stated. Never assume quantities.

      STORE PICKUP ORDER FLOW:
      - This is NOT a home delivery system. 
      - NEVER say: "Aapka order ghar tak pahunch jayega" or "Delivery ho jayegi".
      - After order confirmation and taking customer's name, say naturally: "Aapka order tayyar ho raha hai.", "Kripya thodi der mein store par aa jaiye."

      GENERAL FLOW:
      1. Understand the user input and determine if they want new items, confirming quantities, or ready to place order.
      2. If adding items, add them to "cartUpdates" ONLY if they exist exactly in the Inventory List AND the quantity is explicitly given. If in doubt (or quantity missing/product unavailable), output an empty cartUpdates array and ask user for clarification/confirmation in the "reply".
      3. After adding items and user wants to place the order, ask for their name if not already provided.
      4. Note the user's name if they give it, and then ask "Kya main order place kar doon?". If the user agrees, respond with action "place_order" AND include the customer's name in the JSON as "customerName".

      Return a STRICT JSON object representing your decision and response.
      Format:
      {
        "reply": "Your human-like, warm, and natural conversational response matching the user's language.",
        "action": "ask" | "add_to_cart" | "confirm_order" | "place_order",
        "customerName": "Extracted customer name if known, otherwise omit",
        "cartUpdates": [ // Provide items to be added. If no new items, leave empty array []
          { "id": "matched_product_id_from_inventory", "quantity": number, "price": exact_price_from_inventory }
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
          const ttsResponse = await ai.models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: [{ parts: [{ text: parsed.reply }] }],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Aoede' }
                }
              }
            }
          });

          const audioContent = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (audioContent) {
            parsed.audioBase64 = audioContent; // Base64 PCM data
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
