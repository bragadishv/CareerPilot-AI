const { GoogleGenAI } = require("@google/genai");

const extractJsonFromText = (text) => {
  const raw = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return raw;
  }

  return raw.slice(firstBrace, lastBrace + 1);
};

const safeParseJson = (text) => {
  try {
    return JSON.parse(extractJsonFromText(text));
  } catch (error) {
    return null;
  }
};

const normalizeQuestionList = (items = []) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.slice(0, 5).map((item) => {
    if (typeof item === "string") {
      return {
        question: item,
        whyAsked: "This checks your role understanding and communication clarity.",
        sampleAnswer:
          "I would answer using a clear example from my resume, explain the action I took, and end with the result or learning.",
      };
    }

    return {
      question: item.question || "Interview question not available.",
      whyAsked:
        item.whyAsked ||
        "This checks your role understanding and communication clarity.",
      sampleAnswer:
        item.sampleAnswer ||
        "I would answer using a clear example from my resume, explain the action I took, and end with the result or learning.",
    };
  });
};

const normalizeMockTest = (items = []) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.slice(0, 10).map((item, index) => {
    return {
      question: item.question || `Mock test question ${index + 1}`,
      options:
        Array.isArray(item.options) && item.options.length >= 4
          ? item.options.slice(0, 4)
          : ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: item.correctAnswer || "Option A",
      explanation:
        item.explanation ||
        "This answer is correct because it best matches the role requirement.",
    };
  });
};

const buildSafeFallback = ({ roleName, matchedSkills, missingSkills }) => {
  const role = roleName || "Fresher General";
  const strengths =
    matchedSkills.length > 0
      ? matchedSkills.slice(0, 4).join(", ")
      : "communication, learning ability, and problem solving";
  const gaps =
    missingSkills.length > 0
      ? missingSkills.slice(0, 4).join(", ")
      : "role-specific examples and measurable achievements";

  return {
    aiSummary: `Your interview readiness for ${role} is developing. Your visible strengths include ${strengths}. Improve ${gaps} before applying.`,
    hrQuestions: normalizeQuestionList([
      "Tell me about yourself.",
      "Why are you interested in this role?",
      "What are your strengths for this role?",
      "Tell me about a challenge you handled.",
      "Why should we hire you?",
    ]),
    roleQuestions: normalizeQuestionList([
      `What do you understand about the ${role} role?`,
      "How will you manage daily responsibilities in this role?",
      "How do your current skills match this role?",
      "What will you do if you face a task you do not know?",
      "How will you improve your missing skills?",
    ]),
    technicalQuestions: normalizeQuestionList([
      "What tools or platforms are you comfortable using?",
      "How do you organize work and track progress?",
      "How do you solve a problem step by step?",
      "How do you document your work?",
      "How do you learn a new technical process?",
    ]),
    mockTest: normalizeMockTest([
      {
        question: "What is the best way to answer an interview question?",
        options: [
          "Give a clear example",
          "Give a one-word answer",
          "Avoid details",
          "Say I do not know for everything",
        ],
        correctAnswer: "Give a clear example",
        explanation:
          "Clear examples prove your skill better than generic statements.",
      },
    ]),
    improvementPlan: [
      "Prepare a 60-second self-introduction.",
      "Write 3 resume-based examples using the STAR method.",
      "Revise missing skills and add them to your resume naturally.",
      "Practice role-based questions aloud.",
      "Prepare one project or work example for the selected role.",
    ],
  };
};

const generateGeminiMockInterview = async ({
  resumeText,
  targetRole,
  roleName,
  matchedSkills = [],
  missingSkills = [],
  jobDescription = "",
}) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing in backend .env file.");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const shortResume = String(resumeText || "").slice(0, 4500);
  const shortJD = String(jobDescription || "").slice(0, 2500);

  const prompt = `
You are HireNexa AI, an expert interview coach.

Create a live AI mock interview and mock test for this candidate.

Target Role: ${roleName || targetRole || "Fresher General"}

Matched Skills:
${matchedSkills.length ? matchedSkills.join(", ") : "Not available"}

Missing Skills:
${missingSkills.length ? missingSkills.join(", ") : "Not available"}

Resume Text:
${shortResume}

Job Description:
${shortJD || "No job description provided."}

Return only JSON object. No markdown. No extra text.

Required JSON:
{
  "aiSummary": "short summary",
  "hrQuestions": [
    {
      "question": "question text",
      "whyAsked": "why interviewer asks this",
      "sampleAnswer": "beginner friendly sample answer"
    }
  ],
  "roleQuestions": [
    {
      "question": "question text",
      "whyAsked": "why interviewer asks this",
      "sampleAnswer": "beginner friendly sample answer"
    }
  ],
  "technicalQuestions": [
    {
      "question": "question text",
      "whyAsked": "why interviewer asks this",
      "sampleAnswer": "beginner friendly sample answer"
    }
  ],
  "mockTest": [
    {
      "question": "multiple choice question",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": "correct option text",
      "explanation": "short explanation"
    }
  ],
  "improvementPlan": ["step 1", "step 2", "step 3", "step 4", "step 5"]
}

Rules:
- Exactly 5 HR questions.
- Exactly 5 role-based questions.
- Exactly 5 technical questions.
- Exactly 10 mock test questions.
- Keep answers practical and beginner-friendly.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });

  const parsed = safeParseJson(response.text);

  if (!parsed) {
    return buildSafeFallback({
      roleName,
      matchedSkills,
      missingSkills,
    });
  }

  return {
    aiSummary:
      parsed.aiSummary ||
      `Your interview readiness for ${roleName || "this role"} is developing.`,
    hrQuestions: normalizeQuestionList(parsed.hrQuestions),
    roleQuestions: normalizeQuestionList(parsed.roleQuestions),
    technicalQuestions: normalizeQuestionList(parsed.technicalQuestions),
    mockTest: normalizeMockTest(parsed.mockTest),
    improvementPlan: Array.isArray(parsed.improvementPlan)
      ? parsed.improvementPlan.slice(0, 5)
      : [
          "Prepare a 60-second self-introduction.",
          "Practice your resume examples.",
          "Revise your missing skills.",
          "Practice role-based questions.",
          "Prepare one project explanation.",
        ],
  };
};

module.exports = {
  generateGeminiMockInterview,
};