import { useState } from "react";

function LiveAIMockInterview({
  token,
  apiBaseUrl,
  resumeText,
  targetRole,
  jobDescription,
  result,
}) {
  const [loading, setLoading] = useState(false);
  const [aiInterview, setAiInterview] = useState(null);
  const [error, setError] = useState("");
  const [selectedMockAnswers, setSelectedMockAnswers] = useState({});

  const generateLiveMockInterview = async () => {
    if (!token) {
      alert("Please login first.");
      return;
    }

    if (!resumeText || !resumeText.trim()) {
      alert("Please upload or paste resume text first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setAiInterview(null);
      setSelectedMockAnswers({});

      const response = await fetch(`${apiBaseUrl}/api/gemini/mock-interview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeText,
          targetRole,
          jobDescription,
          matchedSkills: result?.matchedSkills || [],
          missingSkills: result?.missingSkills || [],
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Gemini AI mock interview failed.");
        return;
      }

      setAiInterview(data.aiMockInterview);
    } catch (error) {
      setError("Failed to connect to Gemini AI mock interview backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleMockAnswerSelect = (questionIndex, selectedOption) => {
    setSelectedMockAnswers((previousAnswers) => ({
      ...previousAnswers,
      [questionIndex]: selectedOption,
    }));
  };

  const normalizeText = (text) => {
    return String(text || "").trim().toLowerCase();
  };

  const isCorrectAnswer = (selectedOption, correctAnswer) => {
    return normalizeText(selectedOption) === normalizeText(correctAnswer);
  };

  const renderQuestionCards = (title, items) => {
    if (!items || items.length === 0) {
      return null;
    }

    return (
      <div style={styles.panel}>
        <h3 style={styles.panelTitle}>{title}</h3>

        <div style={styles.questionList}>
          {items.map((item, index) => (
            <div key={`${title}-${index}`} style={styles.questionCard}>
              <p style={styles.questionNumber}>Question {index + 1}</p>
              <h4 style={styles.questionText}>{item.question}</h4>

              <p style={styles.answerLabel}>Why this is asked</p>
              <p style={styles.answerText}>{item.whyAsked}</p>

              <p style={styles.answerLabel}>Sample answer</p>
              <p style={styles.sampleAnswer}>{item.sampleAnswer}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMockTest = () => {
    if (!aiInterview?.mockTest || aiInterview.mockTest.length === 0) {
      return null;
    }

    return (
      <div style={styles.panel}>
        <h3 style={styles.panelTitle}>Live AI Mock Test</h3>
        <p style={styles.testInstruction}>
          Select an answer to reveal the correct answer and explanation.
        </p>

        <div style={styles.questionList}>
          {aiInterview.mockTest.map((item, index) => {
            const selectedAnswer = selectedMockAnswers[index];
            const hasAnswered = Boolean(selectedAnswer);
            const userIsCorrect = isCorrectAnswer(
              selectedAnswer,
              item.correctAnswer
            );

            return (
              <div key={`mock-test-${index}`} style={styles.questionCard}>
                <p style={styles.questionNumber}>Mock Test {index + 1}</p>
                <h4 style={styles.questionText}>{item.question}</h4>

                <div style={styles.optionGrid}>
                  {(item.options || []).map((option, optionIndex) => {
                    const isSelected =
                      normalizeText(selectedAnswer) === normalizeText(option);
                    const isCorrect =
                      normalizeText(item.correctAnswer) === normalizeText(option);

                    let optionStyle = styles.optionButton;

                    if (hasAnswered && isCorrect) {
                      optionStyle = {
                        ...styles.optionButton,
                        ...styles.correctOption,
                      };
                    }

                    if (hasAnswered && isSelected && !isCorrect) {
                      optionStyle = {
                        ...styles.optionButton,
                        ...styles.wrongOption,
                      };
                    }

                    if (!hasAnswered && isSelected) {
                      optionStyle = {
                        ...styles.optionButton,
                        ...styles.selectedOption,
                      };
                    }

                    return (
                      <button
                        key={`${option}-${optionIndex}`}
                        style={optionStyle}
                        onClick={() => handleMockAnswerSelect(index, option)}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {!hasAnswered && (
                  <p style={styles.hiddenAnswerNote}>
                    Choose one option to check your answer.
                  </p>
                )}

                {hasAnswered && (
                  <div style={styles.answerRevealBox}>
                    <p
                      style={{
                        ...styles.resultStatus,
                        color: userIsCorrect ? "#bbf7d0" : "#fecaca",
                      }}
                    >
                      {userIsCorrect
                        ? "Correct answer ✅"
                        : "Your answer is incorrect ❌"}
                    </p>

                    <p style={styles.answerLabel}>Correct Answer</p>
                    <p style={styles.correctAnswer}>{item.correctAnswer}</p>

                    <p style={styles.answerLabel}>Explanation</p>
                    <p style={styles.answerText}>{item.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Live Gemini AI</p>
          <h2 style={styles.title}>AI Mock Interview + Mock Test Engine</h2>
          <p style={styles.subtitle}>
            Generate fresh Gemini AI-powered HR questions, role-based questions,
            technical questions, sample answers, and mock test questions from
            your actual resume.
          </p>
        </div>

        <button style={styles.generateButton} onClick={generateLiveMockInterview}>
          {loading ? "Generating with Gemini..." : "Generate Live AI Mock Interview"}
        </button>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {aiInterview && (
        <div style={styles.resultArea}>
          <div style={styles.summaryBox}>
            <p style={styles.eyebrow}>AI Interview Readiness Summary</p>
            <p style={styles.summaryText}>{aiInterview.aiSummary}</p>
          </div>

          {renderQuestionCards("Gemini HR Questions", aiInterview.hrQuestions)}

          {renderQuestionCards(
            "Gemini Role-Based Questions",
            aiInterview.roleQuestions
          )}

          {renderQuestionCards(
            "Gemini Technical Questions",
            aiInterview.technicalQuestions
          )}

          {renderMockTest()}

          {aiInterview.improvementPlan &&
            aiInterview.improvementPlan.length > 0 && (
              <div style={styles.panel}>
                <h3 style={styles.panelTitle}>AI Improvement Plan</h3>

                <ol style={styles.planList}>
                  {aiInterview.improvementPlan.map((item, index) => (
                    <li key={`${item}-${index}`} style={styles.planItem}>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
            )}
        </div>
      )}
    </section>
  );
}

const styles = {
  wrapper: {
    background: "rgba(15,23,42,0.88)",
    padding: "36px",
    borderRadius: "26px",
    border: "1px solid rgba(139,92,246,0.32)",
    boxShadow: "0 25px 75px rgba(0,0,0,0.32)",
    marginBottom: "30px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "18px",
    flexWrap: "wrap",
    marginBottom: "22px",
  },
  eyebrow: {
    color: "#a78bfa",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: "12px",
    margin: "0 0 8px",
  },
  title: {
    fontSize: "30px",
    margin: "0 0 10px",
    color: "#ffffff",
    letterSpacing: "-0.04em",
  },
  subtitle: {
    color: "#cbd5e1",
    lineHeight: "1.7",
    margin: 0,
    maxWidth: "760px",
  },
  generateButton: {
    padding: "14px 18px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #38bdf8, #8b5cf6)",
    color: "#ffffff",
    fontWeight: "900",
    cursor: "pointer",
    fontSize: "15px",
  },
  errorBox: {
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.3)",
    color: "#fecaca",
    padding: "14px",
    borderRadius: "14px",
    marginBottom: "18px",
    fontWeight: "800",
  },
  resultArea: {
    display: "grid",
    gap: "18px",
  },
  summaryBox: {
    background:
      "linear-gradient(135deg, rgba(56,189,248,0.12), rgba(139,92,246,0.12))",
    border: "1px solid rgba(139,92,246,0.25)",
    borderRadius: "20px",
    padding: "22px",
  },
  summaryText: {
    color: "#ffffff",
    lineHeight: "1.8",
    margin: 0,
    fontSize: "16px",
  },
  panel: {
    background: "rgba(2,6,23,0.48)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "20px",
    padding: "22px",
  },
  panelTitle: {
    color: "#ffffff",
    margin: "0 0 10px",
    fontSize: "22px",
  },
  testInstruction: {
    color: "#94a3b8",
    margin: "0 0 16px",
    lineHeight: "1.6",
  },
  questionList: {
    display: "grid",
    gap: "14px",
  },
  questionCard: {
    background: "rgba(15,23,42,0.62)",
    border: "1px solid rgba(148,163,184,0.14)",
    borderRadius: "16px",
    padding: "18px",
  },
  questionNumber: {
    color: "#38bdf8",
    fontWeight: "900",
    margin: "0 0 8px",
    fontSize: "13px",
  },
  questionText: {
    color: "#ffffff",
    margin: "0 0 14px",
    fontSize: "18px",
    lineHeight: "1.5",
  },
  answerLabel: {
    color: "#a78bfa",
    fontWeight: "900",
    margin: "12px 0 6px",
    fontSize: "13px",
  },
  answerText: {
    color: "#cbd5e1",
    lineHeight: "1.7",
    margin: 0,
  },
  sampleAnswer: {
    color: "#dcfce7",
    lineHeight: "1.7",
    margin: 0,
    background: "rgba(34,197,94,0.08)",
    border: "1px solid rgba(34,197,94,0.16)",
    borderRadius: "12px",
    padding: "12px",
  },
  optionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "10px",
    marginTop: "12px",
  },
  optionButton: {
    background: "rgba(30,41,59,0.8)",
    border: "1px solid rgba(148,163,184,0.18)",
    color: "#e2e8f0",
    padding: "14px",
    borderRadius: "12px",
    fontWeight: "900",
    fontSize: "15px",
    cursor: "pointer",
    textAlign: "left",
  },
  selectedOption: {
    borderColor: "rgba(56,189,248,0.7)",
    background: "rgba(56,189,248,0.16)",
  },
  correctOption: {
    borderColor: "rgba(34,197,94,0.7)",
    background: "rgba(34,197,94,0.16)",
    color: "#bbf7d0",
  },
  wrongOption: {
    borderColor: "rgba(239,68,68,0.7)",
    background: "rgba(239,68,68,0.16)",
    color: "#fecaca",
  },
  hiddenAnswerNote: {
    color: "#94a3b8",
    margin: "14px 0 0",
    fontSize: "14px",
    fontWeight: "700",
  },
  answerRevealBox: {
    marginTop: "16px",
    padding: "14px",
    borderRadius: "14px",
    background: "rgba(2,6,23,0.45)",
    border: "1px solid rgba(148,163,184,0.14)",
  },
  resultStatus: {
    fontWeight: "900",
    margin: "0 0 10px",
    fontSize: "15px",
  },
  correctAnswer: {
    color: "#bbf7d0",
    fontWeight: "900",
    margin: 0,
  },
  planList: {
    color: "#cbd5e1",
    lineHeight: "1.8",
    margin: 0,
    paddingLeft: "22px",
  },
  planItem: {
    marginBottom: "8px",
  },
};

export default LiveAIMockInterview;