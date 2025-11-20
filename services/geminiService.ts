import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePropSvg = async (description: string) => {
  const prompt = `
    Create a simple, clean SVG path for a gym prop described as: "${description}".
    The path should be centered around 0,0.
    Return ONLY the SVG path data string (d attribute) and a suitable viewBox.
    Optimize for low node count.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            path: { type: Type.STRING, description: "The SVG d attribute string" },
            viewBox: { type: Type.STRING, description: "The viewBox attribute (e.g. '0 0 100 100')" },
            name: { type: Type.STRING, description: "A short name for the prop" }
          },
          required: ["path", "viewBox", "name"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating prop:", error);
    throw error;
  }
};