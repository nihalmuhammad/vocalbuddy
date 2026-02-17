
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "../types";

export const generateSpeech = async (
  text: string, 
  voiceName: VoiceName, 
  language: 'en' | 'ml'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let targetText = text;

  // Step 1: Translation (if needed)
  // We use the faster flash model for translation to ensure the TTS model 
  // only handles the final target language, preventing 500 Internal Errors.
  if (language === 'ml') {
    try {
      const translationResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following English text to natural Malayalam. Output ONLY the translation, nothing else: "${text}"`,
        config: {
          temperature: 0.1, // Low temperature for consistent translation
        }
      });
      const translated = translationResponse.text?.trim();
      if (translated) {
        targetText = translated;
      }
    } catch (error) {
      console.warn("Translation failed, falling back to direct TTS request:", error);
      // If translation fails, we still attempt the TTS with a clearer prompt
      targetText = `Read the following in Malayalam: ${text}`;
    }
  }

  // Step 2: Speech Generation
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: targetText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
      throw new Error("The request was blocked or returned no results. Please try a different sentence.");
    }

    const audioPart = candidate.content.parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith('audio/'));
    const base64Audio = audioPart?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("The speech engine could not process this text. Please try again with simpler wording.");
    }

    return base64Audio;
  } catch (error: any) {
    // If it's a 500 error, suggest a retry as it's often transient
    if (error?.status === 500 || error?.message?.includes('500')) {
      throw new Error("Gemini server had a momentary hiccup (Error 500). Please tap 'Translate & Speak' again.");
    }
    throw error;
  }
};
