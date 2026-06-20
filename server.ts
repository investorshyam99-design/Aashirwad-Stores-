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
  const apiKey = process.env.GEMINI_API_KEY;
  
  // AI Conversational Smart Ordering Endpoint
  app.post('/api/voice-assistant', async (req, res) => {
    try {
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in your hosting environment.");
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
      You are a highly advanced, friendly human-like grocery shop assistant for an Indian local store.
      Your goal is to take grocery orders primarily via voice text which may be in Hindi, Marathi, English, or Hinglish.
      
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
      2. If a user asks for a product BUT missing the quantity, you MUST ask the user "Kitne chahiye?" (e.g., "Maggi kitne packet chahiye?"). Ask ONE question at a time if there are multiple things unclear.
      3. If product name is unclear or there are multiple matches, ask for clarification (e.g., "Coca Cola 1 litre ya 2 litre?").
      4. If user adds more items, include them in "cartUpdates". DO NOT include items that are already in the "Current Items in Cart" unless the user explicitly asks to add MORE of them.
      5. Inform the user you added them (e.g. "Thik hai, maine Maggi 2 packet add kar diya hai.").
      6. After adding the requested products, and when the user finishes ordering, ask the user for their name if it hasn't been provided yet. (e.g., "Aapka order ready hai. Order place karne ke liye kripya apna naam bataiye?").
      7. Note the user's name if they give it, and then ask "Kya main order place kar doon?". If the user says "Haan", "Yes", "Place order", and you know their name, respond with action "place_order" AND include the customer's name in the JSON as "customerName".
      
      Return a STRICT JSON object representing your decision and response.
      Format:
      {
        "reply": "Your human-like verbal response. Wait patiently for answers.",
        "action": "ask" | "add_to_cart" | "confirm_order" | "place_order",
        "customerName": "Extracted customer name if known, otherwise omit",
        "cartUpdates": [ // Provide items to be added. If no new items, leave empty array []
          { "id": "matched_product_id", "quantity": number, "name": "Required only if not in inventory", "price": 50 }
        ]
      }
      
      Do not return markdown. Only raw JSON string.`;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const resultText = response.text || "{}";
      let parsed = {};
      try {
         parsed = JSON.parse(resultText.trim());
      } catch (e) {
         console.error("AI parse error", e);
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
