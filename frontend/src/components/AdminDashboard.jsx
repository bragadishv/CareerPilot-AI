import { useEffect, useState } from "react";

function AdminDashboard({ token, apiBaseUrl, roleLabels }) {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const fetchAdminOverview = async () => {
    if (!token) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${apiBaseUrl}/api/admin/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Failed to load admin dashboard.");
        return;
      }

      setAdminData(data);
    } catch (err) {
      setError("Failed to connect to admin API. Please check backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminOverview();
  }, [token]);

  const updateUserPlan = async (userId, plan) => {
    if (!userId || !plan) {
      return;
    }

    const confirmMessage =
      plan === "premium"
        ? "Make this user Premium?"
        : "Move this user back to Free plan?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setActionLoading(`${userId}-${plan}`);

      const response = await fetch(`${apiBaseUrl}/api/admin/users/${userId}/plan`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.message || "Failed to update user plan.");
        return;
      }

      alert(data.message || "User plan updated successfully.");
      fetchAdminOverview();
    } catch (err) {
      alert("Failed to update user plan. Please try again.");
    } finally {
      setActionLoading("");
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return "#22c55e";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "No date";
    return new Date(dateValue).toLocaleString();
  };

  const overview = adminData?.overview || {};
  const latestUsers = adminData?.latestUsers || [];
  const latestAnalyses = adminData?.latestAnalyses || [];

  return (
    <section style={styles.adminSection}>
      <div style={styles.adminHeader}>
        <div>
          <p style={styles.sectionEyebrow}>Admin Dashboard</p>
          <h2 style={styles.sectionTitle}>HireNexa AI Control Center</h2>
          <p style={styles.sectionSubtitle}>
            Track users, premium plans, resume analyses, ATS performance, and latest platform activity.
          </p>
        </div>

        <button style={styles.refreshButton} onClick={fetchAdminOverview}>
          {loading ? "Loading..." : "Refresh Admin Data"}
        </button>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <strong>Admin Error:</strong> {error}
        </div>
      )}

      {!error && (
        <>
          <div style={styles.metricGrid}>
            <div style={styles.metricCard}>
              <p style={styles.metricLabel}>Total Users</p>
              <h3 style={styles.metricValue}>{overview.totalUsers || 0}</h3>
              <span style={styles.metricNote}>Registered accounts</span>
            </div>

            <div style={styles.metricCard}>
              <p style={styles.metricLabel}>Premium Users</p>
              <h3 style={styles.metricValueGold}>{overview.premiumUsers || 0}</h3>
              <span style={styles.metricNote}>Paid or activated users</span>
            </div>

            <div style={styles.metricCard}>
              <p style={styles.metricLabel}>Free Users</p>
              <h3 style={styles.metricValue}>{overview.freeUsers || 0}</h3>
              <span style={styles.metricNote}>Free plan accounts</span>
            </div>

            <div style={styles.metricCard}>
              <p style={styles.metricLabel}>Total Analyses</p>
              <h3 style={styles.metricValue}>{overview.totalAnalyses || 0}</h3>
              <span style={styles.metricNote}>Resume reports generated</span>
            </div>
          </div>

          <div style={styles.metricGrid}>
            <div style={styles.metricCard}>
              <p style={styles.metricLabel}>Average ATS</p>
              <h3
                style={{
                  ...styles.metricValue,
                  color: getScoreColor(Number(overview.averageAts) || 0),
                }}
              >
                {overview.averageAts || 0}%
              </h3>
              <span style={styles.metricNote}>Across all reports</span>
            </div>

            <div style={styles.metricCard}>
              <p style={styles.metricLabel}>Average JD Match</p>
              <h3
                style={{
                  ...styles.metricValue,
                  color: getScoreColor(Number(overview.averageJd) || 0),
                }}
              >
                {overview.averageJd || 0}%
              </h3>
              <span style={styles.metricNote}>Across JD reports</span>
            </div>

            <div style={styles.metricCard}>
              <p style={styles.metricLabel}>Best ATS</p>
              <h3
                style={{
                  ...styles.metricValue,
                  color: getScoreColor(Number(overview.bestAts) || 0),
                }}
              >
                {overview.bestAts || 0}%
              </h3>
              <span style={styles.metricNote}>Highest ATS score</span>
            </div>

            <div style={styles.metricCard}>
              <p style={styles.metricLabel}>Best JD Match</p>
              <h3
                style={{
                  ...styles.metricValue,
                  color: getScoreColor(Number(overview.bestJd) || 0),
                }}
              >
                {overview.bestJd || 0}%
              </h3>
              <span style={styles.metricNote}>Highest JD match score</span>
            </div>
          </div>

          <div style={styles.adminGrid}>
            <div style={styles.adminPanel}>
              <div style={styles.panelHeader}>
                <div>
                  <p style={styles.sectionEyebrow}>User Management</p>
                  <h3 style={styles.panelTitle}>Latest Users</h3>
                </div>
              </div>

              {latestUsers.length === 0 ? (
                <p style={styles.emptyText}>No users found.</p>
              ) : (
                <div style={styles.listWrap}>
                  {latestUsers.map((item) => {
                    const isPremiumUser = item.plan === "premium";
                    const nextPlan = isPremiumUser ? "free" : "premium";
                    const buttonKey = `${item._id}-${nextPlan}`;

                    return (
                      <div key={item._id} style={styles.userRow}>
                        <div style={styles.userInfo}>
                          <h4 style={styles.userName}>{item.name}</h4>
                          <p style={styles.userEmail}>{item.email}</p>
                          <p style={styles.userMeta}>
                            Joined: {formatDate(item.createdAt)} | Analyses: {item.analysisCount || 0}
                          </p>
                        </div>

                        <div style={styles.userActions}>
                          <span
                            style={{
                              ...styles.planPill,
                              background: isPremiumUser
                                ? "rgba(250,204,21,0.16)"
                                : "rgba(59,130,246,0.14)",
                              color: isPremiumUser ? "#fde68a" : "#bfdbfe",
                              borderColor: isPremiumUser
                                ? "rgba(250,204,21,0.35)"
                                : "rgba(59,130,246,0.28)",
                            }}
                          >
                            {isPremiumUser ? "Premium" : "Free"}
                          </span>

                          <button
                            style={isPremiumUser ? styles.freeButton : styles.premiumButton}
                            onClick={() => updateUserPlan(item._id, nextPlan)}
                          >
                            {actionLoading === buttonKey
                              ? "Updating..."
                              : isPremiumUser
                              ? "Move Free"
                              : "Make Premium"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={styles.adminPanel}>
              <div style={styles.panelHeader}>
                <div>
                  <p style={styles.sectionEyebrow}>App Usage</p>
                  <h3 style={styles.panelTitle}>Latest Analysis Reports</h3>
                </div>
              </div>

              {latestAnalyses.length === 0 ? (
                <p style={styles.emptyText}>No analyses found.</p>
              ) : (
                <div style={styles.listWrap}>
                  {latestAnalyses.map((item) => {
                    const roleName = roleLabels[item.targetRole] || item.targetRole;
                    const atsScore = Number(item.atsScore) || 0;
                    const jdScore = Number(item.jobMatchScore) || 0;

                    return (
                      <div key={item._id} style={styles.analysisRow}>
                        <div>
                          <h4 style={styles.userName}>{roleName}</h4>
                          <p style={styles.userEmail}>
                            {item.user?.name || "Unknown User"} • {item.user?.email || "No email"}
                          </p>
                          <p style={styles.userMeta}>{formatDate(item.createdAt)}</p>
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
                              borderColor: jdScore > 0 ? `${getScoreColor(jdScore)}55` : "#64748b55",
                              background: jdScore > 0 ? `${getScoreColor(jdScore)}18` : "#64748b18",
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
          </div>
        </>
      )}
    </section>
  );
}

const styles = {
  adminSection: {
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(88,28,135,0.18), rgba(234,88,12,0.1))",
    padding: "36px",
    borderRadius: "26px",
    border: "1px solid rgba(251,146,60,0.28)",
    boxShadow: "0 25px 75px rgba(0,0,0,0.32)",
    marginBottom: "30px",
  },
  adminHeader: {
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
  refreshButton: {
    padding: "13px 18px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #f97316, #facc15)",
    color: "#111827",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },
  errorBox: {
    background: "rgba(127,29,29,0.28)",
    border: "1px solid rgba(248,113,113,0.35)",
    color: "#fecaca",
    padding: "16px",
    borderRadius: "16px",
    lineHeight: "1.7",
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
  metricValueGold: {
    color: "#facc15",
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
  adminGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "20px",
  },
  adminPanel: {
    background: "rgba(2,6,23,0.5)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "22px",
    padding: "24px",
  },
  panelHeader: {
    marginBottom: "18px",
  },
  panelTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "23px",
    letterSpacing: "-0.03em",
  },
  emptyText: {
    color: "#94a3b8",
    margin: 0,
    lineHeight: "1.7",
  },
  listWrap: {
    display: "grid",
    gap: "12px",
  },
  userRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "center",
    padding: "16px",
    borderRadius: "16px",
    background: "rgba(15,23,42,0.6)",
    border: "1px solid rgba(148,163,184,0.12)",
    flexWrap: "wrap",
  },
  analysisRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "center",
    padding: "16px",
    borderRadius: "16px",
    background: "rgba(15,23,42,0.6)",
    border: "1px solid rgba(148,163,184,0.12)",
    flexWrap: "wrap",
  },
  userInfo: {
    minWidth: "220px",
  },
  userName: {
    margin: "0 0 5px",
    color: "#ffffff",
    fontSize: "16px",
  },
  userEmail: {
    margin: "0 0 5px",
    color: "#cbd5e1",
    fontSize: "13px",
    wordBreak: "break-word",
  },
  userMeta: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "12px",
    lineHeight: "1.5",
  },
  userActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  planPill: {
    padding: "8px 10px",
    borderRadius: "999px",
    border: "1px solid",
    fontSize: "12px",
    fontWeight: "900",
  },
  premiumButton: {
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #facc15, #f97316)",
    color: "#111827",
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: "900",
    fontSize: "13px",
  },
  freeButton: {
    border: "1px solid rgba(148,163,184,0.25)",
    borderRadius: "12px",
    background: "rgba(15,23,42,0.7)",
    color: "#cbd5e1",
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: "900",
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

export default AdminDashboard;
