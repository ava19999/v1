// services/geminiService.ts
// Hapus import GoogleGenAI karena tidak lagi digunakan di sisi klien
// import { GoogleGenAI, Type } from "@google/genai"; 
import type { AnalysisResult } from '../types';

// Skema tidak lagi diperlukan di sini, sudah dipindahkan ke serverless function

export const fetchCryptoAnalysis = async (cryptoName: string, currentPrice: number): Promise<AnalysisResult> => {
  // Tidak perlu lagi memeriksa process.env.API_KEY di sini
  // if (!process.env.API_KEY) { ... } // HAPUS BLOK INI

  try {
    // Panggil API endpoint (Serverless Function) yang Anda buat di Vercel
    const response = await fetch('/api/getAnalysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cryptoName: cryptoName,
        currentPrice: currentPrice,
      }),
    });

    if (!response.ok) {
      // Coba baca pesan error dari server jika ada
      const errorData = await response.json().catch(() => ({})); // Tangkap jika respons bukan JSON
      const errorMessage = errorData.error || `Error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const result: AnalysisResult = await response.json();
    return result;

  } catch (error) {
    console.error("Error fetching analysis from /api/getAnalysis:", error);
    // Teruskan pesan error yang ramah
    const message = error instanceof Error ? error.message : "Gagal mendapatkan analisis dari AI.";
    throw new Error(message);
  }
};