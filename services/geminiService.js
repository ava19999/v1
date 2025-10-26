import { GoogleGenAI, Type } from "@google/genai";
// Inisialisasi AI sesuai dengan pedoman, dengan asumsi process.env.API_KEY tersedia.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        position: {
            type: Type.STRING,
            description: 'The recommended trading position, either "Long" or "Short".'
        },
        entryPrice: {
            type: Type.STRING,
            description: 'The recommended entry price or range. Return ONLY the number or range (e.g., "68000-68500" or "67000"), WITHOUT any currency symbols like $.',
        },
        stopLoss: {
            type: Type.STRING,
            description: 'The recommended price for a stop-loss. Return ONLY the number (e.g., "67000"), WITHOUT any currency symbols like $.',
        },
        takeProfit: {
            type: Type.STRING,
            description: 'An optimistic take-profit target for potential further gains. Return ONLY the number (e.g., "75000"), WITHOUT any currency symbols like $.',
        },
        confidence: {
            type: Type.STRING,
            description: 'The confidence level of this analysis (e.g., "High", "Medium", "Low").',
        },
        reasoning: {
            type: Type.STRING,
            description: 'A brief, professional rationale for the chosen price points and position, grounded in technical or market analysis principles.',
        },
    },
    required: ['position', 'entryPrice', 'stopLoss', 'takeProfit', 'confidence', 'reasoning'],
};
export const fetchCryptoAnalysis = async (cryptoName, currentPrice) => {
    if (!process.env.API_KEY) {
        throw new Error("Kunci API Gemini tidak dikonfigurasi. Harap atur variabel lingkungan API_KEY.");
    }
    // FIX: Format harga dengan presisi yang sesuai untuk menghindari pengiriman "0.0000" untuk koin bernilai rendah.
    const formattedPrice = currentPrice < 0.01 ? currentPrice.toFixed(8) : currentPrice.toFixed(4);
    const prompt = `
    Anda adalah 'CRYP-7', seorang analis teknikal cryptocurrency elit. Tugas Anda adalah memberikan analisis perdagangan untuk ${cryptoName} yang saat ini berada di harga $${formattedPrice}.

    **Kerangka Analisis Wajib:**
    Analisis Anda HARUS menggabungkan beberapa prinsip inti berikut:
    1.  **WaveTrend Oscillator:** Fokus pada persilangan dan kondisi ekstrem (oversold/overbought).
    2.  **Divergensi:** Cari divergensi bullish atau bearish pada osilator momentum seperti RSI atau MFI.
    3.  **Money Flow Index (MFI) & RSI:** Gunakan untuk mengukur momentum dan tekanan beli/jual.
    4.  **Konfirmasi Sinyal:** Berikan sinyal hanya jika ada konfluensi dari beberapa indikator.

    **Format Output:**
    -   Ikuti skema JSON yang disediakan dengan ketat.
    -   Untuk 'position' dan 'confidence', GUNAKAN nilai bahasa Inggris seperti yang dicontohkan dalam skema (misalnya, "Long", "Short", "High", "Medium", "Low").
    -   Untuk 'reasoning', berikan penjelasan singkat dan padat dalam **Bahasa Indonesia**, seolah-olah Anda sedang memberi pengarahan kepada seorang trader profesional. Jelaskan logika teknis di balik titik masuk, stop loss, dan target profit.
    -   Pastikan semua titik harga yang direkomendasikan masuk akal relatif terhadap harga saat ini.
  `;
    try {
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
        return result;
    }
    catch (error) {
        console.error("Error fetching analysis from Gemini API:", error);
        throw new Error("Gagal mendapatkan analisis dari AI. Model mungkin kelebihan beban atau terjadi kesalahan.");
    }
};
//# sourceMappingURL=geminiService.js.map