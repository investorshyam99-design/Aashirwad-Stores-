import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

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
      const { text, products, history = [], cart = [], isGreeting } = req.body;
      
      let parsed: any = {};
      
      if (isGreeting) {
        parsed = {
          reply: "नमस्ते जी, आपको क्या चाहिए? आप मुझे बताइए, मैं आपका ऑर्डर तैयार कर देता हूँ।",
          action: "ask",
          cartUpdates: []
        };
      } else {
        const prompt = `
      You are a highly advanced, extremely natural, warm, and friendly wholesale general store assistant for an Indian local store.
      Your goal is to converse smoothly and casually with customers as a real human shopkeeper, taking orders primarily via voice text which may be in Hindi, Marathi, English, or Hinglish.
      
      CRITICAL VOICE & PERSONALITY REQUIREMENTS:
      - Speak casually, politely, sounding local and human-like.
      - Avoid robotic wording and customer-care language. Keep responses natural.
      - Automatically switch based on the user's input language. 
      - IMPORTANT FOR PRONUNCIATION: Write Hindi and Marathi output strictly in Devanagari script.

      Conversation History:
      ${JSON.stringify(history, null, 2)}
      
      Current Items in Cart:
      ${JSON.stringify(cart, null, 2)}
      
      Latest User Input: "${text}"

      Inventory List (Shopify):
      ${JSON.stringify(products.map((p: any) => ({ id: p.id, name: p.name, price: p.price })), null, 2)}

      SMART PRODUCT MATCHING & INFINITE STOCK:
      - We fetch products from Shopify and assume we have INFINITE STOCK.
      - Use FUZZY/PARTIAL matching for Customer speech against available inventory. 
      - Example: If customer asks for "Clinic Plus" or "क्लीनिक प्रेस" (Clinic Press) or "clinic press", match it exactly with "Clinic plus 1 wali (shampoo)" (or exactly whatever variant of Clinic Plus is in the inventory). DO NOT say it's unavailable.
      - Example: "Vatika" -> "Vatika 1 wali (shampoo)".
      - Do NOT deny an item just because the name is slightly different. Guess the closest match.
      - If you find a match in the inventory, add it to 'cartUpdates', using its exact ID from the list.
      - If they ask for something entirely unrelated that is definitely missing from the inventory, just politely respond that it's out of stock.

      STORE PICKUP ORDER FLOW:
      - This is NOT a home delivery system. 
      - After order confirmation and taking customer's name, say naturally: "Aapka order tayyar ho raha hai.", "Kripya thodi der mein store par aa jaiye."

      GENERAL FLOW:
      1. Understand the user input and determine if they want new items, confirming quantities, or ready to place order.
      2. If adding items, guess the nearest inventory product ID, set quantity, and add to "cartUpdates". 
      3. If quantity is missing or unclear, ask naturally: "Kitne packet chahiye?".
      4. After adding items and user wants to place the order, ask for their name if not already provided.
      5. "Kya main order place kar doon?". If the user agrees, respond with action "place_order" AND include customerName.

      Return a STRICT JSON object representing your decision and response.
      Format:
      {
        "reply": "Your human-like, warm, and natural conversational response matching the user's language.",
        "action": "ask" | "add_to_cart" | "confirm_order" | "place_order",
        "customerName": "Extracted customer name if known, otherwise omit",
        "cartUpdates": [
          { "id": "matched_product_id_from_inventory", "quantity": number, "price": exact_price_from_inventory }
        ]
      }
      
      Do not return markdown. Only raw JSON string.`;

        let response;
        response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          }
        });

        const resultText = response?.text || "{}";
        try {
           parsed = JSON.parse(resultText.trim());
        } catch (e) {
           console.error("AI parse error", e);
        }
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
          if (ttsErr.message?.includes('429') || ttsErr.message?.includes('Quota') || String(ttsErr).includes('429')) {
            console.log("TTS quota exceeded. Falling back to client-side browser TTS.");
          } else {
            console.error("TTS generation error:", ttsErr);
          }
        }
      }

      res.json(parsed);
    } catch (error: any) {
      const strError = String(error);
      const strMessage = error.message || strError;

      // Fallback for RATE limits (Code 429) so users get a simple free fallback response
      if (strMessage.includes('429') || strMessage.includes('Quota') || strMessage.includes('Exceeded') || strMessage.includes('RESOURCE_EXHAUSTED')) {
         console.warn("API quota exceeded, returning user-friendly fallback response.");
         return res.json({
           reply: "मैं अभी थोड़ा व्यस्त हूँ, कृपया एक मिनट बाद दोबारा कोशिश करें।",
           action: "ask",
           cartUpdates: []
         });
      }
      console.error("Voice Assistant endpoint error:", error);
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
