const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Razorpay = require("razorpay");
const crypto = require("crypto");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const FREE_ANALYSIS_LIMIT = 3;
const PREMIUM_AMOUNT = Number(process.env.PREMIUM_AMOUNT) || 19900;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const roleLabels = {
  fresher: "Fresher General",
  "it-support": "IT Support",
  "project-coordinator": "Project Coordinator",
  "customer-support": "Customer Support",
  "data-analyst": "Data Analyst",
};

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.log("MONGO_URI is missing in .env file");
      return;
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.log("MongoDB connection failed");
    console.log(error.message);
  }
};

connectDB();

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    plan: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    analysisCount: {
      type: Number,
      default: 0,
    },
    analysisLimit: {
      type: Number,
      default: FREE_ANALYSIS_LIMIT,
    },
    premiumActivatedAt: {
      type: Date,
      default: null,
    },
    lastPaymentId: {
      type: String,
      default: "",
    },
    lastOrderId: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

const analysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetRole: {
      type: String,
      required: true,
    },
    atsScore: {
      type: Number,
      required: true,
    },
    matchedSkills: {
      type: [String],
      default: [],
    },
    missingSkills: {
      type: [String],
      default: [],
    },
    suggestions: {
      type: [String],
      default: [],
    },
    roadmap: {
      type: [String],
      default: [],
    },
    interviewQuestions: {
      type: [String],
      default: [],
    },
    skillGapPlan: {
      type: [String],
      default: [],
    },
    resumeDna: {
      profileStrength: {
        type: Number,
        default: 0,
      },
      keywordStrength: {
        type: Number,
        default: 0,
      },
      skillsMatch: {
        type: Number,
        default: 0,
      },
      experienceQuality: {
        type: Number,
        default: 0,
      },
      projectStrength: {
        type: Number,
        default: 0,
      },
      communicationQuality: {
        type: Number,
        default: 0,
      },
      recruiterReadiness: {
        type: Number,
        default: 0,
      },
      summary: {
        type: String,
        default: "",
      },
    },
    mockInterview: {
      hrQuestions: {
        type: [String],
        default: [],
      },
      roleQuestions: {
        type: [String],
        default: [],
      },
      technicalQuestions: {
        type: [String],
        default: [],
      },
      answerApproach: {
        type: [String],
        default: [],
      },
      preparationPlan: {
        type: [String],
        default: [],
      },
    },
    jobDescription: {
      type: String,
      default: "",
    },
    jobMatchScore: {
      type: Number,
      default: 0,
    },
    jdMatchedKeywords: {
      type: [String],
      default: [],
    },
    jdMissingKeywords: {
      type: [String],
      default: [],
    },
    jdGapSummary: {
      type: String,
      default: "",
    },
    roleFitSummary: {
      type: String,
      default: "",
    },
    jdFixes: {
      type: [String],
      default: [],
    },
    resumeRewrite: {
      professionalSummary: {
        type: String,
        default: "",
      },
      optimizedSkills: {
        type: [String],
        default: [],
      },
      resumeBullets: {
        type: [String],
        default: [],
      },
      projectBullets: {
        type: [String],
        default: [],
      },
      linkedinHeadline: {
        type: String,
        default: "",
      },
      coverNote: {
        type: String,
        default: "",
      },
      improvementTips: {
        type: [String],
        default: [],
      },
    },
    resumeText: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Analysis = mongoose.model("Analysis", analysisSchema);

const createToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "careerpilot_secret", {
    expiresIn: "7d",
  });
};

const getUserResponse = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    plan: user.plan || "free",
    analysisCount: user.analysisCount || 0,
    analysisLimit: user.plan === "premium" ? "unlimited" : FREE_ANALYSIS_LIMIT,
    remainingAnalyses:
      user.plan === "premium"
        ? "unlimited"
        : Math.max(FREE_ANALYSIS_LIMIT - (user.analysisCount || 0), 0),
    premiumActivatedAt: user.premiumActivatedAt,
  };
};

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please login first.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "careerpilot_secret"
    );

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please login again.",
    });
  }
};

const verifyRazorpaySignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature.length !== razorpaySignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(razorpaySignature)
  );
};

const clampScore = (score) => {
  return Math.max(0, Math.min(100, Math.round(score)));
};

const hasAnyKeyword = (resumeLower, keywords) => {
  return keywords.some((keyword) => resumeLower.includes(keyword));
};

const calculateResumeDna = ({
  resumeLower,
  atsScore,
  matchedSkills,
  missingSkills,
}) => {
  const hasSummary = hasAnyKeyword(resumeLower, [
    "summary",
    "profile",
    "objective",
    "career objective",
  ]);

  const hasSkills = hasAnyKeyword(resumeLower, [
    "skills",
    "technical skills",
    "core skills",
  ]);

  const hasExperience = hasAnyKeyword(resumeLower, [
    "experience",
    "work experience",
    "employment",
    "internship",
  ]);

  const hasProject = hasAnyKeyword(resumeLower, [
    "project",
    "projects",
    "portfolio",
    "case study",
  ]);

  const hasAchievement = hasAnyKeyword(resumeLower, [
    "achievement",
    "achievements",
    "award",
    "awards",
    "recognition",
    "improved",
    "reduced",
    "increased",
  ]);

  const hasEducation = hasAnyKeyword(resumeLower, [
    "education",
    "degree",
    "college",
    "university",
    "school",
  ]);

  const hasNumbers = /\b\d+(\.\d+)?%?\b/.test(resumeLower);

  const hasActionWords = hasAnyKeyword(resumeLower, [
    "managed",
    "handled",
    "coordinated",
    "supported",
    "resolved",
    "developed",
    "built",
    "created",
    "analyzed",
    "reported",
    "implemented",
    "improved",
  ]);

  const hasCommunicationSignals = hasAnyKeyword(resumeLower, [
    "communication",
    "stakeholder",
    "customer",
    "client",
    "presentation",
    "reporting",
    "team",
    "leadership",
  ]);

  const skillsTotal = matchedSkills.length + missingSkills.length;

  const profileStrength = clampScore(
    (hasSummary ? 20 : 0) +
      (hasSkills ? 20 : 0) +
      (hasExperience ? 20 : 0) +
      (hasProject ? 15 : 0) +
      (hasAchievement ? 15 : 0) +
      (hasEducation ? 10 : 0)
  );

  const keywordStrength = clampScore(atsScore);

  const skillsMatch = clampScore(
    skillsTotal > 0 ? (matchedSkills.length / skillsTotal) * 100 : 0
  );

  const experienceQuality = clampScore(
    (hasExperience ? 30 : 0) +
      (hasActionWords ? 25 : 0) +
      (hasNumbers ? 25 : 0) +
      (hasAchievement ? 20 : 0)
  );

  const projectStrength = clampScore(
    (hasProject ? 45 : 0) +
      (hasActionWords ? 20 : 0) +
      (hasNumbers ? 15 : 0) +
      (matchedSkills.length >= 3 ? 20 : matchedSkills.length * 6)
  );

  const communicationQuality = clampScore(
    (hasCommunicationSignals ? 40 : 0) +
      (hasSummary ? 20 : 0) +
      (hasActionWords ? 20 : 0) +
      (resumeLower.length > 800 ? 20 : 10)
  );

  const recruiterReadiness = clampScore(
    (profileStrength +
      keywordStrength +
      skillsMatch +
      experienceQuality +
      projectStrength +
      communicationQuality) /
      6
  );

  let summary =
    "Your resume has potential, but it needs stronger role-specific positioning.";

  if (recruiterReadiness >= 75) {
    summary =
      "Your resume is strong and recruiter-friendly. Focus on polishing achievements, numbers, and interview preparation.";
  } else if (recruiterReadiness >= 50) {
    summary =
      "Your resume has a good base. Improve role-specific keywords, measurable achievements, and project clarity.";
  }

  return {
    profileStrength,
    keywordStrength,
    skillsMatch,
    experienceQuality,
    projectStrength,
    communicationQuality,
    recruiterReadiness,
    summary,
  };
};

const createMockInterviewCoach = ({
  selectedRole,
  matchedSkills,
  missingSkills,
  atsScore,
}) => {
  const roleName = roleLabels[selectedRole] || "Fresher General";

  const hrQuestions = [
    "Tell me about yourself in 60 seconds.",
    "Why are you interested in this role?",
    "What are your top strengths for this role?",
    "Tell me about a challenge you faced and how you handled it.",
    "Why should we hire you over other candidates?",
  ];

  const roleQuestionsByRole = {
    fresher: [
      "How will you quickly learn new tasks in your first job?",
      "Tell me about a college project or assignment you completed.",
      "How do you handle feedback from seniors or managers?",
      "How do you manage deadlines when multiple tasks are assigned?",
      "What skills are you currently improving for your career?",
    ],
    "it-support": [
      "How would you troubleshoot a laptop that is running slowly?",
      "How would you handle a user who cannot connect to Wi-Fi?",
      "How do you prioritize multiple support tickets?",
      "How would you explain a technical issue to a non-technical customer?",
      "What steps would you follow before escalating an issue?",
    ],
    "project-coordinator": [
      "How do you track project progress and pending tasks?",
      "How would you handle a project delay?",
      "How do you communicate status updates to stakeholders?",
      "How would you coordinate with multiple teams at the same time?",
      "What project tracking tools or methods do you know?",
    ],
    "customer-support": [
      "How would you handle an angry customer?",
      "How do you manage repeated customer complaints?",
      "How would you improve customer satisfaction?",
      "How do you handle escalation cases?",
      "What does excellent customer service mean to you?",
    ],
    "data-analyst": [
      "How do you clean messy data before analysis?",
      "How would you explain insights from a dashboard to a manager?",
      "What is the difference between Excel and SQL?",
      "How do you decide which chart to use for a report?",
      "Tell me about a dataset you would like to analyze.",
    ],
  };

  const technicalQuestionsByRole = {
    fresher: [
      "What basic tools are you comfortable using for work?",
      "How do you use Excel or spreadsheets?",
      "What is your approach to learning a new software tool?",
      "How do you organize your tasks during the day?",
      "What is one project you can explain clearly from start to finish?",
    ],
    "it-support": [
      "What is the difference between hardware and software?",
      "What is an IP address?",
      "What is the difference between LAN and Wi-Fi?",
      "What would you check if a printer is not working?",
      "What is the purpose of a ticketing system?",
    ],
    "project-coordinator": [
      "What is a project milestone?",
      "What is the difference between a task and a deliverable?",
      "How do you prepare a project status report?",
      "What is risk tracking in project management?",
      "What is stakeholder communication?",
    ],
    "customer-support": [
      "What is a CRM tool?",
      "What is ticket resolution time?",
      "What is customer satisfaction score?",
      "How do you document a customer issue?",
      "What is the difference between first-level and second-level support?",
    ],
    "data-analyst": [
      "What is a pivot table?",
      "What is SQL used for?",
      "What is data cleaning?",
      "What is Power BI used for?",
      "What is the difference between a table and a dashboard?",
    ],
  };

  const roleQuestions =
    roleQuestionsByRole[selectedRole] || roleQuestionsByRole.fresher;

  const technicalQuestions =
    technicalQuestionsByRole[selectedRole] || technicalQuestionsByRole.fresher;

  const strongestSkills =
    matchedSkills.length > 0
      ? matchedSkills.slice(0, 4).join(", ")
      : "communication, learning ability, and problem solving";

  const priorityGaps =
    missingSkills.length > 0
      ? missingSkills.slice(0, 5).join(", ")
      : "role-specific examples and measurable achievements";

  const answerApproach = [
    "Use the STAR method: Situation, Task, Action, Result.",
    `For ${roleName}, connect every answer to these strengths: ${strongestSkills}.`,
    "Prepare examples that prove your skills instead of only saying you have them.",
    `When asked about weakness or gaps, mention that you are actively improving: ${priorityGaps}.`,
    "End important answers with a measurable outcome, learning, or business impact.",
  ];

  const preparationPlan = [
    "Prepare a 60-second self-introduction.",
    "Write 3 examples from your resume using the STAR method.",
    "Practice the HR questions aloud at least 3 times.",
    "Revise the missing skills and add them naturally to your resume.",
    "Prepare one project or work example that matches the selected role.",
  ];

  if (atsScore < 50) {
    preparationPlan.unshift(
      "Before interviews, strengthen your resume because the current ATS score is low."
    );
  }

  return {
    hrQuestions,
    roleQuestions,
    technicalQuestions,
    answerApproach,
    preparationPlan,
  };
};

const extractJobKeywords = (jobDescription) => {
  if (!jobDescription || jobDescription.trim() === "") {
    return [];
  }

  const jdLower = jobDescription.toLowerCase();

  const priorityKeywords = [
    "communication",
    "teamwork",
    "problem solving",
    "leadership",
    "excel",
    "power bi",
    "sql",
    "python",
    "data analysis",
    "dashboard",
    "reporting",
    "customer service",
    "technical support",
    "troubleshooting",
    "hardware",
    "software",
    "networking",
    "ticketing",
    "project management",
    "coordination",
    "stakeholder",
    "planning",
    "tracking",
    "operations",
    "crm",
    "escalation",
    "presentation",
    "documentation",
    "analytics",
    "microsoft office",
    "windows",
    "process improvement",
    "vendor management",
    "client handling",
    "time management",
  ];

  const matchedPriorityKeywords = priorityKeywords.filter((keyword) =>
    jdLower.includes(keyword)
  );

  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "you",
    "your",
    "are",
    "our",
    "will",
    "this",
    "that",
    "from",
    "have",
    "has",
    "job",
    "role",
    "work",
    "team",
    "company",
    "candidate",
    "candidates",
    "responsibilities",
    "responsibility",
    "required",
    "requirements",
    "skills",
    "skill",
    "experience",
    "year",
    "years",
    "good",
    "strong",
    "basic",
    "ability",
    "knowledge",
    "using",
    "use",
    "must",
    "should",
    "need",
    "needs",
    "preferred",
    "qualification",
    "qualifications",
    "about",
    "into",
    "within",
    "across",
    "daily",
    "weekly",
    "monthly",
    "including",
    "etc",
    "other",
    "more",
    "such",
    "their",
    "them",
    "they",
    "when",
    "where",
    "what",
    "how",
    "who",
    "can",
    "able",
    "based",
    "related",
  ]);

  const words = jdLower
    .replace(/[^a-z0-9\s+#.]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4 && !stopWords.has(word));

  const frequency = {};

  words.forEach((word) => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  const frequentWords = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .filter((word) => !matchedPriorityKeywords.includes(word))
    .slice(0, 14);

  return Array.from(new Set([...matchedPriorityKeywords, ...frequentWords]))
    .slice(0, 24)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
};

const analyzeJobDescriptionMatch = ({ resumeLower, jobDescription }) => {
  if (!jobDescription || jobDescription.trim() === "") {
    return {
      jobDescription: "",
      jobMatchScore: 0,
      jdMatchedKeywords: [],
      jdMissingKeywords: [],
      jdGapSummary:
        "No job description was added. Paste a job description to compare your resume with a real job opening.",
      roleFitSummary:
        "Role fit analysis is not available because no job description was provided.",
      jdFixes: [
        "Paste a job description from LinkedIn, Naukri, Indeed, or a company careers page.",
        "Run the analysis again to get a direct resume vs job match score.",
      ],
    };
  }

  const jdKeywords = extractJobKeywords(jobDescription);

  const jdMatchedKeywords = jdKeywords.filter((keyword) =>
    resumeLower.includes(keyword.toLowerCase())
  );

  const jdMissingKeywords = jdKeywords.filter(
    (keyword) => !resumeLower.includes(keyword.toLowerCase())
  );

  const jobMatchScore = clampScore(
    jdKeywords.length > 0
      ? (jdMatchedKeywords.length / jdKeywords.length) * 100
      : 0
  );

  let jdGapSummary =
    "Your resume needs stronger alignment with this job description. Add important missing keywords and role-specific examples before applying.";

  let roleFitSummary =
    "Current role fit is low. The resume should be tailored more closely to the job description.";

  if (jobMatchScore >= 75) {
    jdGapSummary =
      "Your resume is strongly aligned with this job description. Focus on polishing achievements and adding measurable impact.";
    roleFitSummary =
      "Strong role fit. Your resume already contains many of the keywords and signals expected for this job.";
  } else if (jobMatchScore >= 50) {
    jdGapSummary =
      "Your resume is partially aligned with this job description. Add missing keywords, responsibilities, and role-specific achievements.";
    roleFitSummary =
      "Moderate role fit. Your resume has some relevant signals but needs stronger job-specific positioning.";
  }

  const topMissing = jdMissingKeywords.slice(0, 6);

  const jdFixes = [
    topMissing.length > 0
      ? `Add these missing JD keywords naturally: ${topMissing.join(", ")}.`
      : "Your resume already includes the main JD keywords. Improve achievements and clarity.",
    "Rewrite your professional summary to match the job description.",
    "Add 2 to 3 bullet points that prove experience related to the job responsibilities.",
    "Include measurable numbers, results, or impact wherever possible.",
    "Update your skills section with the most relevant JD keywords.",
    "Remove generic wording and make your resume specific to this job opening.",
  ];

  return {
    jobDescription,
    jobMatchScore,
    jdMatchedKeywords,
    jdMissingKeywords,
    jdGapSummary,
    roleFitSummary,
    jdFixes,
  };
};

const createResumeRewrite = ({
  selectedRole,
  matchedSkills,
  missingSkills,
  jdMatchedKeywords,
  jdMissingKeywords,
  atsScore,
  jobMatchScore,
  resumeDna,
}) => {
  const roleName = roleLabels[selectedRole] || "Fresher General";

  const strongestSkills =
    matchedSkills.length > 0
      ? matchedSkills.slice(0, 5)
      : ["communication", "learning ability", "problem solving"];

  const jdRelevantSkills =
    jdMatchedKeywords && jdMatchedKeywords.length > 0
      ? jdMatchedKeywords.slice(0, 6)
      : strongestSkills;

  const missingFocus =
    jdMissingKeywords && jdMissingKeywords.length > 0
      ? jdMissingKeywords.slice(0, 5)
      : missingSkills.slice(0, 5);

  const combinedSkills = Array.from(
    new Set([...strongestSkills, ...jdRelevantSkills, ...missingFocus])
  )
    .filter(Boolean)
    .slice(0, 12);

  const readinessText =
    resumeDna && resumeDna.recruiterReadiness >= 75
      ? "strong recruiter readiness"
      : resumeDna && resumeDna.recruiterReadiness >= 50
      ? "developing recruiter readiness"
      : "early-stage recruiter readiness";

  const professionalSummary = `Motivated ${roleName} candidate with ${readinessText}, practical exposure to ${strongestSkills.join(
    ", "
  )}, and a strong interest in solving real business problems. Skilled in learning quickly, coordinating tasks, communicating clearly, and improving day-to-day execution. Seeking an opportunity to contribute to a growth-focused team while strengthening role-specific skills and delivering measurable value.`;

  const optimizedSkills = combinedSkills;

  const resumeBullets = [
    `Applied ${strongestSkills[0] || "communication"} and ${
      strongestSkills[1] || "problem solving"
    } skills to support daily tasks, improve clarity, and complete assigned responsibilities on time.`,
    `Coordinated with team members and stakeholders to track progress, document updates, and maintain smooth execution of assigned work.`,
    `Used ${
      strongestSkills.includes("excel") ? "Excel" : "structured reporting"
    } to organize information, prepare updates, and support better decision-making.`,
    `Improved resume alignment by focusing on role-specific keywords such as ${combinedSkills
      .slice(0, 5)
      .join(", ")}.`,
    `Demonstrated willingness to learn new tools, handle feedback, and build practical skills required for ${roleName} opportunities.`,
  ];

  const projectBullets = [
    `Built a role-focused project demonstrating ${combinedSkills
      .slice(0, 4)
      .join(", ")} and practical problem-solving ability.`,
    `Created structured documentation, task tracking, and reporting outputs to show clear understanding of workflow execution.`,
    `Analyzed project requirements, identified gaps, and improved the final output using feedback and measurable improvements.`,
    `Presented the project outcome clearly with objective, tools used, responsibilities handled, and learning outcomes.`,
  ];

  const linkedinHeadline = `${roleName} Aspirant | ${combinedSkills
    .slice(0, 4)
    .join(" | ")} | Resume & Interview Ready`;

  const coverNote = `Dear Hiring Team, I am interested in the ${roleName} opportunity. My resume highlights relevant strengths in ${strongestSkills
    .slice(0, 4)
    .join(
      ", "
    )}, along with a strong willingness to learn, adapt, and contribute to team goals. I am particularly focused on improving ${missingFocus
    .slice(0, 3)
    .join(
      ", "
    )} to better match the role requirements. I would appreciate the opportunity to discuss how my skills and learning mindset can support your team.`;

  const improvementTips = [
    atsScore < 50
      ? "Add more target-role keywords because your ATS score is currently low."
      : "Keep your role keywords visible in the summary, skills, and experience sections.",
    jobMatchScore > 0 && jobMatchScore < 50
      ? "Tailor your resume more closely to the job description before applying."
      : "Use the JD match section to fine-tune keywords for each job application.",
    "Add numbers wherever possible, such as volume handled, percentage improved, time saved, or tasks completed.",
    "Rewrite generic responsibilities into achievement-based bullet points.",
    "Add at least one project that proves your skills for the selected role.",
    "Keep your LinkedIn headline aligned with the same role and keywords used in your resume.",
  ];

  return {
    professionalSummary,
    optimizedSkills,
    resumeBullets,
    projectBullets,
    linkedinHeadline,
    coverNote,
    improvementTips,
  };
};

app.get("/", (req, res) => {
  res.send("HireNexa AI Backend is running");
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "HireNexa AI Backend connected successfully",
  });
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists. Please login.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      plan: "free",
      analysisCount: 0,
      analysisLimit: FREE_ANALYSIS_LIMIT,
    });

    const token = createToken(user._id);

    res.status(201).json({
      success: true,
      message: "Signup successful.",
      token,
      user: getUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Signup failed.",
      error: error.message,
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.plan) {
      user.plan = "free";
    }

    if (typeof user.analysisCount !== "number") {
      user.analysisCount = 0;
    }

    if (!user.analysisLimit) {
      user.analysisLimit = FREE_ANALYSIS_LIMIT;
    }

    await user.save();

    const token = createToken(user._id);

    res.json({
      success: true,
      message: "Login successful.",
      token,
      user: getUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Login failed.",
      error: error.message,
    });
  }
});

app.get("/api/auth/me", protect, async (req, res) => {
  res.json({
    success: true,
    user: getUserResponse(req.user),
  });
});

app.post("/api/user/upgrade-demo", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    user.plan = "premium";
    user.analysisLimit = 999999;
    user.premiumActivatedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: "Demo upgrade successful. User is now premium.",
      user: getUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Upgrade failed.",
      error: error.message,
    });
  }
});

app.post("/api/payment/create-order", protect, async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Razorpay keys are missing in .env file.",
      });
    }

    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    if (currentUser.plan === "premium") {
      return res.json({
        success: true,
        alreadyPremium: true,
        message: "You are already a Premium user.",
        user: getUserResponse(currentUser),
      });
    }

    const order = await razorpay.orders.create({
      amount: PREMIUM_AMOUNT,
      currency: "INR",
      receipt: `hn_${Date.now()}`,
      notes: {
        userId: currentUser._id.toString(),
        email: currentUser.email,
        plan: "premium",
        product: "HireNexa AI Premium",
      },
    });

    res.json({
      success: true,
      message: "Razorpay order created successfully.",
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "HireNexa AI Premium",
      description: "Unlimited resume analysis and PDF report download",
      prefill: {
        name: currentUser.name,
        email: currentUser.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order.",
      error: error.message,
    });
  }
});

app.post("/api/payment/verify", protect, async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Razorpay secret is missing in .env file.",
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are missing.",
      });
    }

    const isValidPayment = verifyRazorpaySignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    if (!isValidPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid signature.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    user.plan = "premium";
    user.analysisLimit = 999999;
    user.premiumActivatedAt = new Date();
    user.lastPaymentId = razorpay_payment_id;
    user.lastOrderId = razorpay_order_id;

    await user.save();

    res.json({
      success: true,
      message: "Payment verified successfully. Premium activated.",
      user: getUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Payment verification failed.",
      error: error.message,
    });
  }
});

app.post(
  "/api/upload-resume",
  protect,
  upload.single("resume"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please upload a resume PDF file.",
        });
      }

      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({
          success: false,
          message: "Only PDF files are supported right now.",
        });
      }

      const pdfData = await pdfParse(req.file.buffer);

      if (!pdfData.text || pdfData.text.trim() === "") {
        return res.status(400).json({
          success: false,
          message:
            "Could not extract text from this PDF. Please try another PDF.",
        });
      }

      res.json({
        success: true,
        message: "Resume text extracted successfully.",
        text: pdfData.text,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to read PDF file.",
      });
    }
  }
);

app.post("/api/analyze-resume", protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    if (!currentUser.plan) {
      currentUser.plan = "free";
    }

    if (typeof currentUser.analysisCount !== "number") {
      currentUser.analysisCount = 0;
    }

    if (
      currentUser.plan === "free" &&
      currentUser.analysisCount >= FREE_ANALYSIS_LIMIT
    ) {
      return res.status(403).json({
        success: false,
        limitReached: true,
        message:
          "Free plan limit reached. Upgrade to Premium for unlimited resume analysis.",
        user: getUserResponse(currentUser),
      });
    }

    const { resumeText, targetRole, jobDescription } = req.body;

    if (!resumeText || resumeText.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Resume text is required",
      });
    }

    const roleSkills = {
      fresher: [
        "communication",
        "teamwork",
        "problem solving",
        "leadership",
        "excel",
        "learning",
        "presentation",
        "project",
        "skills",
        "achievement",
      ],
      "it-support": [
        "technical support",
        "troubleshooting",
        "hardware",
        "software",
        "networking",
        "ticketing",
        "customer service",
        "windows",
        "excel",
        "communication",
      ],
      "project-coordinator": [
        "project management",
        "coordination",
        "reporting",
        "stakeholder",
        "excel",
        "communication",
        "planning",
        "tracking",
        "operations",
        "team management",
      ],
      "customer-support": [
        "customer service",
        "communication",
        "problem solving",
        "crm",
        "ticketing",
        "customer satisfaction",
        "support",
        "escalation",
        "reporting",
        "teamwork",
      ],
      "data-analyst": [
        "excel",
        "sql",
        "data analysis",
        "power bi",
        "dashboard",
        "reporting",
        "python",
        "statistics",
        "visualization",
        "problem solving",
      ],
    };

    const careerRoadmaps = {
      fresher: [
        "Improve communication and resume presentation.",
        "Build one small project related to your target field.",
        "Learn Excel, email writing, and interview basics.",
        "Create a strong LinkedIn profile.",
        "Apply daily to internships and entry-level jobs.",
      ],
      "it-support": [
        "Learn Windows operating system basics.",
        "Understand hardware, software, and basic networking.",
        "Practice troubleshooting common laptop, printer, and network issues.",
        "Learn ticketing tools and customer support process.",
        "Prepare for IT support interview questions.",
      ],
      "project-coordinator": [
        "Learn project management fundamentals.",
        "Practice Excel reporting and task tracking.",
        "Understand stakeholder communication.",
        "Learn tools like Trello, Jira, Asana, or MS Project.",
        "Build a sample project coordination case study.",
      ],
      "customer-support": [
        "Improve communication and customer handling skills.",
        "Learn CRM and ticketing process.",
        "Practice escalation handling and complaint resolution.",
        "Understand customer satisfaction metrics.",
        "Prepare for customer support interview scenarios.",
      ],
      "data-analyst": [
        "Master Excel formulas, pivot tables, and charts.",
        "Learn SQL basics for database queries.",
        "Build dashboards using Power BI.",
        "Practice data cleaning and reporting.",
        "Create 2 portfolio projects using real datasets.",
      ],
    };

    const interviewQuestions = {
      fresher: [
        "Tell me about yourself.",
        "Why should we hire you as a fresher?",
        "What are your strengths and weaknesses?",
        "Tell me about a project or assignment you completed.",
        "Where do you see yourself in the next 2 years?",
      ],
      "it-support": [
        "What is troubleshooting?",
        "How do you handle a customer facing a laptop issue?",
        "What is the difference between hardware and software?",
        "What steps would you take if the internet is not working?",
        "How do you handle multiple support tickets at the same time?",
      ],
      "project-coordinator": [
        "What is project coordination?",
        "How do you track project progress?",
        "How do you handle delays in a project?",
        "How do you communicate with stakeholders?",
        "What tools can be used for project tracking?",
      ],
      "customer-support": [
        "How do you handle an angry customer?",
        "What does good customer service mean to you?",
        "How do you handle escalation?",
        "How do you improve customer satisfaction?",
        "How do you manage repetitive customer issues?",
      ],
      "data-analyst": [
        "What is data analysis?",
        "What is the difference between Excel and SQL?",
        "What is a dashboard?",
        "How do you clean messy data?",
        "What is the use of Power BI?",
      ],
    };

    const selectedRole = targetRole || "fresher";
    const requiredSkills = roleSkills[selectedRole] || roleSkills.fresher;
    const roadmap = careerRoadmaps[selectedRole] || careerRoadmaps.fresher;
    const questions =
      interviewQuestions[selectedRole] || interviewQuestions.fresher;

    const resumeLower = resumeText.toLowerCase();

    const matchedSkills = requiredSkills.filter((skill) =>
      resumeLower.includes(skill)
    );

    const missingSkills = requiredSkills.filter(
      (skill) => !resumeLower.includes(skill)
    );

    const atsScore = Math.round(
      (matchedSkills.length / requiredSkills.length) * 100
    );

    const suggestions = [];

    if (!resumeLower.includes("summary")) {
      suggestions.push("Add a professional summary at the top of your resume.");
    }

    if (!resumeLower.includes("skills")) {
      suggestions.push("Add a separate skills section for better ATS matching.");
    }

    if (!resumeLower.includes("project")) {
      suggestions.push("Add project experience related to your target role.");
    }

    if (!resumeLower.includes("achievement")) {
      suggestions.push("Add achievements with numbers, results, or impact.");
    }

    if (atsScore < 50) {
      suggestions.push(
        "Your resume needs more keywords related to the selected job role."
      );
    } else if (atsScore < 75) {
      suggestions.push(
        "Your resume is decent, but you should add more role-specific skills."
      );
    } else {
      suggestions.push("Your resume has good keyword matching for this role.");
    }

    const skillGapPlan = [
      "Focus on the missing skills listed in your result.",
      "Add role-specific keywords naturally in your resume.",
      "Build one small project related to your selected job role.",
      "Practice the interview questions generated above.",
      "Update your LinkedIn profile with matching skills and project details.",
    ];

    const resumeDna = calculateResumeDna({
      resumeLower,
      atsScore,
      matchedSkills,
      missingSkills,
    });

    const mockInterview = createMockInterviewCoach({
      selectedRole,
      matchedSkills,
      missingSkills,
      atsScore,
    });

    const jdAnalysis = analyzeJobDescriptionMatch({
      resumeLower,
      jobDescription,
    });

    const resumeRewrite = createResumeRewrite({
      selectedRole,
      matchedSkills,
      missingSkills,
      jdMatchedKeywords: jdAnalysis.jdMatchedKeywords,
      jdMissingKeywords: jdAnalysis.jdMissingKeywords,
      atsScore,
      jobMatchScore: jdAnalysis.jobMatchScore,
      resumeDna,
    });

    const savedAnalysis = await Analysis.create({
      user: currentUser._id,
      targetRole: selectedRole,
      atsScore,
      matchedSkills,
      missingSkills,
      suggestions,
      roadmap,
      interviewQuestions: questions,
      skillGapPlan,
      resumeDna,
      mockInterview,
      jobDescription: jdAnalysis.jobDescription,
      jobMatchScore: jdAnalysis.jobMatchScore,
      jdMatchedKeywords: jdAnalysis.jdMatchedKeywords,
      jdMissingKeywords: jdAnalysis.jdMissingKeywords,
      jdGapSummary: jdAnalysis.jdGapSummary,
      roleFitSummary: jdAnalysis.roleFitSummary,
      jdFixes: jdAnalysis.jdFixes,
      resumeRewrite,
      resumeText,
    });

    currentUser.analysisCount += 1;
    await currentUser.save();

    res.json({
      success: true,
      message: "Resume analyzed and saved successfully.",
      analysisId: savedAnalysis._id,
      targetRole: selectedRole,
      atsScore,
      matchedSkills,
      missingSkills,
      suggestions,
      roadmap,
      interviewQuestions: questions,
      skillGapPlan,
      resumeDna,
      mockInterview,
      jobDescription: jdAnalysis.jobDescription,
      jobMatchScore: jdAnalysis.jobMatchScore,
      jdMatchedKeywords: jdAnalysis.jdMatchedKeywords,
      jdMissingKeywords: jdAnalysis.jdMissingKeywords,
      jdGapSummary: jdAnalysis.jdGapSummary,
      roleFitSummary: jdAnalysis.roleFitSummary,
      jdFixes: jdAnalysis.jdFixes,
      resumeRewrite,
      user: getUserResponse(currentUser),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Resume analysis failed.",
      error: error.message,
    });
  }
});

app.get("/api/analysis-history", protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);

    const historyLimit = currentUser.plan === "premium" ? 50 : 3;

    const history = await Analysis.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(historyLimit)
      .select("-resumeText -user -jobDescription");

    res.json({
      success: true,
      count: history.length,
      plan: currentUser.plan || "free",
      history,
      user: getUserResponse(currentUser),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch analysis history.",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`HireNexa AI Backend running on http://localhost:${PORT}`);
});