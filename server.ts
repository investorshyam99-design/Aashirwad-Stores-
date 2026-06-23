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
      const { text, products, history = [], cart = [], isGreeting, isTyped = false } = req.body;
      
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

      STRICT SHOPIFY INVENTORY LIST (THE ONLY SOURCE OF TRUTH):
      ${JSON.stringify(products.map((p: any) => ({ id: p.id, name: p.name, price: p.price })), null, 2)}

      IMPORTANT INVENTORY & MATCHING RULES:
      - We have INFINITE INVENTORY for EVERY product in the list.
      - NEVER say a product is "out of stock", "available nahi hai", "stock check karna padega", etc. 
      - The user may not use exact titles. You MUST intelligently fuzzy-match their speech (Hindi/English/Hinglish) against the EXACT Shopify titles provided.
      - Examples: "Clinic Plus" -> match "Clinic plus 1 wali (shampoo)", "Max fresh" -> match "Max Fresh Paste", "Dove" -> match "Dove 2 wali (shampoo)".
      - ALWAYS return the EXACT Shopify ID, Name, and Price from the list in 'cartUpdates'. Do NOT hallucinate names.
      - Only if the user asks for something completely unrelated to the store (e.g. "iPhone", "Laptop"), then say it's not available. For any grocery/toiletry item, find the nearest match.
      - DO NOT apologize. Just directly say you added the matched product to the cart (e.g., "Thik hai, maine [Exact Name] add kar diya hai.")

      STORE PICKUP ORDER FLOW:
      - This is NOT a home delivery system. 
      - After order confirmation and taking customer's name, say naturally: "Aapka order tayyar ho raha hai.", "Kripya thodi der mein store par aa jaiye."

      GENERAL FLOW:
      1. Understand the user input and determine if they want new items, confirming quantities, or ready to place order.
      2. If adding items, aggressively fuzzy match to the nearest inventory product ID, set quantity, and add to "cartUpdates" with EXACT Shopify ID, Name, and Price. 
      3. If quantity is missing or unclear, assume 1.
      4. After adding items and user wants to finalize, you MUST ask for their name AND phone number if not already provided.
      5. Once you have both name and phone number, explicitly ask the user to confirm placing the order (e.g. "Shyam ji, aapka number 9876543210 hai, kya main order place kar doon?").
      6. If the user explicitly confirms (yes, haan, theek hai, place it), ONLY THEN respond with action "place_order" AND include customerName and customerPhone.

      Return a STRICT JSON object representing your decision and response.
      Format:
      {
        "reply": "Your human-like, warm, and natural conversational response matching the user's language.",
        "action": "ask" | "add_to_cart" | "confirm_order" | "place_order",
        "customerName": "Extracted customer name if known, otherwise omit",
        "customerPhone": "Extracted customer phone if known, otherwise omit",
        "cartUpdates": [
          { "id": "matched_product_id_from_inventory", "name": "EXACT Shopify product name", "quantity": number, "price": exact_price_from_inventory }
        ]
      }
      
      Do not return markdown. Only raw JSON string.`;

        let response;
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
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

      // Generate TTS Audio via gemini-3.1-flash-tts-preview if not typed
      if (parsed.reply && !isTyped) {
        try {
          const ttsResponse = await ai.models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: parsed.reply,
            config: {
              responseModalities: ["audio"],
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
          const ttsStr = String(ttsErr);
          if (ttsStr.includes('429') || ttsStr.includes('Quota') || ttsStr.includes('503') || ttsStr.includes('UNAVAILABLE') || ttsStr.includes('demand')) {
            console.log("TTS quota/demand exceeded. Falling back to client-side browser TTS.");
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
      if (strMessage.includes('429') || strMessage.includes('Quota') || strMessage.includes('Exceeded') || strMessage.includes('RESOURCE_EXHAUSTED') || strMessage.includes('503') || strMessage.includes('UNAVAILABLE') || strMessage.includes('demand')) {
         console.warn("API quota/demand exceeded, returning user-friendly fallback response.");
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
