function LandingPagePolish({ onStart, isPremium, user }) {
  const featureCards = [
    {
      title: "Resume Intelligence",
      text: "ATS score, missing skills, recruiter readiness, and role-based improvement suggestions in one report.",
    },
    {
      title: "Job Description Match",
      text: "Paste any real job description and compare it directly against your resume before applying.",
    },
    {
      title: "AI Resume Rewrite",
      text: "Generate improved summaries, skills, resume bullets, project bullets, LinkedIn headline, and cover note.",
    },
    {
      title: "Mock Interview Coach",
      text: "Get HR, technical, and role-specific questions with a focused preparation plan.",
    },
  ];

  const audienceCards = [
    "Freshers preparing for their first job",
    "Career switchers targeting a new role",
    "IT support and operations professionals",
    "Project coordinators and PMO aspirants",
    "Customer support and service candidates",
    "Students building a job-ready profile",
  ];

  const comparisonRows = [
    ["ATS Score", "Basic score only", "Role-based ATS score with skill gap"],
    ["JD Match", "Manual guessing", "Resume vs job description match score"],
    ["Resume Rewrite", "Generic templates", "AI-generated role-ready content"],
    ["Interview Prep", "Random questions", "Role-specific mock interview plan"],
    ["Progress Tracking", "No history", "Dashboard analytics and saved reports"],
  ];

  return (
    <section style={styles.landingWrap}>
      <div style={styles.valueBanner}>
        <div>
          <p style={styles.eyebrow}>Built to Sell as a SaaS Product</p>
          <h2 style={styles.valueTitle}>
            Turn resume confusion into a clear job-winning action plan.
          </h2>
          <p style={styles.valueText}>
            HireNexa AI helps candidates understand why their resume is not
            getting shortlisted, what skills are missing, how well they match a
            job description, and what to improve before applying.
          </p>
        </div>

        <div style={styles.valueCtaBox}>
          <p style={styles.ctaMini}>Current access</p>
          <h3 style={styles.ctaPlan}>{isPremium ? "Premium" : user ? "Free" : "Guest"}</h3>
          <p style={styles.ctaText}>
            {user
              ? "Continue improving your resume intelligence score."
              : "Create an account to start your first resume analysis."}
          </p>
          <button style={styles.primaryCta} onClick={onStart}>
            {user ? "Open Resume Analyzer" : "Start Free Analysis"}
          </button>
        </div>
      </div>

      <div style={styles.problemSolutionGrid}>
        <div style={styles.problemCard}>
          <p style={styles.cardTag}>The Problem</p>
          <h3 style={styles.cardTitle}>Most candidates apply blindly.</h3>
          <p style={styles.cardText}>
            They send the same resume everywhere without knowing ATS gaps,
            missing keywords, job description mismatch, or interview weakness.
          </p>
        </div>

        <div style={styles.solutionCard}>
          <p style={styles.cardTag}>The Solution</p>
          <h3 style={styles.cardTitle}>HireNexa AI gives a complete roadmap.</h3>
          <p style={styles.cardText}>
            The platform converts a resume into an ATS report, JD match report,
            rewritten resume content, mock interview plan, and progress dashboard.
          </p>
        </div>
      </div>

      <div style={styles.featureSection}>
        <div style={styles.centerHeader}>
          <p style={styles.eyebrow}>Why Candidates Pay</p>
          <h2 style={styles.sectionTitle}>One platform for resume, job match, and interview readiness</h2>
          <p style={styles.sectionSubtitle}>
            Designed for job seekers who need practical guidance, not generic advice.
          </p>
        </div>

        <div style={styles.featureCardsGrid}>
          {featureCards.map((item) => (
            <div key={item.title} style={styles.featureCard}>
              <div style={styles.featureIcon}>✓</div>
              <h3 style={styles.featureTitle}>{item.title}</h3>
              <p style={styles.featureText}>{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.comparisonSection}>
        <div style={styles.centerHeader}>
          <p style={styles.eyebrow}>Clear Product Positioning</p>
          <h2 style={styles.sectionTitle}>Before HireNexa AI vs After HireNexa AI</h2>
        </div>

        <div style={styles.comparisonTable}>
          <div style={styles.tableHeader}>Feature</div>
          <div style={styles.tableHeader}>Without HireNexa AI</div>
          <div style={styles.tableHeader}>With HireNexa AI</div>

          {comparisonRows.map((row) => (
            <>
              <div style={styles.tableCellStrong}>{row[0]}</div>
              <div style={styles.tableCell}>{row[1]}</div>
              <div style={styles.tableCellHighlight}>{row[2]}</div>
            </>
          ))}
        </div>
      </div>

      <div style={styles.audienceSection}>
        <div>
          <p style={styles.eyebrow}>Who This Is For</p>
          <h2 style={styles.sectionTitle}>Built for real job seekers</h2>
          <p style={styles.sectionSubtitle}>
            The product is simple enough for freshers and powerful enough for
            career switchers who want role-specific guidance.
          </p>
        </div>

        <div style={styles.audienceGrid}>
          {audienceCards.map((item) => (
            <div key={item} style={styles.audiencePill}>{item}</div>
          ))}
        </div>
      </div>

      <div style={styles.pricingCta}>
        <div>
          <p style={styles.eyebrow}>Simple Offer</p>
          <h2 style={styles.finalTitle}>Free analysis first. Premium when the candidate is ready.</h2>
          <p style={styles.finalText}>
            Free users get limited analysis. Premium unlocks unlimited reports,
            JD matching, AI resume rewrite, copy-ready content, privacy-safe PDF,
            dashboard analytics, and interview preparation.
          </p>
        </div>

        <button style={styles.finalButton} onClick={onStart}>
          {isPremium ? "Use Premium Features" : "Try HireNexa AI Now"}
        </button>
      </div>
    </section>
  );
}

const styles = {
  landingWrap: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 20px 42px",
  },
  valueBanner: {
    display: "grid",
    gridTemplateColumns: "1.4fr 0.6fr",
    gap: "24px",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.82))",
    border: "1px solid rgba(148,163,184,0.24)",
    borderRadius: "30px",
    padding: "34px",
    boxShadow: "0 28px 85px rgba(0,0,0,0.32)",
    marginBottom: "22px",
  },
  eyebrow: {
    color: "#38bdf8",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: "12px",
    margin: "0 0 10px",
  },
  valueTitle: {
    color: "#ffffff",
    fontSize: "36px",
    lineHeight: "1.1",
    margin: "0 0 14px",
    letterSpacing: "-0.05em",
  },
  valueText: {
    color: "#cbd5e1",
    fontSize: "16px",
    lineHeight: "1.8",
    margin: 0,
  },
  valueCtaBox: {
    background: "rgba(2,6,23,0.5)",
    border: "1px solid rgba(56,189,248,0.24)",
    borderRadius: "24px",
    padding: "24px",
  },
  ctaMini: {
    color: "#94a3b8",
    margin: "0 0 6px",
    fontSize: "13px",
    fontWeight: "800",
  },
  ctaPlan: {
    color: "#ffffff",
    margin: "0 0 8px",
    fontSize: "30px",
  },
  ctaText: {
    color: "#cbd5e1",
    margin: "0 0 18px",
    lineHeight: "1.6",
  },
  primaryCta: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #38bdf8, #3b82f6, #8b5cf6)",
    color: "#ffffff",
    fontWeight: "900",
    cursor: "pointer",
    fontSize: "15px",
  },
  problemSolutionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "18px",
    marginBottom: "22px",
  },
  problemCard: {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.22)",
    borderRadius: "24px",
    padding: "26px",
  },
  solutionCard: {
    background: "rgba(34,197,94,0.1)",
    border: "1px solid rgba(34,197,94,0.22)",
    borderRadius: "24px",
    padding: "26px",
  },
  cardTag: {
    color: "#e2e8f0",
    margin: "0 0 8px",
    fontWeight: "900",
    fontSize: "13px",
  },
  cardTitle: {
    color: "#ffffff",
    margin: "0 0 10px",
    fontSize: "24px",
    letterSpacing: "-0.03em",
  },
  cardText: {
    color: "#cbd5e1",
    lineHeight: "1.7",
    margin: 0,
  },
  featureSection: {
    background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "28px",
    padding: "32px",
    marginBottom: "22px",
  },
  centerHeader: {
    textAlign: "center",
    maxWidth: "820px",
    margin: "0 auto 24px",
  },
  sectionTitle: {
    color: "#ffffff",
    margin: "0 0 10px",
    fontSize: "32px",
    letterSpacing: "-0.05em",
    lineHeight: "1.15",
  },
  sectionSubtitle: {
    color: "#94a3b8",
    margin: 0,
    fontSize: "16px",
    lineHeight: "1.7",
  },
  featureCardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
  },
  featureCard: {
    background: "rgba(2,6,23,0.46)",
    border: "1px solid rgba(148,163,184,0.14)",
    borderRadius: "20px",
    padding: "22px",
  },
  featureIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "12px",
    display: "grid",
    placeItems: "center",
    background: "rgba(34,197,94,0.16)",
    color: "#bbf7d0",
    fontWeight: "900",
    marginBottom: "14px",
  },
  featureTitle: {
    color: "#ffffff",
    margin: "0 0 8px",
    fontSize: "18px",
  },
  featureText: {
    color: "#94a3b8",
    margin: 0,
    lineHeight: "1.65",
    fontSize: "14px",
  },
  comparisonSection: {
    background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "28px",
    padding: "32px",
    marginBottom: "22px",
  },
  comparisonTable: {
    display: "grid",
    gridTemplateColumns: "0.75fr 1fr 1fr",
    overflow: "hidden",
    borderRadius: "18px",
    border: "1px solid rgba(148,163,184,0.18)",
  },
  tableHeader: {
    background: "rgba(56,189,248,0.14)",
    color: "#e0f2fe",
    padding: "15px",
    fontWeight: "900",
    borderBottom: "1px solid rgba(148,163,184,0.14)",
  },
  tableCellStrong: {
    color: "#ffffff",
    padding: "15px",
    fontWeight: "900",
    borderBottom: "1px solid rgba(148,163,184,0.1)",
    background: "rgba(2,6,23,0.35)",
  },
  tableCell: {
    color: "#94a3b8",
    padding: "15px",
    borderBottom: "1px solid rgba(148,163,184,0.1)",
    background: "rgba(2,6,23,0.2)",
  },
  tableCellHighlight: {
    color: "#bbf7d0",
    padding: "15px",
    borderBottom: "1px solid rgba(148,163,184,0.1)",
    background: "rgba(34,197,94,0.08)",
    fontWeight: "800",
  },
  audienceSection: {
    display: "grid",
    gridTemplateColumns: "0.8fr 1.2fr",
    gap: "22px",
    background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "28px",
    padding: "32px",
    marginBottom: "22px",
  },
  audienceGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  audiencePill: {
    background: "rgba(2,6,23,0.45)",
    border: "1px solid rgba(56,189,248,0.18)",
    borderRadius: "16px",
    padding: "16px",
    color: "#e2e8f0",
    fontWeight: "800",
  },
  pricingCta: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "22px",
    alignItems: "center",
    background: "linear-gradient(135deg, rgba(56,189,248,0.18), rgba(139,92,246,0.18))",
    border: "1px solid rgba(56,189,248,0.24)",
    borderRadius: "28px",
    padding: "32px",
  },
  finalTitle: {
    color: "#ffffff",
    margin: "0 0 10px",
    fontSize: "30px",
    letterSpacing: "-0.04em",
  },
  finalText: {
    color: "#cbd5e1",
    lineHeight: "1.7",
    margin: 0,
  },
  finalButton: {
    padding: "16px 22px",
    borderRadius: "16px",
    border: "none",
    background: "linear-gradient(135deg, #facc15, #f97316)",
    color: "#111827",
    fontSize: "16px",
    fontWeight: "900",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};

export default LandingPagePolish;
