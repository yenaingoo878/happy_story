
import { GoogleGenAI } from "@google/genai";
import { Language, GrowthData } from '../types';

// The key is expected to be valid, but we handle it defensively
const apiKey = process.env.API_KEY;

export const generateBedtimeStoryStream = async (topic: string, childName: string, language: Language) => {
  if (!apiKey) {
    throw new Error(language === 'mm' ? "AI API Key မရှိပါ။" : "AI API Key is missing.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const langPrompt = language === 'mm' ? 'Burmese language (Myanmar)' : 'English language';
    
    const prompt = `
      Create a short, gentle, and heartwarming bedtime story for a child named "${childName}" in ${langPrompt}.
      The story should be about: "${topic}".
      Keep the tone sweet, soothing, and suitable for young children. 
      Limit the story to about 150-200 words.
      Do not include markdown formatting or bold text, just plain text paragraphs.
    `;

    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 0.7,
      }
    });

    return response;
  } catch (error) {
    console.error("Error generating story:", error);
    throw error;
  }
};

export const analyzeGrowthData = async (data: GrowthData[], language: Language): Promise<string> => {
    if (!apiKey) {
      return language === 'mm' ? "AI အင်္ဂါရပ်များကို အသုံးပြုရန် API Key လိုအပ်ပါသည်။" : "AI features require an API Key.";
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const langPrompt = language === 'mm' ? 'Burmese language (Myanmar)' : 'English language';
        const dataStr = data.map(d => `Month: ${d.month}, Height: ${d.height}cm, Weight: ${d.weight}kg`).join('\n');
        
        const prompt = `
          Act as a friendly pediatrician assistant. Analyze this growth data for a child:
          ${dataStr}
          
          Provide a very short, encouraging summary (max 2-3 sentences) in ${langPrompt} for the parent. 
          Focus on the steady progress. Do not give medical advice, just general encouragement about their growth trend.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 0 },
                temperature: 0.5,
            }
        });

        return response.text || (language === 'mm' ? "အချက်အလက်များကို ဆန်းစစ်မရနိုင်ပါ။" : "Could not analyze data.");
    } catch (error) {
        console.error("Error analyzing growth:", error);
        return language === 'mm' 
            ? "ကွန်ဟက်ချိတ်ဆက်မှု သို့မဟုတ် API Key အမှားရှိနေပါသည်။" 
            : "Connection or API Key error. Please try again.";
    }
}
