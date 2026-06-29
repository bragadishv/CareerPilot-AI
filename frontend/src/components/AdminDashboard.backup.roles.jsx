import { useEffect, useState } from "react";

function AdminDashboard({ token, apiBaseUrl }) {
  const [overview, setOverview] = useState(null);
  const [latestUsers, setLatestUsers] = useState([]);
  const [latestAnalyses, setLatestAnalyses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const roleLabels = {
    fresher: "Fresher General",
    "it-support": "IT Support",
    "project-coordinator": "Project Coordinator",
    "customer-support": "Customer Support",
    "data-analyst": "Data Analyst",
  };

  const fetchAdminOverview = async () => {
    if (!token || !apiBaseUrl) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${apiBaseUrl}/api/admin/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        console.log(data.message || "Admin overview failed");
        return;
      }

      setOverview(data.overview || null);
      setLatestUsers(data.latestUsers || []);
      setLatestAnalyses(data.latestAnalyses || []);
    } catch (error) {
      console.log("Admin dashboard fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminOverview();
  }, [token, apiBaseUrl]);

  const updateUserPlan = async (userId, plan) => {
    if (!token || !apiBaseUrl || !userId) {
      alert("Missing admin access details.");
      return;
    }

    try {
      setActionLoading(userId);

      const response = await fetch(
        `${apiBaseUrl}/api/admin/users/${userId}/plan`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ plan }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        alert(data.message || "Failed to update user plan.");
        return;
      }

      alert(data.message || "User plan updated.");
      fetchAdminOverview();
    } catch (error) {
      alert("Failed to update user plan.");
    } finally {
      setActionLoading("");
    }
  };

  const getScoreColor = (score) => {
    const value = Number(score) || 0;

    if (value >= 75) return "#22c55e";
    if (value >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "No date";

    try {
      return new Date(dateValue).toLocaleString();
    } catch (error) {
      return "No date";
    }
  };

  return (
    <section style={styles.adminSection}>
      <div style={styles.adminHeader}>
        <div>
          <p style={styles.eyebrow}>Admin Dashboard</p>
          <h2 style={styles.title}>HireNexa AI Control Center</h2>
          <p style={styles.subtitle}>
            Manage users, premium access, app usage, and latest resume analysis
            reports from one admin view.
          </p>
        </div>

        <button style={styles.refreshButton} onClick={fetchAdminOverview}>
          {loading ? "Loading..." : "Refresh Admin Data"}
        </button>
      </div>

      <div style={styles.metricGrid}>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Total Users</p>
          <h3 style={styles.metricValue}>{overview?.totalUsers || 0}</h3>
        </div>

        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Premium Users</p>
          <h3 style={styles.metricValue}>{overview?.premiumUsers || 0}</h3>
        </div>

        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Free Users</p>
          <h3 style={styles.metricValue}>{overview?.freeUsers || 0}</h3>
        </div>

        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Total Analyses</p>
          <h3 style={styles.metricValue}>{overview?.totalAnalyses || 0}</h3>
        </div>
      </div>

      <div style={styles.metricGrid}>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Average ATS</p>
          <h3
            style={{
              ...styles.metricValue,
              color: getScoreColor(overview?.averageAts || 0),
            }}
          >
            {overview?.averageAts || 0}%
          </h3>
        </div>

        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Average JD Match</p>
          <h3
            style={{
              ...styles.metricValue,
              color: getScoreColor(overview?.averageJd || 0),
            }}
          >
            {overview?.averageJd || 0}%
          </h3>
        </div>

        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Best ATS</p>
          <h3
            style={{
              ...styles.metricValue,
              color: getScoreColor(overview?.bestAts || 0),
            }}
          >
            {overview?.bestAts || 0}%
          </h3>
        </div>

        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Best JD Match</p>
          <h3
            style={{
              ...styles.metricValue,
              color: getScoreColor(overview?.bestJd || 0),
            }}
          >
            {overview?.bestJd || 0}%
          </h3>
        </div>
      </div>

      <div style={styles.adminGrid}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <p style={styles.eyebrow}>Latest Users</p>
            <h3 style={styles.panelTitle}>User Management</h3>
          </div>

          {latestUsers.length === 0 ? (
            <p style={styles.emptyText}>No users found.</p>
          ) : (
            <div style={styles.list}>
              {latestUsers.map((item) => (
                <div key={item._id} style={styles.userItem}>
                  <div>
                    <h4 style={styles.itemTitle}>{item.name}</h4>
                    <p style={styles.itemText}>{item.email}</p>
                    <p style={styles.itemText}>
                      Plan: <strong>{item.plan}</strong> | Used:{" "}
                      {item.analysisCount || 0}
                    </p>
                    <p style={styles.itemDate}>{formatDate(item.createdAt)}</p>
                  </div>

                  <div style={styles.actionRow}>
                    <button
                      style={{
                        ...styles.smallButton,
                        background:
                          item.plan === "premium"
                            ? "#64748b"
                            : "linear-gradient(135deg, #facc15, #f97316)",
                        color: item.plan === "premium" ? "#e2e8f0" : "#111827",
                        cursor:
                          item.plan === "premium" ? "not-allowed" : "pointer",
                      }}
                      disabled={item.plan === "premium" || actionLoading === item._id}
                      onClick={() => updateUserPlan(item._id, "premium")}
                    >
                      {actionLoading === item._id ? "Updating..." : "Make Premium"}
                    </button>

                    <button
                      style={{
                        ...styles.smallButton,
                        background:
                          item.plan === "free"
                            ? "#64748b"
                            : "rgba(239,68,68,0.18)",
                        color: item.plan === "free" ? "#e2e8f0" : "#fecaca",
                        border: "1px solid rgba(239,68,68,0.3)",
                        cursor: item.plan === "free" ? "not-allowed" : "pointer",
                      }}
                      disabled={item.plan === "free" || actionLoading === item._id}
                      onClick={() => updateUserPlan(item._id, "free")}
                    >
                      Move Free
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <p style={styles.eyebrow}>Latest Analysis Reports</p>
            <h3 style={styles.panelTitle}>App Usage</h3>
          </div>

          {latestAnalyses.length === 0 ? (
            <p style={styles.emptyText}>No analysis reports found.</p>
          ) : (
            <div style={styles.list}>
              {latestAnalyses.map((item) => (
                <div key={item._id} style={styles.analysisItem}>
                  <div>
                    <h4 style={styles.itemTitle}>
                      {roleLabels[item.targetRole] || item.targetRole}
                    </h4>
                    <p style={styles.itemText}>
                      User: {item.user?.name || "Unknown"} —{" "}
                      {item.user?.email || "No email"}
                    </p>
                    <p style={styles.itemDate}>{formatDate(item.createdAt)}</p>
                  </div>

                  <div style={styles.scoreRow}>
                    <span
                      style={{
                        ...styles.scoreBadge,
                        color: getScoreColor(item.atsScore),
                        borderColor: `${getScoreColor(item.atsScore)}55`,
                        background: `${getScoreColor(item.atsScore)}18`,
                      }}
                    >
                      ATS {item.atsScore || 0}%
                    </span>

                    <span
                      style={{
                        ...styles.scoreBadge,
                        color: getScoreColor(item.jobMatchScore || 0),
                        borderColor: `${getScoreColor(item.jobMatchScore || 0)}55`,
                        background: `${getScoreColor(item.jobMatchScore || 0)}18`,
                      }}
                    >
                      JD {item.jobMatchScore || 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const styles = {
  adminSection: {
    background: "rgba(15,23,42,0.88)",
    padding: "36px",
    borderRadius: "26px",
    border: "1px solid rgba(250,204,21,0.28)",
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
  eyebrow: {
    color: "#facc15",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: "12px",
    margin: "0 0 8px",
  },
  title: {
    fontSize: "32px",
    margin: "0 0 10px",
    color: "#ffffff",
    letterSpacing: "-0.04em",
  },
  subtitle: {
    fontSize: "16px",
    color: "#94a3b8",
    margin: 0,
    lineHeight: "1.7",
    maxWidth: "780px",
  },
  refreshButton: {
    padding: "12px 16px",
    borderRadius: "999px",
    border: "none",
    background: "linear-gradient(135deg, #facc15, #f97316)",
    color: "#111827",
    fontWeight: "900",
    cursor: "pointer",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "16px",
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
    margin: 0,
    fontSize: "32px",
    fontWeight: "900",
    letterSpacing: "-0.05em",
  },
  adminGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginTop: "20px",
  },
  panel: {
    background: "rgba(2,6,23,0.48)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "20px",
    padding: "22px",
  },
  panelHeader: {
    marginBottom: "16px",
  },
  panelTitle: {
    color: "#ffffff",
    margin: 0,
    fontSize: "22px",
  },
  emptyText: {
    color: "#94a3b8",
    margin: 0,
  },
  list: {
    display: "grid",
    gap: "12px",
  },
  userItem: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "14px",
    alignItems: "center",
    background: "rgba(15,23,42,0.58)",
    border: "1px solid rgba(148,163,184,0.12)",
    borderRadius: "16px",
    padding: "16px",
  },
  analysisItem: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "14px",
    alignItems: "center",
    background: "rgba(15,23,42,0.58)",
    border: "1px solid rgba(148,163,184,0.12)",
    borderRadius: "16px",
    padding: "16px",
  },
  itemTitle: {
    margin: "0 0 5px",
    color: "#ffffff",
    fontSize: "16px",
  },
  itemText: {
    margin: "3px 0",
    color: "#cbd5e1",
    fontSize: "13px",
  },
  itemDate: {
    margin: "5px 0 0",
    color: "#94a3b8",
    fontSize: "12px",
  },
  actionRow: {
    display: "grid",
    gap: "8px",
  },
  smallButton: {
    padding: "9px 12px",
    borderRadius: "10px",
    border: "none",
    fontWeight: "900",
    fontSize: "12px",
  },
  scoreRow: {
    display: "grid",
    gap: "8px",
  },
  scoreBadge: {
    padding: "8px 10px",
    borderRadius: "999px",
    border: "1px solid",
    fontSize: "13px",
    fontWeight: "900",
    textAlign: "center",
  },
};

export default AdminDashboard;