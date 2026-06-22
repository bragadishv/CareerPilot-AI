import { useEffect, useState } from "react";
import jsPDF from "jspdf";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function App() {
  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("fresher");
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const [authMode, setAuthMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [token, setToken] = useState(
    localStorage.getItem("careerpilot_token") || ""
  );

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("careerpilot_user");

    if (!savedUser) {
      return null;
    }

    try {
      return JSON.parse(savedUser);
    } catch (error) {
      return null;
    }
  });

  const roleLabels = {
    fresher: "Fresher General",
    "it-support": "IT Support",
    "project-coordinator": "Project Coordinator",
    "customer-support": "Customer Support",
    "data-analyst": "Data Analyst",
  };

  const isPremium = user?.plan === "premium";

  useEffect(() => {
    if (token) {
      fetchAnalysisHistory(token);
    }
  }, [token]);

  const saveUserData = (updatedUser) => {
    if (!updatedUser) {
      return;
    }

    setUser(updatedUser);
    localStorage.setItem("careerpilot_user", JSON.stringify(updatedUser));
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      alert("Please enter email and password.");
      return;
    }

    if (authMode === "signup" && !name.trim()) {
      alert("Please enter your name.");
      return;
    }

    try {
      setAuthLoading(true);

      const endpoint =
        authMode === "signup"
          ? `${API_BASE_URL}/api/auth/signup`
          : `${API_BASE_URL}/api/auth/login`;

      const payload =
        authMode === "signup"
          ? { name, email, password }
          : { email, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.message || "Authentication failed.");
        return;
      }

      localStorage.setItem("careerpilot_token", data.token);
      localStorage.setItem("careerpilot_user", JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);
      setName("");
      setEmail("");
      setPassword("");

      alert(data.message || "Login successful.");
    } catch (error) {
      alert("Authentication failed. Please check backend is running.");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("careerpilot_token");
    localStorage.removeItem("careerpilot_user");

    setToken("");
    setUser(null);
    setResult(null);
    setHistory([]);
    setResumeText("");
    setSelectedFile(null);

    alert("Logged out successfully.");
  };

  const fetchAnalysisHistory = async (authToken = token) => {
    if (!authToken) {
      return;
    }

    try {
      setHistoryLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/analysis-history`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setHistory(data.history || []);

        if (data.user) {
          saveUserData(data.user);
        }
      }
    } catch (error) {
      console.log("Failed to fetch analysis history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const existingScript = document.getElementById("razorpay-checkout-script");

      if (existingScript) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.id = "razorpay-checkout-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => {
        resolve(true);
      };

      script.onerror = () => {
        resolve(false);
      };

      document.body.appendChild(script);
    });
  };

  const upgradeToPremiumDemo = async () => {
    if (!token) {
      alert("Please login first.");
      return;
    }

    if (isPremium) {
      alert("You are already a Premium user.");
      return;
    }

    try {
      setUpgradeLoading(true);

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        alert("Razorpay failed to load. Please check your internet connection.");
        return;
      }

      const orderResponse = await fetch(
        `${API_BASE_URL}/api/payment/create-order`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        alert(
          `${orderData.message || "Failed to create payment order."}${
            orderData.error ? "\n\nBackend error: " + orderData.error : ""
          }`
        );
        return;
      }

      if (orderData.alreadyPremium) {
        saveUserData(orderData.user);
        alert(orderData.message);
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: orderData.name,
        description: orderData.description,
        order_id: orderData.orderId,
        prefill: orderData.prefill,
        theme: {
          color: "#2563eb",
        },
        handler: async function (paymentResponse) {
          try {
            const verifyResponse = await fetch(
              `${API_BASE_URL}/api/payment/verify`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(paymentResponse),
              }
            );

            const verifyData = await verifyResponse.json();

            if (!verifyData.success) {
              alert(verifyData.message || "Payment verification failed.");
              return;
            }

            saveUserData(verifyData.user);
            fetchAnalysisHistory();

            alert("Payment successful. Premium activated.");
          } catch (error) {
            alert(
              "Payment completed, but verification failed. Please contact support."
            );
          }
        },
        modal: {
          ondismiss: function () {
            alert("Payment cancelled.");
          },
        },
      };

      const razorpayObject = new window.Razorpay(options);
      razorpayObject.open();
    } catch (error) {
      alert("Payment failed. Please try again.");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const uploadResumePDF = async () => {
    if (!token) {
      alert("Please login first.");
      return;
    }

    if (!selectedFile) {
      alert("Please select a PDF resume first.");
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      alert("Only PDF files are supported right now.");
      return;
    }

    try {
      setUploading(true);
      setResult(null);

      const formData = new FormData();
      formData.append("resume", selectedFile);

      const response = await fetch(`${API_BASE_URL}/api/upload-resume`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.message || "Failed to extract resume text.");
        return;
      }

      setResumeText(data.text);
      alert("Resume text extracted successfully. Now click Analyze Resume.");
    } catch (error) {
      alert("Failed to upload PDF. Please check backend is running.");
    } finally {
      setUploading(false);
    }
  };

  const analyzeResume = async () => {
    if (!token) {
      alert("Please login first.");
      return;
    }

    if (!resumeText.trim()) {
      alert("Please upload a PDF or paste your resume text first.");
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const response = await fetch(`${API_BASE_URL}/api/analyze-resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeText,
          targetRole,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.user) {
        saveUserData(data.user);
      }

      if (data.success) {
        fetchAnalysisHistory();
      }

      if (data.limitReached) {
        alert(data.message);
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to connect to backend",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return "#22c55e";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const getScoreBackground = (score) => {
    if (score >= 75) return "rgba(34,197,94,0.14)";
    if (score >= 50) return "rgba(245,158,11,0.14)";
    return "rgba(239,68,68,0.14)";
  };

  const getScoreBorder = (score) => {
    if (score >= 75) return "rgba(34,197,94,0.35)";
    if (score >= 50) return "rgba(245,158,11,0.35)";
    return "rgba(239,68,68,0.35)";
  };

  const getScoreMessage = (score) => {
    if (score >= 75) return "Recruiter-ready resume match";
    if (score >= 50) return "Good profile, needs stronger keywords";
    return "Needs stronger role-specific optimization";
  };

  const getReadinessLabel = (score) => {
    if (score >= 75) return "High Recruiter Readiness";
    if (score >= 50) return "Medium Recruiter Readiness";
    return "Low Recruiter Readiness";
  };

  const getPriorityText = (score) => {
    if (score >= 75) {
      return "Your resume is strong. Focus on polishing achievements, role-specific impact, and interview readiness.";
    }

    if (score >= 50) {
      return "Your resume has a good base. Improve keywords, measurable achievements, and role alignment.";
    }

    return "Your resume needs stronger positioning. Add relevant skills, projects, achievements, and role-specific keywords.";
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "No date";
    return new Date(dateValue).toLocaleString();
  };

  const scrollToAnalyzer = () => {
    const element = document.getElementById("resume-analyzer");
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  const downloadPDFReport = () => {
    if (!result || !result.success) {
      alert("Please analyze a resume first.");
      return;
    }

    if (!isPremium) {
      alert("PDF report download is a Premium feature. Upgrade to Premium.");
      return;
    }

    const doc = new jsPDF();

    let y = 20;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;

    const checkPageSpace = () => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    };

    const addTitle = (text) => {
      checkPageSpace();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(text, margin, y);
      y += 12;
    };

    const addSmallText = (text) => {
      checkPageSpace();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(String(text), maxWidth);
      doc.text(lines, margin, y);
      y += lines.length * 7;
    };

    const addSectionTitle = (text) => {
      checkPageSpace();
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(text, margin, y);
      y += 8;
    };

    const addList = (items) => {
      if (!items || items.length === 0) {
        addSmallText("No data available.");
        return;
      }

      items.forEach((item, index) => {
        addSmallText(`${index + 1}. ${item}`);
      });
    };

    addTitle("HireNexa AI Resume Intelligence Report");
    addSmallText(`User: ${user?.name || "HireNexa User"}`);
    addSmallText(`Email: ${user?.email || "Not available"}`);
    addSmallText(`Plan: ${user?.plan || "free"}`);
    addSmallText(`Target Role: ${roleLabels[targetRole] || "Fresher General"}`);
    addSmallText(`ATS Score: ${result.atsScore}%`);
    addSmallText(`Generated Date: ${new Date().toLocaleDateString()}`);

    addSectionTitle("Resume DNA Engine");
    if (result.resumeDna) {
      addSmallText(`Profile Strength: ${result.resumeDna.profileStrength}%`);
      addSmallText(`Keyword Strength: ${result.resumeDna.keywordStrength}%`);
      addSmallText(`Skills Match: ${result.resumeDna.skillsMatch}%`);
      addSmallText(`Experience Quality: ${result.resumeDna.experienceQuality}%`);
      addSmallText(`Project Strength: ${result.resumeDna.projectStrength}%`);
      addSmallText(
        `Communication Quality: ${result.resumeDna.communicationQuality}%`
      );
      addSmallText(
        `Recruiter Readiness: ${result.resumeDna.recruiterReadiness}%`
      );
      addSmallText(`Summary: ${result.resumeDna.summary}`);
    } else {
      addSmallText("Resume DNA data not available.");
    }

    addSectionTitle("Matched Skills");
    addSmallText(
      result.matchedSkills && result.matchedSkills.length > 0
        ? result.matchedSkills.join(", ")
        : "No matched skills found."
    );

    addSectionTitle("Missing Skills");
    addSmallText(
      result.missingSkills && result.missingSkills.length > 0
        ? result.missingSkills.join(", ")
        : "No missing skills found."
    );

    addSectionTitle("Suggestions");
    addList(result.suggestions);

    addSectionTitle("Career Roadmap");
    addList(result.roadmap);

    addSectionTitle("Interview Questions");
    addList(result.interviewQuestions);

    addSectionTitle("AI Mock Interview Coach");
    if (result.mockInterview) {
      addSmallText("HR Questions");
      addList(result.mockInterview.hrQuestions);

      addSmallText("Role-Based Questions");
      addList(result.mockInterview.roleQuestions);

      addSmallText("Technical Questions");
      addList(result.mockInterview.technicalQuestions);

      addSmallText("Suggested Answer Approach");
      addList(result.mockInterview.answerApproach);

      addSmallText("Preparation Plan");
      addList(result.mockInterview.preparationPlan);
    } else {
      addSmallText("Mock interview data not available.");
    }

    addSectionTitle("Skill Gap Action Plan");
    addList(result.skillGapPlan);

    addSectionTitle("Resume Text Used For Analysis");
    addSmallText(resumeText);

    doc.save("HireNexa-AI-Resume-Report.pdf");
  };

  const renderSkillChips = (items, type = "matched") => {
    if (!items || items.length === 0) {
      return (
        <span
          style={{
            ...styles.skillChip,
            background: "rgba(148,163,184,0.12)",
            color: "#cbd5e1",
            borderColor: "rgba(148,163,184,0.2)",
          }}
        >
          No data available
        </span>
      );
    }

    return items.map((item, index) => (
      <span
        key={`${item}-${index}`}
        style={{
          ...styles.skillChip,
          background:
            type === "matched"
              ? "rgba(34,197,94,0.12)"
              : "rgba(239,68,68,0.12)",
          color: type === "matched" ? "#bbf7d0" : "#fecaca",
          borderColor:
            type === "matched"
              ? "rgba(34,197,94,0.28)"
              : "rgba(239,68,68,0.28)",
        }}
      >
        {item}
      </span>
    ));
  };

  const renderNumberedList = (items, emptyMessage = "No data available.") => {
    if (!items || items.length === 0) {
      return <p style={styles.cardText}>{emptyMessage}</p>;
    }

    return (
      <ol style={styles.premiumList}>
        {items.map((item, index) => (
          <li key={`${item}-${index}`} style={styles.premiumListItem}>
            <span style={styles.listNumber}>{index + 1}</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    );
  };

  const renderBulletList = (items, emptyMessage = "No data available.") => {
    if (!items || items.length === 0) {
      return <p style={styles.cardText}>{emptyMessage}</p>;
    }

    return (
      <ul style={styles.premiumBulletList}>
        {items.map((item, index) => (
          <li key={`${item}-${index}`} style={styles.premiumBulletItem}>
            <span style={styles.bulletDot}></span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  };

  const renderDnaScore = (label, value) => {
    const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

    return (
      <div style={styles.dnaScoreCard}>
        <div style={styles.dnaScoreTop}>
          <span style={styles.dnaScoreLabel}>{label}</span>
          <strong
            style={{
              ...styles.dnaScoreValue,
              color: getScoreColor(safeValue),
            }}
          >
            {safeValue}%
          </strong>
        </div>

        <div style={styles.dnaMiniTrack}>
          <div
            style={{
              ...styles.dnaMiniFill,
              width: `${safeValue}%`,
              background: getScoreColor(safeValue),
            }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brandWrap}>
          <div style={styles.logoIcon}>HN</div>
          <div>
            <div style={styles.logo}>HireNexa AI</div>
            <div style={styles.logoSub}>Career Intelligence Platform</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          {user && (
            <div
              style={{
                ...styles.planBadge,
                background: isPremium
                  ? "linear-gradient(135deg, #facc15, #f97316)"
                  : "rgba(59,130,246,0.14)",
                color: isPremium ? "#111827" : "#bfdbfe",
              }}
            >
              {isPremium ? "Premium Plan" : "Free Plan"}
            </div>
          )}

          <div style={styles.headerBadge}>AI-Powered Career Intelligence</div>

          {user && (
            <button style={styles.logoutButton} onClick={logout}>
              Logout
            </button>
          )}
        </div>
      </header>

      <section style={styles.hero}>
        <div style={styles.heroGlowOne}></div>
        <div style={styles.heroGlowTwo}></div>

        <div style={styles.heroGrid}>
          <div style={styles.heroText}>
            <p style={styles.smallTag}>
              For Freshers, Job Seekers & Career Switchers
            </p>

            <h1 style={styles.heroTitle}>
              Land More Interviews with AI-Powered Resume Intelligence
            </h1>

            <p style={styles.heroSubtitle}>
              Optimize your resume for ATS systems, identify missing skills,
              generate interview questions, and build a personalized career
              roadmap that makes recruiters notice you.
            </p>

            <div style={styles.heroActions}>
              <button style={styles.heroPrimaryButton} onClick={scrollToAnalyzer}>
                Analyze Resume Free
              </button>
              <button style={styles.heroSecondaryButton} onClick={scrollToAnalyzer}>
                View AI Report
              </button>
            </div>

            <div style={styles.trustRow}>
              <div>
                <strong>50K+</strong>
                <span> Resumes Analyzed</span>
              </div>
              <div>
                <strong>92%</strong>
                <span> ATS Improvement</span>
              </div>
              <div>
                <strong>15K+</strong>
                <span> Candidates Helped</span>
              </div>
            </div>
          </div>

          <div style={styles.heroPanel}>
            <div style={styles.panelTop}>
              <span style={styles.liveDot}></span>
              Resume Intelligence Scan
            </div>

            <div style={styles.scorePreview}>
              <div>
                <p style={styles.previewLabel}>Recruiter Readiness</p>
                <h2 style={styles.previewScore}>86%</h2>
              </div>
              <div style={styles.ring}>ATS</div>
            </div>

            <div style={styles.previewBars}>
              <div>
                <span>ATS Keywords</span>
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width: "88%" }}></div>
                </div>
              </div>

              <div>
                <span>Skill Match</span>
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width: "74%" }}></div>
                </div>
              </div>

              <div>
                <span>Interview Readiness</span>
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width: "81%" }}></div>
                </div>
              </div>
            </div>

            <div style={styles.aiInsight}>
              AI Insight: Add stronger role-specific keywords and measurable
              achievements to increase recruiter shortlisting chances.
            </div>
          </div>
        </div>

        <div style={styles.featureGrid}>
          <div style={styles.featureCard}>ATS Optimization</div>
          <div style={styles.featureCard}>Resume DNA</div>
          <div style={styles.featureCard}>Mock Interviews</div>
          <div style={styles.featureCard}>Recruiter Ready</div>
        </div>
      </section>

      <main style={styles.main}>
        {!user && (
          <section style={styles.authCard}>
            <div style={styles.sectionHeader}>
              <p style={styles.sectionEyebrow}>Secure Access</p>
              <h2 style={styles.sectionTitle}>
                {authMode === "login"
                  ? "Login to HireNexa AI"
                  : "Create Your HireNexa Account"}
              </h2>

              <p style={styles.sectionSubtitle}>
                Login is required to upload resumes, save reports, and view your
                AI-powered career analysis history.
              </p>
            </div>

            {authMode === "signup" && (
              <>
                <label style={styles.label}>Name</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </>
            )}

            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button style={styles.primaryButton} onClick={handleAuth}>
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                ? "Login"
                : "Signup"}
            </button>

            <button
              style={styles.switchButton}
              onClick={() =>
                setAuthMode(authMode === "login" ? "signup" : "login")
              }
            >
              {authMode === "login"
                ? "New user? Create account"
                : "Already have an account? Login"}
            </button>
          </section>
        )}

        {user && (
          <>
            <section style={styles.userCard}>
              <div style={styles.userTop}>
                <div>
                  <p style={styles.sectionEyebrow}>Candidate Dashboard</p>
                  <h2 style={styles.welcomeTitle}>Welcome, {user.name} 👋</h2>
                  <p style={styles.sectionSubtitle}>
                    Your AI career reports are saved under: {user.email}
                  </p>
                </div>

                <div
                  style={{
                    ...styles.planBox,
                    borderColor: isPremium ? "#facc15" : "#38bdf8",
                  }}
                >
                  <p style={styles.planLabel}>Current Plan</p>
                  <h3 style={styles.planName}>
                    {isPremium ? "Premium" : "Free"}
                  </h3>
                  <p style={styles.planUsage}>Used: {user.analysisCount || 0}</p>
                  <p style={styles.planUsage}>
                    Remaining: {user.remainingAnalyses || 0}
                  </p>
                </div>
              </div>

              {!isPremium && (
                <div style={styles.limitNotice}>
                  Free plan includes 3 resume analyses. Upgrade to Premium for
                  unlimited analysis and PDF report download.
                </div>
              )}

              {isPremium && (
                <div style={styles.premiumNotice}>
                  Premium active: unlimited resume analysis, PDF download, and
                  extended history access.
                </div>
              )}
            </section>

            <section id="resume-analyzer" style={styles.formCard}>
              <div style={styles.sectionHeader}>
                <p style={styles.sectionEyebrow}>AI Resume Engine</p>
                <h2 style={styles.sectionTitle}>Resume Analyzer</h2>
                <p style={styles.sectionSubtitle}>
                  Select a target role, upload your resume PDF, and generate an
                  AI-powered recruiter readiness report.
                </p>
              </div>

              <label style={styles.label}>Select Target Job Role</label>
              <select
                style={styles.select}
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              >
                <option value="fresher">Fresher General</option>
                <option value="it-support">IT Support</option>
                <option value="project-coordinator">Project Coordinator</option>
                <option value="customer-support">Customer Support</option>
                <option value="data-analyst">Data Analyst</option>
              </select>

              <label style={styles.label}>Upload Resume PDF</label>
              <input
                style={styles.fileInput}
                type="file"
                accept="application/pdf"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />

              {selectedFile && (
                <p style={styles.fileName}>Selected file: {selectedFile.name}</p>
              )}

              <button style={styles.uploadButton} onClick={uploadResumePDF}>
                {uploading
                  ? "Extracting Resume Text..."
                  : "Upload PDF & Extract Text"}
              </button>

              <label style={styles.label}>Resume Text</label>
              <textarea
                style={styles.textarea}
                placeholder="Upload PDF or paste your resume text here..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />

              <button style={styles.primaryButton} onClick={analyzeResume}>
                {loading ? "Analyzing Resume..." : "Analyze Resume"}
              </button>

              <button
                style={{
                  ...styles.downloadButton,
                  background:
                    result && result.success && isPremium
                      ? "linear-gradient(135deg, #111827, #334155)"
                      : "#64748b",
                  cursor:
                    result && result.success && isPremium
                      ? "pointer"
                      : "not-allowed",
                }}
                onClick={downloadPDFReport}
              >
                Download Premium PDF Report {isPremium ? "" : "(Premium)"}
              </button>
            </section>
          </>
        )}

        {result && result.success && (
          <section style={styles.reportSection}>
            <div style={styles.reportHero}>
              <div>
                <p style={styles.sectionEyebrow}>AI Recruiter Report</p>
                <h2 style={styles.reportTitle}>Recruiter Readiness Report</h2>
                <p style={styles.reportSubtitle}>
                  HireNexa AI analyzed your resume against the selected role and
                  created a focused action plan to improve ATS matching,
                  recruiter appeal, and interview readiness.
                </p>

                <div
                  style={{
                    ...styles.readinessBadge,
                    background: getScoreBackground(result.atsScore),
                    borderColor: getScoreBorder(result.atsScore),
                    color: getScoreColor(result.atsScore),
                  }}
                >
                  {getReadinessLabel(result.atsScore)}
                </div>
              </div>

              <div style={styles.scoreRingPanel}>
                <div
                  style={{
                    ...styles.reportRing,
                    background: `conic-gradient(${getScoreColor(
                      result.atsScore
                    )} 0deg ${Math.min(
                      360,
                      (result.atsScore / 100) * 360
                    )}deg, rgba(148,163,184,0.18) ${Math.min(
                      360,
                      (result.atsScore / 100) * 360
                    )}deg 360deg)`,
                  }}
                >
                  <div style={styles.reportRingInner}>
                    <span
                      style={{
                        ...styles.reportScoreValue,
                        color: getScoreColor(result.atsScore),
                      }}
                    >
                      {result.atsScore}%
                    </span>
                    <small style={styles.reportScoreLabel}>ATS Score</small>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.reportMetricGrid}>
              <div style={styles.metricCard}>
                <p style={styles.metricLabel}>Target Role</p>
                <h3 style={styles.metricValue}>
                  {roleLabels[targetRole] || "Fresher General"}
                </h3>
              </div>

              <div style={styles.metricCard}>
                <p style={styles.metricLabel}>Matched Skills</p>
                <h3 style={styles.metricValue}>
                  {(result.matchedSkills || []).length}
                </h3>
              </div>

              <div style={styles.metricCard}>
                <p style={styles.metricLabel}>Missing Skills</p>
                <h3 style={styles.metricValue}>
                  {(result.missingSkills || []).length}
                </h3>
              </div>

              <div style={styles.metricCard}>
                <p style={styles.metricLabel}>Report Status</p>
                <h3 style={styles.metricValue}>Generated</h3>
              </div>
            </div>

            <div style={styles.resumeDnaCard}>
              <div>
                <p style={styles.sectionEyebrow}>Resume DNA Summary</p>
                <h3 style={styles.cardTitle}>Priority Improvement Focus</h3>
                <p style={styles.cardText}>
                  {result.resumeDna?.summary || getPriorityText(result.atsScore)}
                </p>
              </div>

              <div style={styles.dnaGrid}>
                <div style={styles.dnaItem}>
                  <span style={styles.dnaLabel}>ATS</span>
                  <div style={styles.dnaTrack}>
                    <div
                      style={{
                        ...styles.dnaFill,
                        width: `${Math.min(100, result.atsScore || 0)}%`,
                        background: getScoreColor(result.atsScore),
                      }}
                    ></div>
                  </div>
                </div>

                <div style={styles.dnaItem}>
                  <span style={styles.dnaLabel}>Skills</span>
                  <div style={styles.dnaTrack}>
                    <div
                      style={{
                        ...styles.dnaFill,
                        width: `${
                          result.resumeDna?.skillsMatch ||
                          ((result.matchedSkills || []).length > 0
                            ? Math.min(
                                100,
                                ((result.matchedSkills || []).length /
                                  Math.max(
                                    1,
                                    (result.matchedSkills || []).length +
                                      (result.missingSkills || []).length
                                  )) *
                                  100
                              )
                            : 15)
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div style={styles.dnaItem}>
                  <span style={styles.dnaLabel}>Readiness</span>
                  <div style={styles.dnaTrack}>
                    <div
                      style={{
                        ...styles.dnaFill,
                        width: `${Math.min(
                          100,
                          result.resumeDna?.recruiterReadiness ||
                            Math.max(20, (result.atsScore || 0) + 10)
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {result.resumeDna && (
              <div style={styles.dnaEngineSection}>
                <div style={styles.dnaEngineHeader}>
                  <div>
                    <p style={styles.sectionEyebrow}>Resume DNA Engine</p>
                    <h3 style={styles.dnaEngineTitle}>
                      Deep Resume Quality Breakdown
                    </h3>
                    <p style={styles.dnaEngineText}>
                      This engine checks how strong your resume looks beyond ATS
                      keywords — including profile quality, projects, experience,
                      communication signals, and recruiter readiness.
                    </p>
                  </div>

                  <div style={styles.dnaEngineBadge}>
                    {result.resumeDna.recruiterReadiness}% Ready
                  </div>
                </div>

                <div style={styles.dnaScoreGrid}>
                  {renderDnaScore(
                    "Profile Strength",
                    result.resumeDna.profileStrength
                  )}
                  {renderDnaScore(
                    "Keyword Strength",
                    result.resumeDna.keywordStrength
                  )}
                  {renderDnaScore("Skills Match", result.resumeDna.skillsMatch)}
                  {renderDnaScore(
                    "Experience Quality",
                    result.resumeDna.experienceQuality
                  )}
                  {renderDnaScore(
                    "Project Strength",
                    result.resumeDna.projectStrength
                  )}
                  {renderDnaScore(
                    "Communication Quality",
                    result.resumeDna.communicationQuality
                  )}
                  {renderDnaScore(
                    "Recruiter Readiness",
                    result.resumeDna.recruiterReadiness
                  )}
                </div>
              </div>
            )}

            <div style={styles.reportGrid}>
              <div style={styles.resultCard}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardIconSuccess}>✓</span>
                  <h3 style={styles.cardTitle}>Matched Skills</h3>
                </div>
                <div style={styles.skillChipWrap}>
                  {renderSkillChips(result.matchedSkills, "matched")}
                </div>
              </div>

              <div style={styles.resultCard}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardIconDanger}>!</span>
                  <h3 style={styles.cardTitle}>Missing Skills</h3>
                </div>
                <div style={styles.skillChipWrap}>
                  {renderSkillChips(result.missingSkills, "missing")}
                </div>
              </div>

              <div style={styles.resultCard}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardIconInfo}>↗</span>
                  <h3 style={styles.cardTitle}>Priority Fixes</h3>
                </div>
                {renderBulletList(result.suggestions)}
              </div>

              <div style={styles.resultCard}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardIconInfo}>◎</span>
                  <h3 style={styles.cardTitle}>Basic Interview Questions</h3>
                </div>
                {renderNumberedList(result.interviewQuestions)}
              </div>

              <div style={styles.timelineCard}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardIconInfo}>⌁</span>
                  <h3 style={styles.cardTitle}>Career Roadmap Timeline</h3>
                </div>

                {result.roadmap && result.roadmap.length > 0 ? (
                  <div style={styles.timeline}>
                    {result.roadmap.map((step, index) => (
                      <div key={`${step}-${index}`} style={styles.timelineItem}>
                        <div style={styles.timelineMarker}>{index + 1}</div>
                        <div>
                          <h4 style={styles.timelineTitle}>Step {index + 1}</h4>
                          <p style={styles.timelineText}>{step}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={styles.cardText}>No roadmap available.</p>
                )}
              </div>

              <div style={styles.timelineCard}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardIconInfo}>⚡</span>
                  <h3 style={styles.cardTitle}>Skill Gap Action Plan</h3>
                </div>

                {result.skillGapPlan && result.skillGapPlan.length > 0 ? (
                  <div style={styles.timeline}>
                    {result.skillGapPlan.map((step, index) => (
                      <div key={`${step}-${index}`} style={styles.timelineItem}>
                        <div style={styles.timelineMarker}>{index + 1}</div>
                        <div>
                          <h4 style={styles.timelineTitle}>
                            Action {index + 1}
                          </h4>
                          <p style={styles.timelineText}>{step}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={styles.cardText}>No action plan available.</p>
                )}
              </div>
            </div>

            {result.mockInterview && (
              <div style={styles.interviewCoachSection}>
                <div style={styles.interviewCoachHeader}>
                  <div>
                    <p style={styles.sectionEyebrow}>
                      AI Mock Interview Coach
                    </p>
                    <h3 style={styles.interviewCoachTitle}>
                      Practice Plan for{" "}
                      {roleLabels[targetRole] || "Fresher General"}
                    </h3>
                    <p style={styles.interviewCoachText}>
                      These questions and answer strategies help you prepare like
                      a real interview session, based on your selected role and
                      resume gaps.
                    </p>
                  </div>

                  <div style={styles.coachBadge}>Interview Ready Mode</div>
                </div>

                <div style={styles.interviewGrid}>
                  <div style={styles.interviewPanel}>
                    <div style={styles.cardHeader}>
                      <span style={styles.cardIconInfo}>HR</span>
                      <h3 style={styles.cardTitle}>HR Questions</h3>
                    </div>
                    {renderNumberedList(result.mockInterview.hrQuestions)}
                  </div>

                  <div style={styles.interviewPanel}>
                    <div style={styles.cardHeader}>
                      <span style={styles.cardIconInfo}>Role</span>
                      <h3 style={styles.cardTitle}>Role-Based Questions</h3>
                    </div>
                    {renderNumberedList(result.mockInterview.roleQuestions)}
                  </div>

                  <div style={styles.interviewPanel}>
                    <div style={styles.cardHeader}>
                      <span style={styles.cardIconInfo}>Tech</span>
                      <h3 style={styles.cardTitle}>Technical Questions</h3>
                    </div>
                    {renderNumberedList(result.mockInterview.technicalQuestions)}
                  </div>

                  <div style={styles.interviewPanel}>
                    <div style={styles.cardHeader}>
                      <span style={styles.cardIconSuccess}>✓</span>
                      <h3 style={styles.cardTitle}>Suggested Answer Approach</h3>
                    </div>
                    {renderBulletList(result.mockInterview.answerApproach)}
                  </div>

                  <div style={styles.interviewWidePanel}>
                    <div style={styles.cardHeader}>
                      <span style={styles.cardIconInfo}>Plan</span>
                      <h3 style={styles.cardTitle}>
                        5-Step Interview Preparation Plan
                      </h3>
                    </div>
                    {renderNumberedList(result.mockInterview.preparationPlan)}
                  </div>
                </div>
              </div>
            )}

            <div style={styles.reportCta}>
              <div>
                <p style={styles.sectionEyebrow}>Premium Report</p>
                <h3 style={styles.ctaTitle}>
                  Download your complete HireNexa AI career report
                </h3>
                <p style={styles.ctaText}>
                  Includes ATS score, Resume DNA Engine, Mock Interview Coach,
                  matched skills, missing skills, recommendations, roadmap, and
                  resume text used for analysis.
                </p>
              </div>

              <button
                style={{
                  ...styles.ctaButton,
                  opacity: isPremium ? 1 : 0.65,
                  cursor: isPremium ? "pointer" : "not-allowed",
                }}
                onClick={downloadPDFReport}
              >
                {isPremium ? "Download PDF Report" : "Upgrade to Download"}
              </button>
            </div>
          </section>
        )}

        {result && !result.success && (
          <section style={styles.errorCard}>
            <h3 style={styles.errorTitle}>
              {result.limitReached
                ? "Free Plan Limit Reached"
                : "Something went wrong"}
            </h3>
            <p style={styles.errorText}>{result.message}</p>

            {result.limitReached && (
              <button style={styles.upgradeButton} onClick={upgradeToPremiumDemo}>
                {upgradeLoading ? "Opening Payment..." : "Pay ₹199 with Razorpay"}
              </button>
            )}
          </section>
        )}

        {user && (
          <section style={styles.pricingSection}>
            <div style={styles.sectionHeader}>
              <p style={styles.sectionEyebrow}>Simple Pricing</p>
              <h2 style={styles.sectionTitle}>Pricing Plans</h2>
              <p style={styles.sectionSubtitle}>
                Start free. Upgrade when you need unlimited career intelligence
                and premium PDF reports.
              </p>
            </div>

            <div style={styles.pricingGrid}>
              <div style={styles.pricingCard}>
                <h3 style={styles.pricingTitle}>Free</h3>
                <p style={styles.price}>₹0</p>
                <ul style={styles.pricingList}>
                  <li>3 resume analyses</li>
                  <li>ATS score</li>
                  <li>Skill gap report</li>
                  <li>Career roadmap</li>
                  <li>Basic history access</li>
                </ul>

                <button style={styles.currentPlanButton}>
                  {isPremium ? "Free Plan" : "Current Plan"}
                </button>
              </div>

              <div style={styles.premiumPricingCard}>
                <div style={styles.popularBadge}>Recommended</div>
                <h3 style={styles.pricingTitle}>Premium</h3>
                <p style={styles.price}>₹199</p>
                <ul style={styles.pricingList}>
                  <li>Unlimited resume analyses</li>
                  <li>Resume DNA Engine</li>
                  <li>AI Mock Interview Coach</li>
                  <li>Premium PDF report download</li>
                  <li>Extended analysis history</li>
                </ul>

                <button
                  style={styles.upgradeButton}
                  onClick={upgradeToPremiumDemo}
                  disabled={isPremium}
                >
                  {isPremium
                    ? "Premium Active"
                    : upgradeLoading
                    ? "Opening Payment..."
                    : "Pay ₹199 with Razorpay"}
                </button>
              </div>
            </div>
          </section>
        )}

        {user && (
          <section style={styles.historySection}>
            <div style={styles.historyHeader}>
              <div>
                <p style={styles.sectionEyebrow}>Progress Tracking</p>
                <h2 style={styles.sectionTitle}>My Analysis History</h2>
                <p style={styles.sectionSubtitle}>
                  Free users see latest 3 records. Premium users see extended
                  history.
                </p>
              </div>

              <button
                style={styles.secondaryButton}
                onClick={() => fetchAnalysisHistory()}
              >
                {historyLoading ? "Loading..." : "Refresh History"}
              </button>
            </div>

            {history.length === 0 ? (
              <p style={styles.emptyText}>No analysis history found yet.</p>
            ) : (
              <div style={styles.historyGrid}>
                {history.map((item) => (
                  <div key={item._id} style={styles.historyCard}>
                    <div style={styles.historyTop}>
                      <div>
                        <h3 style={styles.historyRole}>
                          {roleLabels[item.targetRole] || item.targetRole}
                        </h3>
                        <p style={styles.historyDate}>
                          {formatDate(item.createdAt)}
                        </p>
                      </div>

                      <div
                        style={{
                          ...styles.historyScore,
                          color: getScoreColor(item.atsScore),
                        }}
                      >
                        {item.atsScore}%
                      </div>
                    </div>

                    <p style={styles.historyMeta}>
                      <strong>Matched:</strong>{" "}
                      {item.matchedSkills && item.matchedSkills.length > 0
                        ? item.matchedSkills.join(", ")
                        : "None"}
                    </p>

                    <p style={styles.historyMeta}>
                      <strong>Missing:</strong>{" "}
                      {item.missingSkills && item.missingSkills.length > 0
                        ? item.missingSkills.join(", ")
                        : "None"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <footer style={styles.footer}>
        HireNexa AI — AI-powered resume analysis, career planning, mock interview
        coaching, and recruiter readiness intelligence.
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(59,130,246,0.22), transparent 32%), linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    color: "#e5e7eb",
  },
  header: {
    width: "100%",
    padding: "18px 8%",
    background: "rgba(2, 6, 23, 0.78)",
    backdropFilter: "blur(18px)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(148,163,184,0.18)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  brandWrap: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "14px",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #38bdf8, #8b5cf6)",
    color: "#ffffff",
    fontWeight: "900",
    boxShadow: "0 12px 35px rgba(59,130,246,0.35)",
  },
  logo: {
    fontSize: "23px",
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: "-0.04em",
  },
  logoSub: {
    fontSize: "12px",
    color: "#94a3b8",
    marginTop: "2px",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  planBadge: {
    padding: "8px 14px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "800",
  },
  headerBadge: {
    background: "rgba(14,165,233,0.14)",
    color: "#bae6fd",
    padding: "8px 14px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "800",
    border: "1px solid rgba(56,189,248,0.22)",
  },
  logoutButton: {
    border: "1px solid rgba(248,113,113,0.35)",
    background: "rgba(220,38,38,0.18)",
    color: "#fecaca",
    padding: "9px 14px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "800",
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    padding: "72px 8% 42px",
  },
  heroGlowOne: {
    position: "absolute",
    top: "80px",
    right: "8%",
    width: "300px",
    height: "300px",
    background: "rgba(139,92,246,0.28)",
    filter: "blur(90px)",
    borderRadius: "50%",
  },
  heroGlowTwo: {
    position: "absolute",
    bottom: "20px",
    left: "10%",
    width: "260px",
    height: "260px",
    background: "rgba(6,182,212,0.22)",
    filter: "blur(90px)",
    borderRadius: "50%",
  },
  heroGrid: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1200px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1.15fr 0.85fr",
    gap: "34px",
    alignItems: "center",
  },
  heroText: {
    maxWidth: "760px",
  },
  smallTag: {
    display: "inline-block",
    background: "rgba(59,130,246,0.16)",
    color: "#bfdbfe",
    padding: "9px 15px",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: "800",
    marginBottom: "22px",
    border: "1px solid rgba(96,165,250,0.24)",
  },
  heroTitle: {
    fontSize: "58px",
    lineHeight: "1.02",
    margin: "0 0 20px",
    color: "#ffffff",
    letterSpacing: "-0.06em",
    maxWidth: "760px",
  },
  heroSubtitle: {
    fontSize: "18px",
    lineHeight: "1.8",
    maxWidth: "720px",
    margin: "0",
    color: "#cbd5e1",
  },
  heroActions: {
    display: "flex",
    gap: "14px",
    marginTop: "30px",
    flexWrap: "wrap",
  },
  heroPrimaryButton: {
    padding: "15px 22px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #38bdf8, #3b82f6, #8b5cf6)",
    color: "#ffffff",
    fontSize: "16px",
    cursor: "pointer",
    fontWeight: "900",
    boxShadow: "0 18px 45px rgba(59,130,246,0.32)",
  },
  heroSecondaryButton: {
    padding: "15px 22px",
    border: "1px solid rgba(148,163,184,0.28)",
    borderRadius: "14px",
    background: "rgba(15,23,42,0.72)",
    color: "#e2e8f0",
    fontSize: "16px",
    cursor: "pointer",
    fontWeight: "900",
  },
  trustRow: {
    display: "flex",
    gap: "18px",
    flexWrap: "wrap",
    marginTop: "30px",
    color: "#94a3b8",
  },
  heroPanel: {
    background: "rgba(15,23,42,0.74)",
    border: "1px solid rgba(148,163,184,0.22)",
    borderRadius: "28px",
    padding: "28px",
    boxShadow: "0 28px 80px rgba(0,0,0,0.38)",
    backdropFilter: "blur(22px)",
  },
  panelTop: {
    color: "#cbd5e1",
    fontWeight: "800",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "22px",
  },
  liveDot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    background: "#22c55e",
    boxShadow: "0 0 18px rgba(34,197,94,0.95)",
  },
  scorePreview: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "18px",
    marginBottom: "24px",
  },
  previewLabel: {
    color: "#94a3b8",
    margin: 0,
    fontSize: "14px",
  },
  previewScore: {
    margin: "6px 0 0",
    fontSize: "58px",
    color: "#ffffff",
    letterSpacing: "-0.06em",
  },
  ring: {
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background:
      "conic-gradient(#22c55e 0deg 310deg, rgba(148,163,184,0.2) 310deg 360deg)",
    color: "#ffffff",
    fontWeight: "900",
    border: "8px solid rgba(15,23,42,0.95)",
  },
  previewBars: {
    display: "grid",
    gap: "16px",
    color: "#cbd5e1",
    fontSize: "14px",
  },
  barTrack: {
    height: "10px",
    borderRadius: "999px",
    background: "rgba(148,163,184,0.18)",
    marginTop: "8px",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #38bdf8, #8b5cf6)",
  },
  aiInsight: {
    marginTop: "22px",
    padding: "16px",
    borderRadius: "18px",
    background: "rgba(6,182,212,0.12)",
    border: "1px solid rgba(6,182,212,0.24)",
    color: "#cffafe",
    lineHeight: "1.6",
    fontSize: "14px",
  },
  featureGrid: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1200px",
    margin: "42px auto 0",
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
  },
  featureCard: {
    background: "rgba(15,23,42,0.68)",
    padding: "20px",
    borderRadius: "18px",
    border: "1px solid rgba(148,163,184,0.18)",
    fontWeight: "900",
    color: "#f8fafc",
    boxShadow: "0 18px 45px rgba(0,0,0,0.24)",
    textAlign: "center",
  },
  main: {
    width: "100%",
    maxWidth: "1120px",
    margin: "0 auto",
    padding: "24px 20px 60px",
  },
  authCard: {
    background: "rgba(15,23,42,0.84)",
    padding: "36px",
    borderRadius: "26px",
    border: "1px solid rgba(148,163,184,0.22)",
    boxShadow: "0 25px 75px rgba(0,0,0,0.32)",
    marginBottom: "30px",
  },
  userCard: {
    background: "rgba(15,23,42,0.84)",
    padding: "30px 36px",
    borderRadius: "26px",
    border: "1px solid rgba(148,163,184,0.22)",
    boxShadow: "0 25px 75px rgba(0,0,0,0.32)",
    marginBottom: "30px",
  },
  userTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  welcomeTitle: {
    fontSize: "32px",
    margin: "0 0 8px",
    color: "#ffffff",
    letterSpacing: "-0.04em",
  },
  planBox: {
    minWidth: "190px",
    border: "2px solid #38bdf8",
    borderRadius: "20px",
    padding: "18px",
    background: "rgba(2,6,23,0.45)",
  },
  planLabel: {
    margin: "0 0 4px",
    color: "#94a3b8",
    fontSize: "13px",
  },
  planName: {
    margin: "0 0 8px",
    fontSize: "26px",
    color: "#ffffff",
  },
  planUsage: {
    margin: "4px 0",
    fontSize: "14px",
    color: "#cbd5e1",
  },
  limitNotice: {
    background: "rgba(251,146,60,0.12)",
    color: "#fed7aa",
    padding: "14px",
    borderRadius: "14px",
    marginTop: "18px",
    fontWeight: "800",
    border: "1px solid rgba(251,146,60,0.22)",
  },
  premiumNotice: {
    background: "rgba(34,197,94,0.12)",
    color: "#bbf7d0",
    padding: "14px",
    borderRadius: "14px",
    marginTop: "18px",
    fontWeight: "800",
    border: "1px solid rgba(34,197,94,0.22)",
  },
  formCard: {
    background: "rgba(15,23,42,0.84)",
    padding: "36px",
    borderRadius: "26px",
    border: "1px solid rgba(148,163,184,0.22)",
    boxShadow: "0 25px 75px rgba(0,0,0,0.32)",
    marginBottom: "30px",
  },
  sectionHeader: {
    marginBottom: "25px",
  },
  sectionEyebrow: {
    color: "#38bdf8",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: "12px",
    margin: "0 0 8px",
  },
  sectionTitle: {
    fontSize: "32px",
    margin: "0 0 10px",
    color: "#ffffff",
    letterSpacing: "-0.04em",
  },
  sectionSubtitle: {
    fontSize: "16px",
    color: "#94a3b8",
    margin: "0 0 20px",
    lineHeight: "1.7",
  },
  label: {
    display: "block",
    fontSize: "15px",
    fontWeight: "800",
    color: "#e2e8f0",
    marginBottom: "8px",
  },
  input: {
    width: "100%",
    padding: "15px",
    fontSize: "16px",
    borderRadius: "14px",
    border: "1px solid rgba(148,163,184,0.26)",
    marginBottom: "18px",
    background: "rgba(2,6,23,0.45)",
    color: "#ffffff",
    outline: "none",
  },
  select: {
    width: "100%",
    padding: "15px",
    fontSize: "16px",
    borderRadius: "14px",
    border: "1px solid rgba(148,163,184,0.26)",
    marginBottom: "20px",
    background: "rgba(2,6,23,0.75)",
    color: "#ffffff",
    outline: "none",
  },
  fileInput: {
    width: "100%",
    padding: "15px",
    fontSize: "15px",
    borderRadius: "14px",
    border: "1px solid rgba(148,163,184,0.26)",
    marginBottom: "8px",
    background: "rgba(2,6,23,0.45)",
    color: "#cbd5e1",
  },
  fileName: {
    fontSize: "14px",
    color: "#cbd5e1",
    marginBottom: "14px",
  },
  textarea: {
    width: "100%",
    minHeight: "230px",
    padding: "15px",
    fontSize: "16px",
    borderRadius: "14px",
    border: "1px solid rgba(148,163,184,0.26)",
    resize: "vertical",
    marginBottom: "20px",
    background: "rgba(2,6,23,0.45)",
    color: "#ffffff",
    outline: "none",
    lineHeight: "1.6",
  },
  uploadButton: {
    width: "100%",
    padding: "15px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #059669, #10b981)",
    color: "white",
    fontSize: "17px",
    cursor: "pointer",
    marginBottom: "20px",
    fontWeight: "900",
  },
  primaryButton: {
    width: "100%",
    padding: "16px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #38bdf8, #3b82f6, #8b5cf6)",
    color: "white",
    fontSize: "17px",
    cursor: "pointer",
    marginBottom: "12px",
    fontWeight: "900",
    boxShadow: "0 16px 35px rgba(59,130,246,0.24)",
  },
  switchButton: {
    width: "100%",
    padding: "14px",
    border: "1px solid rgba(148,163,184,0.26)",
    borderRadius: "14px",
    background: "rgba(15,23,42,0.72)",
    color: "#bae6fd",
    fontSize: "16px",
    cursor: "pointer",
    fontWeight: "900",
  },
  downloadButton: {
    width: "100%",
    padding: "16px",
    border: "none",
    borderRadius: "14px",
    color: "white",
    fontSize: "17px",
    marginBottom: "5px",
    fontWeight: "900",
  },
  reportSection: {
    marginTop: "34px",
    display: "grid",
    gap: "24px",
  },
  reportHero: {
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.72))",
    borderRadius: "30px",
    padding: "36px",
    border: "1px solid rgba(148,163,184,0.22)",
    boxShadow: "0 25px 75px rgba(0,0,0,0.32)",
    display: "grid",
    gridTemplateColumns: "1fr 260px",
    gap: "28px",
    alignItems: "center",
  },
  reportTitle: {
    fontSize: "38px",
    margin: "0 0 12px",
    color: "#ffffff",
    letterSpacing: "-0.05em",
  },
  reportSubtitle: {
    fontSize: "16px",
    lineHeight: "1.8",
    color: "#cbd5e1",
    maxWidth: "720px",
    margin: "0 0 18px",
  },
  readinessBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: "999px",
    fontWeight: "900",
    border: "1px solid",
    fontSize: "14px",
  },
  scoreRingPanel: {
    display: "flex",
    justifyContent: "center",
  },
  reportRing: {
    width: "210px",
    height: "210px",
    borderRadius: "50%",
    padding: "16px",
    boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
  },
  reportRingInner: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "#020617",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    border: "1px solid rgba(148,163,184,0.18)",
  },
  reportScoreValue: {
    fontSize: "52px",
    fontWeight: "900",
    letterSpacing: "-0.06em",
    lineHeight: 1,
  },
  reportScoreLabel: {
    color: "#94a3b8",
    fontSize: "14px",
    marginTop: "8px",
    fontWeight: "800",
  },
  reportMetricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
  },
  metricCard: {
    background: "rgba(15,23,42,0.84)",
    borderRadius: "22px",
    padding: "22px",
    border: "1px solid rgba(148,163,184,0.2)",
    boxShadow: "0 18px 55px rgba(0,0,0,0.22)",
  },
  metricLabel: {
    color: "#94a3b8",
    margin: "0 0 8px",
    fontSize: "13px",
    fontWeight: "800",
  },
  metricValue: {
    color: "#ffffff",
    margin: 0,
    fontSize: "23px",
    letterSpacing: "-0.03em",
  },
  resumeDnaCard: {
    background:
      "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(139,92,246,0.1))",
    borderRadius: "26px",
    padding: "30px",
    border: "1px solid rgba(56,189,248,0.22)",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "28px",
    alignItems: "center",
  },
  dnaGrid: {
    display: "grid",
    gap: "18px",
  },
  dnaItem: {
    display: "grid",
    gap: "8px",
  },
  dnaLabel: {
    color: "#cbd5e1",
    fontWeight: "800",
    fontSize: "14px",
  },
  dnaTrack: {
    height: "11px",
    borderRadius: "999px",
    background: "rgba(148,163,184,0.18)",
    overflow: "hidden",
  },
  dnaFill: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #38bdf8, #8b5cf6)",
  },
  dnaEngineSection: {
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(88,28,135,0.18))",
    border: "1px solid rgba(139,92,246,0.26)",
    borderRadius: "28px",
    padding: "30px",
    boxShadow: "0 25px 75px rgba(0,0,0,0.28)",
  },
  dnaEngineHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "18px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  dnaEngineTitle: {
    margin: "0 0 10px",
    fontSize: "28px",
    color: "#ffffff",
    letterSpacing: "-0.04em",
  },
  dnaEngineText: {
    margin: 0,
    color: "#cbd5e1",
    lineHeight: "1.7",
    maxWidth: "760px",
  },
  dnaEngineBadge: {
    padding: "12px 16px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #8b5cf6, #38bdf8)",
    color: "#ffffff",
    fontWeight: "900",
    whiteSpace: "nowrap",
    boxShadow: "0 16px 35px rgba(139,92,246,0.28)",
  },
  dnaScoreGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
  },
  dnaScoreCard: {
    background: "rgba(2,6,23,0.48)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "18px",
    padding: "18px",
  },
  dnaScoreTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    marginBottom: "12px",
  },
  dnaScoreLabel: {
    color: "#cbd5e1",
    fontWeight: "800",
    fontSize: "14px",
  },
  dnaScoreValue: {
    fontSize: "22px",
    fontWeight: "900",
  },
  dnaMiniTrack: {
    height: "9px",
    borderRadius: "999px",
    background: "rgba(148,163,184,0.18)",
    overflow: "hidden",
  },
  dnaMiniFill: {
    height: "100%",
    borderRadius: "999px",
  },
  reportGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "20px",
  },
  resultCard: {
    background: "rgba(15,23,42,0.84)",
    padding: "26px",
    borderRadius: "22px",
    border: "1px solid rgba(148,163,184,0.2)",
    boxShadow: "0 18px 55px rgba(0,0,0,0.26)",
    lineHeight: "1.7",
  },
  timelineCard: {
    background: "rgba(15,23,42,0.84)",
    padding: "26px",
    borderRadius: "22px",
    border: "1px solid rgba(148,163,184,0.2)",
    boxShadow: "0 18px 55px rgba(0,0,0,0.26)",
    lineHeight: "1.7",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
  },
  cardIconSuccess: {
    minWidth: "30px",
    height: "30px",
    borderRadius: "10px",
    display: "grid",
    placeItems: "center",
    background: "rgba(34,197,94,0.14)",
    color: "#86efac",
    border: "1px solid rgba(34,197,94,0.28)",
    fontWeight: "900",
    padding: "0 8px",
  },
  cardIconDanger: {
    minWidth: "30px",
    height: "30px",
    borderRadius: "10px",
    display: "grid",
    placeItems: "center",
    background: "rgba(239,68,68,0.14)",
    color: "#fecaca",
    border: "1px solid rgba(239,68,68,0.28)",
    fontWeight: "900",
    padding: "0 8px",
  },
  cardIconInfo: {
    minWidth: "30px",
    height: "30px",
    borderRadius: "10px",
    display: "grid",
    placeItems: "center",
    background: "rgba(56,189,248,0.14)",
    color: "#bae6fd",
    border: "1px solid rgba(56,189,248,0.28)",
    fontWeight: "900",
    padding: "0 8px",
  },
  cardTitle: {
    fontSize: "20px",
    margin: 0,
    color: "#ffffff",
  },
  cardText: {
    color: "#cbd5e1",
    margin: 0,
    lineHeight: "1.8",
  },
  skillChipWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  skillChip: {
    padding: "9px 12px",
    borderRadius: "999px",
    border: "1px solid",
    fontSize: "14px",
    fontWeight: "800",
    lineHeight: 1,
  },
  premiumBulletList: {
    display: "grid",
    gap: "12px",
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  premiumBulletItem: {
    display: "grid",
    gridTemplateColumns: "16px 1fr",
    gap: "10px",
    color: "#cbd5e1",
    lineHeight: "1.7",
  },
  bulletDot: {
    width: "8px",
    height: "8px",
    borderRadius: "999px",
    background: "#38bdf8",
    marginTop: "9px",
    boxShadow: "0 0 14px rgba(56,189,248,0.8)",
  },
  premiumList: {
    display: "grid",
    gap: "14px",
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  premiumListItem: {
    display: "grid",
    gridTemplateColumns: "34px 1fr",
    gap: "12px",
    color: "#cbd5e1",
    lineHeight: "1.7",
  },
  listNumber: {
    width: "30px",
    height: "30px",
    borderRadius: "10px",
    display: "grid",
    placeItems: "center",
    background: "rgba(56,189,248,0.14)",
    color: "#bae6fd",
    border: "1px solid rgba(56,189,248,0.28)",
    fontWeight: "900",
    fontSize: "13px",
  },
  timeline: {
    display: "grid",
    gap: "18px",
  },
  timelineItem: {
    display: "grid",
    gridTemplateColumns: "38px 1fr",
    gap: "14px",
    position: "relative",
  },
  timelineMarker: {
    width: "36px",
    height: "36px",
    borderRadius: "12px",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #38bdf8, #8b5cf6)",
    color: "#ffffff",
    fontWeight: "900",
    boxShadow: "0 14px 30px rgba(59,130,246,0.22)",
  },
  timelineTitle: {
    margin: "0 0 4px",
    color: "#ffffff",
    fontSize: "15px",
  },
  timelineText: {
    margin: 0,
    color: "#cbd5e1",
    lineHeight: "1.7",
  },
  interviewCoachSection: {
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(6,78,59,0.2))",
    border: "1px solid rgba(16,185,129,0.25)",
    borderRadius: "28px",
    padding: "30px",
    boxShadow: "0 25px 75px rgba(0,0,0,0.28)",
  },
  interviewCoachHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: "24px",
  },
  interviewCoachTitle: {
    margin: "0 0 10px",
    fontSize: "28px",
    color: "#ffffff",
    letterSpacing: "-0.04em",
  },
  interviewCoachText: {
    margin: 0,
    color: "#cbd5e1",
    lineHeight: "1.7",
    maxWidth: "760px",
  },
  coachBadge: {
    padding: "12px 16px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #10b981, #22c55e)",
    color: "#052e16",
    fontWeight: "900",
    whiteSpace: "nowrap",
    boxShadow: "0 16px 35px rgba(16,185,129,0.22)",
  },
  interviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "18px",
  },
  interviewPanel: {
    background: "rgba(2,6,23,0.48)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "22px",
    padding: "24px",
  },
  interviewWidePanel: {
    gridColumn: "1 / -1",
    background: "rgba(2,6,23,0.48)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "22px",
    padding: "24px",
  },
  reportCta: {
    background:
      "linear-gradient(135deg, rgba(250,204,21,0.14), rgba(249,115,22,0.08))",
    borderRadius: "26px",
    padding: "30px",
    border: "1px solid rgba(250,204,21,0.28)",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "24px",
    alignItems: "center",
  },
  ctaTitle: {
    margin: "0 0 8px",
    color: "#ffffff",
    fontSize: "24px",
    letterSpacing: "-0.03em",
  },
  ctaText: {
    margin: 0,
    color: "#cbd5e1",
    lineHeight: "1.7",
  },
  ctaButton: {
    border: "none",
    borderRadius: "16px",
    padding: "16px 22px",
    background: "linear-gradient(135deg, #facc15, #f97316)",
    color: "#111827",
    fontWeight: "900",
    fontSize: "16px",
    whiteSpace: "nowrap",
  },
  errorCard: {
    background: "rgba(127,29,29,0.28)",
    border: "1px solid rgba(248,113,113,0.35)",
    padding: "25px",
    borderRadius: "20px",
    marginTop: "25px",
    marginBottom: "25px",
  },
  errorTitle: {
    color: "#fecaca",
    margin: "0 0 10px",
    fontSize: "24px",
  },
  errorText: {
    color: "#fee2e2",
    fontSize: "16px",
    marginBottom: "18px",
  },
  pricingSection: {
    background: "rgba(15,23,42,0.84)",
    padding: "36px",
    borderRadius: "26px",
    border: "1px solid rgba(148,163,184,0.22)",
    boxShadow: "0 25px 75px rgba(0,0,0,0.32)",
    marginTop: "30px",
  },
  pricingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "22px",
  },
  pricingCard: {
    border: "1px solid rgba(148,163,184,0.22)",
    borderRadius: "22px",
    padding: "28px",
    background: "rgba(2,6,23,0.45)",
  },
  premiumPricingCard: {
    border: "2px solid rgba(250,204,21,0.7)",
    borderRadius: "22px",
    padding: "28px",
    background:
      "linear-gradient(135deg, rgba(250,204,21,0.14), rgba(249,115,22,0.08))",
    position: "relative",
  },
  popularBadge: {
    position: "absolute",
    top: "-14px",
    right: "20px",
    background: "linear-gradient(135deg, #facc15, #f97316)",
    color: "#111827",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "900",
  },
  pricingTitle: {
    fontSize: "26px",
    margin: "0 0 10px",
    color: "#ffffff",
  },
  price: {
    fontSize: "40px",
    fontWeight: "900",
    margin: "0 0 18px",
    color: "#ffffff",
  },
  pricingList: {
    paddingLeft: "20px",
    lineHeight: "1.9",
    color: "#cbd5e1",
    marginBottom: "24px",
  },
  currentPlanButton: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "14px",
    background: "#475569",
    color: "white",
    fontSize: "16px",
    fontWeight: "900",
  },
  upgradeButton: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #facc15, #f97316)",
    color: "#111827",
    fontSize: "16px",
    cursor: "pointer",
    fontWeight: "900",
  },
  historySection: {
    background: "rgba(15,23,42,0.84)",
    padding: "36px",
    borderRadius: "26px",
    border: "1px solid rgba(148,163,184,0.22)",
    boxShadow: "0 25px 75px rgba(0,0,0,0.32)",
    marginTop: "30px",
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  secondaryButton: {
    padding: "13px 18px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #4f46e5, #8b5cf6)",
    color: "white",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },
  historyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "18px",
  },
  historyCard: {
    border: "1px solid rgba(148,163,184,0.2)",
    borderRadius: "20px",
    padding: "22px",
    background: "rgba(2,6,23,0.45)",
  },
  historyTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "14px",
  },
  historyRole: {
    fontSize: "18px",
    margin: "0 0 6px",
    color: "#ffffff",
  },
  historyDate: {
    fontSize: "13px",
    color: "#94a3b8",
    margin: 0,
  },
  historyScore: {
    fontSize: "30px",
    fontWeight: "900",
  },
  historyMeta: {
    fontSize: "14px",
    color: "#cbd5e1",
    lineHeight: "1.6",
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: "15px",
  },
  footer: {
    padding: "28px",
    textAlign: "center",
    color: "#94a3b8",
    background: "rgba(2,6,23,0.85)",
    borderTop: "1px solid rgba(148,163,184,0.18)",
  },
};

export default App;