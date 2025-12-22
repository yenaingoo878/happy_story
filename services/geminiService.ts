

import { GoogleGenAI } from "@google/genai";
import { Language, GrowthData } from '../types';
import { DataService } from '../lib/db';

export const generateBedtimeStoryStream = async (topic: string, childName: string, language: Language) => {
  try {
    // FIX: API key must be sourced from process.env.API_KEY exclusively.
    if (!process.env.API_KEY) {
      throw new Error("API key not configured.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    // FIX: Removed special handling for missing API key as it should not be user-configurable.
    throw error;
  }
};

export const analyzeGrowthData = async (data: GrowthData[], language: Language): Promise<string> => {
    try {
        // FIX: API key must be sourced from process.env.API_KEY exclusively.
        if (!process.env.API_KEY) {
            return language === 'mm' ? "API Key ကို configure မလုပ်ထားပါ။" : "API Key is not configured.";
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const langPrompt = language === 'mm' ? 'Burmese language (Myanmar)' : 'English language';
        const dataStr = data.map(d => `Month: ${d.month}, Height: ${d.height}cm, Weight: ${d.weight}kg`).join('\n');
        
        const prompt = `
          Act as a knowledgeable and reassuring pediatrician. Analyze the following child growth data against the World Health Organization (WHO) Child Growth Standards. You can find the standards here: https://www.who.int/tools/child-growth-standards/standards
          
          Child's Data:
          ${dataStr}
          
          Based on the WHO standards, provide a brief (2-3 sentences), simple, and encouraging summary for the parent in ${langPrompt}. 
          Mention if the growth trend appears to be following a consistent percentile curve.
          IMPORTANT: Do not provide alarming medical advice. Frame the analysis in a positive and supportive tone. This is for general informational purposes only.
          Example Tone: "Your child's growth is progressing steadily, following along their own percentile curve, which is a wonderful sign."
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
        // FIX: Updated error message to remove mention of API key.
        return language === 'mm' 
            ? "ကွန်ရက်ချိတ်ဆက်မှု အမှားရှိနေပါသည်။" 
            : "Connection error. Please try again.";
    }
}