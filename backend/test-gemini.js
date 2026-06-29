const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

async function testGemini() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log("❌ GEMINI_API_KEY missing in .env file");
      return;
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents:
        "Generate 3 interview questions for a fresher applying for an IT support role.",
    });

    console.log("✅ Gemini API working successfully:");
    console.log(response.text);
  } catch (error) {
    console.log("❌ Gemini API test failed:");
    console.log(error.message);
  }
}

testGemini();