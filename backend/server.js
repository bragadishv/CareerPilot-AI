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

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.log("❌ MONGO_URI is missing in .env file");
      return;
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.log("❌ MongoDB connection failed");
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

app.get("/", (req, res) => {
  res.send("CareerPilot AI Backend is running 🚀");
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "CareerPilot AI Backend connected successfully",
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
      receipt: `cp_${Date.now()}`,
      notes: {
        userId: currentUser._id.toString(),
        email: currentUser.email,
        plan: "premium",
        product: "CareerPilot AI Premium",
      },
    });

    res.json({
      success: true,
      message: "Razorpay order created successfully.",
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "CareerPilot AI Premium",
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
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

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

    const { resumeText, targetRole } = req.body;

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
      .select("-resumeText -user");

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
  console.log(`CareerPilot AI Backend running on http://localhost:${PORT}`);
});