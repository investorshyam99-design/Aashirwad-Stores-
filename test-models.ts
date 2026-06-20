import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const models = await ai.models.list();
  console.log("Models:");
  for await (const m of models) {
    if (m.name.includes("flash")) console.log(m.name);
  }
}
run().catch(console.error);
