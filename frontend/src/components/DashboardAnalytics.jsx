function DashboardAnalytics({ history, user, roleLabels }) {
  const safeHistory = Array.isArray(history) ? history : [];

  const totalAnalyses = safeHistory.length;

  const averageAts =
    totalAnalyses > 0
      ? Math.round(
          safeHistory.reduce(
            (sum, item) => sum + (Number(item.atsScore) || 0),
            0
          ) / totalAnalyses
        )
      : 0;

  const jdItems = safeHistory.filter((item) => Number(item.jobMatchScore) > 0);

  const averageJd =
    jdItems.length > 0
      ? Math.round(
          jdItems.reduce(
            (sum, item) => sum + (Number(item.jobMatchScore) || 0),
            0
          ) / jdItems.length
        )
      : 0;

  const bestAts =
    totalAnalyses > 0
      ? Math.max(...safeHistory.map((item) => Number(item.atsScore) || 0))
      : 0;

  const latestAnalysis = safeHistory[0] || null;
  const previousAnalysis = safeHistory[1] || null;

  const latestScore = latestAnalysis ? Number(latestAnalysis.atsScore) || 0 : 0;
  const previousScore = previousAnalysis
    ? Number(previousAnalysis.atsScore) || 0
    : 0;

  const improvement =
    latestAnalysis && previousAnalysis ? latestScore - previousScore : 0;

  const bestRoleItem =
    safeHistory.length > 0
      ? [...safeHistory].sort(
          (a, b) => (Number(b.atsScore) || 0) - (Number(a.atsScore) || 0)
        )[0]
      : null;

  const bestRoleLabel = bestRoleItem
    ? roleLabels[bestRoleItem.targetRole] || bestRoleItem.targetRole
    : "No role yet";

  const getScoreColor = (score) => {
    if (score >= 75) return "#22c55e";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const getTrendText = () => {
    if (!latestAnalysis || !previousAnalysis) {
      return "Need 2 reports";
    }

    if (improvement > 0) {
      return `+${improvement}% Improved`;
    }

    if (improvement < 0) {
      return `${improvement}% Dropped`;
    }

    return "No change";
  };

  const getTrendColor = () => {
    if (!latestAnalysis || !previousAnalysis) return "#94a3b8";
    if (improvement > 0) return "#22c55e";
    if (improvement < 0) return "#ef4444";
    return "#f59e0b";
  };

  return (
    <section style={styles.analyticsSection}>
      <div style={styles.analyticsHeader}>
        <div>
          <p style={styles.sectionEyebrow}>Dashboard Analytics</p>
          <h2 style={styles.sectionTitle}>Career Progress Overview</h2>
          <p style={styles.sectionSubtitle}>
            Track your resume improvement, ATS score, JD match progress, and best
            role alignment from your saved analysis history.
          </p>
        </div>

        <div style={styles.analyticsBadge}>
          {user?.plan === "premium" ? "Premium Analytics" : "Free Analytics"}
        </div>
      </div>

      <div style={styles.metricGrid}>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Total Reports</p>
          <h3 style={styles.metricValue}>{totalAnalyses}</h3>
          <span style={styles.metricNote}>Saved analyses</span>
        </div>

        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Average ATS</p>
          <h3 style={{ ...styles.metricValue, color: getScoreColor(averageAts) }}>
            {averageAts}%
          </h3>
          <span style={styles.metricNote}>Across latest reports</span>
        </div>

        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Average JD Match</p>
          <h3 style={{ ...styles.metricValue, color: getScoreColor(averageJd) }}>
            {jdItems.length > 0 ? `${averageJd}%` : "Not added"}
          </h3>
          <span style={styles.metricNote}>From JD-based reports</span>
        </div>

        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Best ATS Score</p>
          <h3 style={{ ...styles.metricValue, color: getScoreColor(bestAts) }}>
            {bestAts}%
          </h3>
          <span style={styles.metricNote}>Highest performance</span>
        </div>
      </div>

      <div style={styles.analyticsGrid}>
        <div style={styles.insightCard}>
          <p style={styles.insightLabel}>Best Role Match</p>
          <h3 style={styles.insightTitle}>{bestRoleLabel}</h3>
          <p style={styles.insightText}>
            This is the role where your resume currently scored the highest ATS
            match.
          </p>
        </div>

        <div style={styles.insightCard}>
          <p style={styles.insightLabel}>Latest ATS Score</p>
          <h3 style={{ ...styles.insightTitle, color: getScoreColor(latestScore) }}>
            {latestAnalysis ? `${latestScore}%` : "No report yet"}
          </h3>
          <p style={styles.insightText}>
            Your most recent resume analysis score.
          </p>
        </div>

        <div style={styles.insightCard}>
          <p style={styles.insightLabel}>Improvement Trend</p>
          <h3 style={{ ...styles.insightTitle, color: getTrendColor() }}>
            {getTrendText()}
          </h3>
          <p style={styles.insightText}>
            Compares your latest score with your previous report.
          </p>
        </div>
      </div>

      <div style={styles.progressCard}>
        <div style={styles.progressTop}>
          <div>
            <p style={styles.insightLabel}>ATS Progress Bar</p>
            <h3 style={styles.progressTitle}>Current Average ATS Strength</h3>
          </div>

          <strong style={{ color: getScoreColor(averageAts) }}>{averageAts}%</strong>
        </div>

        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressFill,
              width: `${Math.min(100, averageAts)}%`,
              background: getScoreColor(averageAts),
            }}
          ></div>
        </div>
      </div>

      <div style={styles.recentCard}>
        <div style={styles.recentHeader}>
          <p style={styles.sectionEyebrow}>Recent Reports</p>
          <h3 style={styles.recentTitle}>Latest Analysis Snapshot</h3>
        </div>

        {safeHistory.length === 0 ? (
          <p style={styles.emptyText}>
            No reports yet. Analyze a resume to unlock analytics.
          </p>
        ) : (
          <div style={styles.recentList}>
            {safeHistory.slice(0, 5).map((item) => {
              const roleName = roleLabels[item.targetRole] || item.targetRole;
              const atsScore = Number(item.atsScore) || 0;
              const jdScore = Number(item.jobMatchScore) || 0;

              return (
                <div key={item._id} style={styles.recentItem}>
                  <div>
                    <h4 style={styles.recentRole}>{roleName}</h4>
                    <p style={styles.recentDate}>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : "No date"}
                    </p>
                  </div>

                  <div style={styles.scorePills}>
                    <span
                      style={{
                        ...styles.scorePill,
                        color: getScoreColor(atsScore),
                        borderColor: `${getScoreColor(atsScore)}55`,
                        background: `${getScoreColor(atsScore)}18`,
                      }}
                    >
                      ATS {atsScore}%
                    </span>

                    <span
                      style={{
                        ...styles.scorePill,
                        color: jdScore > 0 ? getScoreColor(jdScore) : "#94a3b8",
                        borderColor:
                          jdScore > 0 ? `${getScoreColor(jdScore)}55` : "#64748b55",
                        background:
                          jdScore > 0 ? `${getScoreColor(jdScore)}18` : "#64748b18",
                      }}
                    >
                      JD {jdScore > 0 ? `${jdScore}%` : "N/A"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

const styles = {
  analyticsSection: {
    background: "rgba(15,23,42,0.84)",
    padding: "36px",
    borderRadius: "26px",
    border: "1px solid rgba(148,163,184,0.22)",
    boxShadow: "0 25px 75px rgba(0,0,0,0.32)",
    marginBottom: "30px",
  },
  analyticsHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: "24px",
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
    margin: 0,
    lineHeight: "1.7",
    maxWidth: "780px",
  },
  analyticsBadge: {
    padding: "12px 16px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #38bdf8, #8b5cf6)",
    color: "#ffffff",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "20px",
  },
  metricCard: {
    background: "rgba(2,6,23,0.48)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "20px",
    padding: "22px",
  },
  metricLabel: {
    color: "#94a3b8",
    margin: "0 0 8px",
    fontSize: "13px",
    fontWeight: "800",
  },
  metricValue: {
    color: "#ffffff",
    margin: "0 0 6px",
    fontSize: "32px",
    fontWeight: "900",
    letterSpacing: "-0.05em",
  },
  metricNote: {
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "700",
  },
  analyticsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "20px",
  },
  insightCard: {
    background:
      "linear-gradient(135deg, rgba(6,182,212,0.1), rgba(139,92,246,0.08))",
    border: "1px solid rgba(56,189,248,0.2)",
    borderRadius: "20px",
    padding: "22px",
  },
  insightLabel: {
    color: "#38bdf8",
    fontSize: "12px",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    margin: "0 0 8px",
  },
  insightTitle: {
    color: "#ffffff",
    margin: "0 0 8px",
    fontSize: "24px",
    letterSpacing: "-0.03em",
  },
  insightText: {
    color: "#cbd5e1",
    margin: 0,
    lineHeight: "1.7",
    fontSize: "14px",
  },
  progressCard: {
    background: "rgba(2,6,23,0.48)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "20px",
  },
  progressTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "center",
    marginBottom: "16px",
  },
  progressTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "22px",
  },
  progressTrack: {
    width: "100%",
    height: "14px",
    background: "rgba(148,163,184,0.18)",
    borderRadius: "999px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: "999px",
  },
  recentCard: {
    background: "rgba(2,6,23,0.48)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "20px",
    padding: "24px",
  },
  recentHeader: {
    marginBottom: "16px",
  },
  recentTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "22px",
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: "15px",
    margin: 0,
  },
  recentList: {
    display: "grid",
    gap: "12px",
  },
  recentItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "center",
    padding: "16px",
    borderRadius: "16px",
    background: "rgba(15,23,42,0.58)",
    border: "1px solid rgba(148,163,184,0.12)",
    flexWrap: "wrap",
  },
  recentRole: {
    margin: "0 0 4px",
    color: "#ffffff",
    fontSize: "16px",
  },
  recentDate: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "13px",
  },
  scorePills: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  scorePill: {
    padding: "8px 10px",
    borderRadius: "999px",
    border: "1px solid",
    fontSize: "13px",
    fontWeight: "900",
  },
};

export default DashboardAnalytics;
