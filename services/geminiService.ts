
import { GoogleGenAI } from "@google/genai";
import { Language, GrowthData } from '../types';
import { DataService } from '../lib/db';

const getApiKey = async (): Promise<string | null> => {
    const setting = await DataService.getSetting('geminiApiKey');
    return setting?.value || process.env.API_KEY || null;
}

export const generateBedtimeStoryStream = async (topic: string, childName: string, language: Language) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      throw new Error("API_KEY_MISSING");
    }
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
  } catch (error: any) {
    console.error("Error generating story:", error);
    if (error.message === "API_KEY_MISSING") {
        throw new Error("API key not configured. Please set it in the app settings.");
    }
    throw error;
  }
};

export const analyzeGrowthData = async (data: GrowthData[], language: Language): Promise<string> => {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) {
            return language === 'mm' ? "သင်၏ API Key ကို ဆက်တင်တွင် ထည့်သွင်းပေးပါ။" : "Please set your API Key in the settings.";
        }
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

        // Directly accessing .text property of GenerateContentResponse
        return response.text || (language === 'mm' ? "အချက်အလက်များကို ဆန်းစစ်မရနိုင်ပါ။" : "Could not analyze data.");
    } catch (error) {
        console.error("Error analyzing growth:", error);
        return language === 'mm' 
            ? "ကွန်ဟက်ချိတ်ဆက်မှု သို့မဟုတ် API Key အမှားရှိနေပါသည်။" 
            : "Connection or API Key error. Please try again.";
    }
}