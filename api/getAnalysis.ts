// File baru: api/getAnalysis.ts
// Pastikan Anda menginstal @google/genai sebagai dependency (npm install @google/genai)

import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult } from '../types'; // Sesuaikan path jika perlu

// Ambil KUNCI RAHASIA dari Vercel Environment Variables
// Ini aman karena hanya berjalan di server
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Skema yang sama dari geminiService.ts Anda
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    position: { type: Type.STRING, description: '...' },
    entryPrice: { type: Type.STRING, description: '...' },
    stopLoss: { type: Type.STRING, description: '...' },
    takeProfit: { type: Type.STRING, description: '...' },
    confidence: { type: Type.STRING, description: '...' },
    reasoning: { type: Type.STRING, description: '...' },
  },
  required: ['position', 'entryPrice', 'stopLoss', 'takeProfit', 'confidence', 'reasoning'],
};

// Vercel akan mengubah ini menjadi API endpoint
// Pastikan ini adalah default export
export default async function handler(req: any, res: any) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { cryptoName, currentPrice } = req.body;

    if (!cryptoName || currentPrice === undefined) {
      return res.status(400).json({ error: 'cryptoName dan currentPrice diperlukan' });
    }
    
    if (!process.env.API_KEY) {
        throw new Error("Kunci API Gemini tidak dikonfigurasi di Vercel.");
    }

    const formattedPrice = currentPrice < 0.01 ? currentPrice.toFixed(8) : currentPrice.toFixed(4);
    const prompt = `
    Anda adalah 'CRYP-7', seorang analis teknikal cryptocurrency elit...
    (Prompt lengkap Anda di sini)...
    ...untuk ${cryptoName} yang saat ini berada di harga $${formattedPrice}.
    ...
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.7,
      },
    });

    const jsonString = (response.text ?? '').trim();
    if (!jsonString) {
      throw new Error("Respons AI kosong.");
    }
    
    const result = JSON.parse(jsonString);
    
    // Kirim hasil analisis kembali ke client
    return res.status(200).json(result);

  } catch (error) {
    console.error("Error in Vercel function (api/getAnalysis):", error);
    // Kirim error yang aman ke client
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return res.status(500).json({ error: errorMessage });
  }
}