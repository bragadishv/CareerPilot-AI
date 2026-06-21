import { useEffect, useState } from "react";
import jsPDF from "jspdf";

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
          ? "http://localhost:5000/api/auth/signup"
          : "http://localhost:5000/api/auth/login";

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

      const response = await fetch("http://localhost:5000/api/analysis-history", {
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
        "http://localhost:5000/api/payment/create-order",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        alert(orderData.message || "Failed to create payment order.");
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
              "http://localhost:5000/api/payment/verify",
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

      const response = await fetch("http://localhost:5000/api/upload-resume", {
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

      const response = await fetch("http://localhost:5000/api/analyze-resume", {
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
    if (score >= 75) return "#16a34a";
    if (score >= 50) return "#ca8a04";
    return "#dc2626";
  };

  const getScoreMessage = (score) => {
    if (score >= 75) return "Strong resume match for this role";
    if (score >= 50) return "Good start, but needs improvement";
    return "Needs more role-specific keywords";
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "No date";
    return new Date(dateValue).toLocaleString();
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
      const lines = doc.splitTextToSize(text, maxWidth);
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

    addTitle("CareerPilot AI Resume Report");
    addSmallText(`User: ${user?.name || "CareerPilot User"}`);
    addSmallText(`Email: ${user?.email || "Not available"}`);
    addSmallText(`Plan: ${user?.plan || "free"}`);
    addSmallText(`Target Role: ${roleLabels[targetRole] || "Fresher General"}`);
    addSmallText(`ATS Score: ${result.atsScore}%`);
    addSmallText(`Generated Date: ${new Date().toLocaleDateString()}`);

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

    addSectionTitle("Skill Gap Action Plan");
    addList(result.skillGapPlan);

    addSectionTitle("Resume Text Used For Analysis");
    addSmallText(resumeText);

    doc.save("CareerPilot-AI-Resume-Report.pdf");
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.logo}>CareerPilot AI</div>

        <div style={styles.headerRight}>
          {user && (
            <div
              style={{
                ...styles.planBadge,
                background: isPremium ? "#fef3c7" : "#dbeafe",
                color: isPremium ? "#92400e" : "#1d4ed8",
              }}
            >
              {isPremium ? "Premium Plan" : "Free Plan"}
            </div>
          )}

          <div style={styles.headerBadge}>AI Job Accelerator</div>

          {user && (
            <button style={styles.logoutButton} onClick={logout}>
              Logout
            </button>
          )}
        </div>
      </header>

      <section style={styles.hero}>
        <div style={styles.heroText}>
          <p style={styles.smallTag}>
            For Freshers, Job Seekers & Career Switchers
          </p>
          <h1 style={styles.heroTitle}>
            Analyze your resume and get a career improvement plan instantly
          </h1>
          <p style={styles.heroSubtitle}>
            Upload your resume, check ATS score, identify missing skills,
            generate interview questions, and download a complete PDF career report.
          </p>

          <div style={styles.featureGrid}>
            <div style={styles.featureCard}>ATS Score</div>
            <div style={styles.featureCard}>Skill Gap</div>
            <div style={styles.featureCard}>Career Roadmap</div>
            <div style={styles.featureCard}>Premium PDF Report</div>
          </div>
        </div>
      </section>

      <main style={styles.main}>
        {!user && (
          <section style={styles.authCard}>
            <h2 style={styles.sectionTitle}>
              {authMode === "login"
                ? "Login to CareerPilot AI"
                : "Create Your Account"}
            </h2>

            <p style={styles.sectionSubtitle}>
              Login is required to upload resumes, save reports, and view analysis history.
            </p>

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
                  <h2 style={styles.welcomeTitle}>Welcome, {user.name} 👋</h2>
                  <p style={styles.sectionSubtitle}>
                    Your reports are saved under: {user.email}
                  </p>
                </div>

                <div
                  style={{
                    ...styles.planBox,
                    borderColor: isPremium ? "#f59e0b" : "#2563eb",
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

            <section style={styles.formCard}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Resume Analyzer</h2>
                <p style={styles.sectionSubtitle}>
                  Select a target role, upload your resume PDF, and generate your analysis.
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
                {uploading ? "Extracting Resume Text..." : "Upload PDF & Extract Text"}
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
                    result && result.success && isPremium ? "#111827" : "#9ca3af",
                  cursor:
                    result && result.success && isPremium ? "pointer" : "not-allowed",
                }}
                onClick={downloadPDFReport}
              >
                Download PDF Report {isPremium ? "" : "(Premium)"}
              </button>
            </section>
          </>
        )}

        {result && result.success && (
          <section style={styles.resultSection}>
            <div style={styles.scoreCard}>
              <p style={styles.scoreLabel}>ATS Score</p>
              <h2
                style={{
                  ...styles.scoreValue,
                  color: getScoreColor(result.atsScore),
                }}
              >
                {result.atsScore}%
              </h2>
              <p style={styles.scoreMessage}>
                {getScoreMessage(result.atsScore)}
              </p>
              <p style={styles.roleText}>
                Target Role: {roleLabels[targetRole] || "Fresher General"}
              </p>
            </div>

            <div style={styles.resultGrid}>
              <div style={styles.resultCard}>
                <h3 style={styles.cardTitle}>Matched Skills</h3>
                <p style={styles.cardText}>
                  {result.matchedSkills && result.matchedSkills.length > 0
                    ? result.matchedSkills.join(", ")
                    : "No matched skills found"}
                </p>
              </div>

              <div style={styles.resultCard}>
                <h3 style={styles.cardTitle}>Missing Skills</h3>
                <p style={styles.cardText}>
                  {result.missingSkills && result.missingSkills.length > 0
                    ? result.missingSkills.join(", ")
                    : "No missing skills"}
                </p>
              </div>

              <div style={styles.resultCard}>
                <h3 style={styles.cardTitle}>Suggestions</h3>
                <ul style={styles.list}>
                  {(result.suggestions || []).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              <div style={styles.resultCard}>
                <h3 style={styles.cardTitle}>Career Roadmap</h3>
                <ol style={styles.list}>
                  {(result.roadmap || []).map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>

              <div style={styles.resultCard}>
                <h3 style={styles.cardTitle}>Interview Questions</h3>
                <ol style={styles.list}>
                  {(result.interviewQuestions || []).map((question, index) => (
                    <li key={index}>{question}</li>
                  ))}
                </ol>
              </div>

              <div style={styles.resultCard}>
                <h3 style={styles.cardTitle}>Skill Gap Action Plan</h3>
                <ol style={styles.list}>
                  {(result.skillGapPlan || []).map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        )}

        {result && !result.success && (
          <section style={styles.errorCard}>
            <h3 style={styles.errorTitle}>
              {result.limitReached ? "Free Plan Limit Reached" : "Something went wrong"}
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
              <h2 style={styles.sectionTitle}>Pricing Plans</h2>
              <p style={styles.sectionSubtitle}>
                Start free. Upgrade when you need unlimited analysis and PDF reports.
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
                  <li>Premium PDF report download</li>
                  <li>Extended analysis history</li>
                  <li>Interview preparation questions</li>
                  <li>Career roadmap and action plan</li>
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
                <h2 style={styles.sectionTitle}>My Analysis History</h2>
                <p style={styles.sectionSubtitle}>
                  Free users see latest 3 records. Premium users see extended history.
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
        CareerPilot AI — Built for resume analysis, career planning, and job preparation.
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#eef2ff",
    fontFamily: "Arial, sans-serif",
    color: "#111827",
  },
  header: {
    width: "100%",
    padding: "18px 8%",
    background: "#ffffff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  logo: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#111827",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  planBadge: {
    padding: "8px 14px",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: "bold",
  },
  headerBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "8px 14px",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: "bold",
  },
  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "9px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  hero: {
    padding: "60px 8% 35px",
    textAlign: "center",
  },
  heroText: {
    maxWidth: "950px",
    margin: "0 auto",
  },
  smallTag: {
    display: "inline-block",
    background: "#e0e7ff",
    color: "#3730a3",
    padding: "8px 14px",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "18px",
  },
  heroTitle: {
    fontSize: "48px",
    lineHeight: "1.1",
    margin: "0 0 18px",
    color: "#111827",
  },
  heroSubtitle: {
    fontSize: "18px",
    lineHeight: "1.7",
    maxWidth: "760px",
    margin: "0 auto",
    color: "#4b5563",
  },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "14px",
    marginTop: "30px",
  },
  featureCard: {
    background: "#ffffff",
    padding: "18px",
    borderRadius: "14px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    fontWeight: "bold",
    color: "#1f2937",
  },
  main: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "20px 20px 50px",
  },
  authCard: {
    background: "#ffffff",
    padding: "35px",
    borderRadius: "20px",
    boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
    marginBottom: "30px",
  },
  userCard: {
    background: "#ffffff",
    padding: "25px 35px",
    borderRadius: "20px",
    boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
    marginBottom: "30px",
  },
  userTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: "28px",
    margin: "0 0 8px",
  },
  planBox: {
    minWidth: "180px",
    border: "2px solid #2563eb",
    borderRadius: "16px",
    padding: "16px",
    background: "#f9fafb",
  },
  planLabel: {
    margin: "0 0 4px",
    color: "#6b7280",
    fontSize: "13px",
  },
  planName: {
    margin: "0 0 8px",
    fontSize: "24px",
  },
  planUsage: {
    margin: "4px 0",
    fontSize: "14px",
    color: "#374151",
  },
  limitNotice: {
    background: "#fff7ed",
    color: "#9a3412",
    padding: "14px",
    borderRadius: "12px",
    marginTop: "16px",
    fontWeight: "bold",
  },
  premiumNotice: {
    background: "#ecfdf5",
    color: "#047857",
    padding: "14px",
    borderRadius: "12px",
    marginTop: "16px",
    fontWeight: "bold",
  },
  formCard: {
    background: "#ffffff",
    padding: "35px",
    borderRadius: "20px",
    boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
    marginBottom: "30px",
  },
  sectionHeader: {
    marginBottom: "25px",
  },
  sectionTitle: {
    fontSize: "30px",
    margin: "0 0 8px",
  },
  sectionSubtitle: {
    fontSize: "16px",
    color: "#6b7280",
    margin: "0 0 20px",
  },
  label: {
    display: "block",
    fontSize: "16px",
    fontWeight: "bold",
    color: "#111827",
    marginBottom: "8px",
  },
  input: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    marginBottom: "18px",
    background: "#ffffff",
  },
  select: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    marginBottom: "20px",
    background: "#ffffff",
  },
  fileInput: {
    width: "100%",
    padding: "14px",
    fontSize: "15px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    marginBottom: "8px",
    background: "#ffffff",
  },
  fileName: {
    fontSize: "14px",
    color: "#4b5563",
    marginBottom: "14px",
  },
  textarea: {
    width: "100%",
    minHeight: "220px",
    padding: "15px",
    fontSize: "16px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    resize: "vertical",
    marginBottom: "20px",
  },
  uploadButton: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background: "#059669",
    color: "white",
    fontSize: "17px",
    cursor: "pointer",
    marginBottom: "20px",
    fontWeight: "bold",
  },
  primaryButton: {
    width: "100%",
    padding: "15px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "white",
    fontSize: "17px",
    cursor: "pointer",
    marginBottom: "12px",
    fontWeight: "bold",
  },
  switchButton: {
    width: "100%",
    padding: "13px",
    border: "1px solid #c7d2fe",
    borderRadius: "10px",
    background: "#eef2ff",
    color: "#3730a3",
    fontSize: "16px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  downloadButton: {
    width: "100%",
    padding: "15px",
    border: "none",
    borderRadius: "10px",
    color: "white",
    fontSize: "17px",
    marginBottom: "5px",
    fontWeight: "bold",
  },
  resultSection: {
    marginTop: "30px",
  },
  scoreCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "30px",
    boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
    textAlign: "center",
    marginBottom: "25px",
  },
  scoreLabel: {
    fontSize: "16px",
    color: "#6b7280",
    margin: 0,
  },
  scoreValue: {
    fontSize: "56px",
    margin: "10px 0",
  },
  scoreMessage: {
    fontSize: "18px",
    fontWeight: "bold",
    margin: "0 0 8px",
  },
  roleText: {
    color: "#4b5563",
    margin: 0,
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "20px",
  },
  resultCard: {
    background: "#ffffff",
    padding: "24px",
    borderRadius: "18px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.07)",
    lineHeight: "1.6",
  },
  cardTitle: {
    fontSize: "20px",
    marginTop: 0,
    marginBottom: "12px",
    color: "#111827",
  },
  cardText: {
    color: "#374151",
    margin: 0,
  },
  list: {
    paddingLeft: "20px",
    margin: 0,
    color: "#374151",
  },
  errorCard: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    padding: "25px",
    borderRadius: "18px",
    marginTop: "25px",
    marginBottom: "25px",
  },
  errorTitle: {
    color: "#be123c",
    margin: "0 0 10px",
    fontSize: "24px",
  },
  errorText: {
    color: "#9f1239",
    fontSize: "16px",
    marginBottom: "18px",
  },
  pricingSection: {
    background: "#ffffff",
    padding: "35px",
    borderRadius: "20px",
    boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
    marginTop: "30px",
  },
  pricingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "22px",
  },
  pricingCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "26px",
    background: "#f9fafb",
  },
  premiumPricingCard: {
    border: "2px solid #f59e0b",
    borderRadius: "18px",
    padding: "26px",
    background: "#fffbeb",
    position: "relative",
  },
  popularBadge: {
    position: "absolute",
    top: "-14px",
    right: "20px",
    background: "#f59e0b",
    color: "#111827",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "bold",
  },
  pricingTitle: {
    fontSize: "26px",
    margin: "0 0 10px",
  },
  price: {
    fontSize: "36px",
    fontWeight: "bold",
    margin: "0 0 18px",
  },
  pricingList: {
    paddingLeft: "20px",
    lineHeight: "1.8",
    color: "#374151",
    marginBottom: "24px",
  },
  currentPlanButton: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background: "#6b7280",
    color: "white",
    fontSize: "16px",
    fontWeight: "bold",
  },
  upgradeButton: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background: "#f59e0b",
    color: "#111827",
    fontSize: "16px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  historySection: {
    background: "#ffffff",
    padding: "35px",
    borderRadius: "20px",
    boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
    marginTop: "30px",
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  },
  secondaryButton: {
    padding: "12px 18px",
    border: "none",
    borderRadius: "10px",
    background: "#4f46e5",
    color: "white",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },
  historyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "18px",
  },
  historyCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "20px",
    background: "#f9fafb",
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
  },
  historyDate: {
    fontSize: "13px",
    color: "#6b7280",
    margin: 0,
  },
  historyScore: {
    fontSize: "28px",
    fontWeight: "bold",
  },
  historyMeta: {
    fontSize: "14px",
    color: "#374151",
    lineHeight: "1.5",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: "15px",
  },
  footer: {
    padding: "25px",
    textAlign: "center",
    color: "#6b7280",
    background: "#ffffff",
    borderTop: "1px solid #e5e7eb",
  },
};

export default App;