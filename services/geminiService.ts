// @google/genai Guidelines Implementation:
// - Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
// - Use ai.models.generateContent/generateContentStream directly.
// - Use response.text (property, not method).
// - Do not provide UI for API key management.

import { GoogleGenAI } from "@google/genai";
import { Language, GrowthData } from '../types';

export const generateBedtimeStoryStream = async (topic: string, childName: string, language: Language) => {
  try {
    // Initialize the client directly using the injected environment variable.
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
    throw error;
  }
};

export const analyzeGrowthData = async (data: GrowthData[], language: Language): Promise<string> => {
    try {
        // Initialize the client directly using the injected environment variable right before the call.
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

        // Correctly accessing the text property from the response object.
        return response.text || (language === 'mm' ? "အချက်အလက်များကို ဆန်းစစ်မရနိုင်ပါ။" : "Could not analyze data.");
    } catch (error) {
        console.error("Error analyzing growth:", error);
        return language === 'mm' 
            ? "ကွန်ဟက်ချိတ်ဆက်မှု သို့မဟုတ် API အမှားရှိနေပါသည်။" 
            : "Connection or API error. Please try again.";
    }
}