
import { GoogleGenAI } from "@google/genai";
import { Language, GrowthData } from '../types';

/**
 * Safely retrieves the Gemini API Key.
 * Priority: localStorage (from config.txt import) > process.env.API_KEY
 */
const getApiKey = () => {
  return localStorage.getItem('custom_ai_api_key') || process.env.API_KEY || "";
};

export const generateBedtimeStoryStream = async (topic: string, childName: string, language: Language) => {
  try {
    const apiKey = getApiKey();
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
    throw error;
  }
};

export const analyzeGrowthData = async (data: GrowthData[], language: Language): Promise<string> => {
    try {
        const apiKey = getApiKey();
        const ai = new GoogleGenAI({ apiKey });
        const langPrompt = language === 'mm' ? 'Burmese language (Myanmar)' : 'English language';
        const dataStr = data.map(d => `Month: ${d.month}, Height: ${d.height}cm, Weight: ${d.weight}kg`).join('\n');
        
        const prompt = `
          Act as a knowledgeable and reassuring pediatrician. Analyze the following child growth data against the World Health Organization (WHO) Child Growth Standards.
          
          Child's Data:
          ${dataStr}
          
          Based on the WHO standards, provide a brief (2-3 sentences), simple, and encouraging summary for the parent in ${langPrompt}. 
          Mention if the growth trend appears to be following a consistent percentile curve.
          IMPORTANT: Do not provide medical advice. Frame the analysis in a positive and supportive tone. This is for general informational purposes only.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
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
            ? "ကွန်ဟက်ချိတ်ဆက်မှု ပြဿနာရှိနေပါသည်။" 
            : "Connection error. Please try again.";
    }
}
