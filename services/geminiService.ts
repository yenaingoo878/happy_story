
import { GoogleGenAI } from "@google/genai";
import { Language, GrowthData } from '../types';

// FIX: Initialize Gemini API client using process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBedtimeStoryStream = async (topic: string, childName: string, language: Language) => {
  try {
    const langPrompt = language === 'mm' ? 'Burmese language (Myanmar)' : 'English language';
    
    const prompt = `
      Create a short, gentle, and heartwarming bedtime story for a child named "${childName}" in ${langPrompt}.
      The story should be about: "${topic}".
      Keep the tone sweet, soothing, and suitable for young children. 
      Limit the story to about 150-200 words.
      Do not include markdown formatting or bold text, just plain text paragraphs.
    `;

    // FIX: Use gemini-3-flash-preview for text generation tasks as per guidelines
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
    try {
        const langPrompt = language === 'mm' ? 'Burmese language (Myanmar)' : 'English language';
        const dataStr = data.map(d => `Month: ${d.month}, Height: ${d.height}cm, Weight: ${d.weight}kg`).join('\n');
        
        const prompt = `
          Act as a friendly pediatrician assistant. Analyze this growth data for a child:
          ${dataStr}
          
          Provide a very short, encouraging summary (max 2-3 sentences) in ${langPrompt} for the parent. 
          Focus on the steady progress. Do not give medical advice, just general encouragement about their growth trend.
        `;

        // FIX: Use gemini-3-flash-preview for text generation tasks as per guidelines
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
            ? "ကွန်ဟက်ချိတ်ဆက်မှု အခက်အခဲရှိနေပါသည်။" 
            : "Connection error. Please try again.";
    }
}
