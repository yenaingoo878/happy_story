import { GoogleGenAI } from "@google/genai";
import { Language } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBedtimeStory = async (topic: string, childName: string, language: Language): Promise<string> => {
  try {
    const langPrompt = language === 'mm' ? 'Burmese language (Myanmar)' : 'English language';
    
    const prompt = `
      Create a short, gentle, and heartwarming bedtime story for a child named "${childName}" in ${langPrompt}.
      The story should be about: "${topic}".
      Keep the tone sweet, soothing, and suitable for young children. 
      Limit the story to about 150-200 words.
      Do not include markdown formatting or bold text, just plain text paragraphs.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }, // Disable thinking for faster simple creative writing
        temperature: 0.7,
      }
    });

    const errorMsg = language === 'mm' 
      ? "ပုံပြင်လေး ဖန်တီးလို့ မရသေးပါ... ခဏနေမှ ပြန်ကြိုးစားကြည့်ပေးပါ။"
      : "Could not generate story yet... please try again later.";

    return response.text || errorMsg;
  } catch (error) {
    console.error("Error generating story:", error);
    const connError = language === 'mm'
      ? "ဝမ်းနည်းပါတယ်။ အင်တာနက်လိုင်း အနည်းငယ် အဆင်မပြေဖြစ်နေပုံရပါတယ်။"
      : "Sorry, there seems to be a connection issue.";
    return connError;
  }
};