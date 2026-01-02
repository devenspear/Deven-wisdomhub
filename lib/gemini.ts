import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

function getGeminiModel() {
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined in the environment variables");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
        model: "gemini-1.5-pro"
    });
}

export async function generateContent(prompt: string) {
    try {
        const model = getGeminiModel();
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating content:", error);
        throw error;
    }
}
