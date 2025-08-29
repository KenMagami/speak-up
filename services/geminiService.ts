
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { ExplanationResponse, ProblemPayload } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getExplanationAndAnswer(payload: ProblemPayload): Promise<ExplanationResponse> {
  const { problem, image } = payload;

  const systemInstruction = `あなたは親切で優秀な家庭教師です。与えられた問題の科目（数学、物理、論理など）を自動で判断し、中学生にも理解できるように、段階的かつ論理的に解説してください。解説のステップには最終的な答えを含めないでください。答えは finalAnswer フィールドにのみ記述してください。あなたの応答は、指定されたJSONスキーマに厳密に従う必要があります。`;

  const prompt = `以下の問題を解説してください：\n\n${problem}`;
  
  // FIX: Explicitly type the 'parts' array to allow both text and image objects.
  // This resolves a TypeScript error where the array was inferred to only contain text parts.
  const parts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [{ text: prompt }];

  if (image) {
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.data,
      },
    });
  }


  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts: parts },
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explanation: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "問題を解くためのステップバイステップの解説。各ステップは配列の1要素とします。この解説には最終的な答えは含めません。"
          },
          finalAnswer: {
            type: Type.STRING,
            description: "問題の最終的な答え。数値や数式のみを簡潔に記述します。"
          }
        },
        required: ["explanation", "finalAnswer"]
      }
    }
  });

  const jsonStr = response.text.trim();
  try {
    const parsed = JSON.parse(jsonStr);
    // Basic validation
    if (!parsed.explanation || !Array.isArray(parsed.explanation) || !parsed.finalAnswer) {
      throw new Error("Invalid JSON structure from AI.");
    }
    return parsed;
  } catch (e) {
    console.error("Failed to parse JSON response from Gemini:", jsonStr, e);
    throw new Error("AIからの応答を解析できませんでした。");
  }
}
