const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "frontend", "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.log("❌ App.jsx not found:", appPath);
  process.exit(1);
}

let code = fs.readFileSync(appPath, "utf8");

// 1. Make sure customRole state exists
if (!code.includes("const [customRole, setCustomRole] = useState")) {
  code = code.replace(
    'const [targetRole, setTargetRole] = useState("fresher");',
    `const [targetRole, setTargetRole] = useState("fresher");
  const [customRole, setCustomRole] = useState("");`
  );
}

// 2. Make sure effectiveTargetRole exists
if (!code.includes("const effectiveTargetRole =")) {
  code = code.replace(
    "const isPremium = user?.plan === \"premium\";",
    `const isPremium = user?.plan === "premium";

  const effectiveTargetRole =
    targetRole === "custom"
      ? customRole.trim() || "custom"
      : targetRole;

  const displayTargetRole =
    targetRole === "custom"
      ? customRole.trim() || "Custom Job Role"
      : roleLabels[targetRole] || targetRole;`
  );
}

// 3. Remove duplicate custom input blocks if any
code = code.replace(
  /\s*\{targetRole === "custom"[\s\S]*?<\/>\s*\)\}/g,
  ""
);

code = code.replace(
  /\s*\{targetRole === "custom"\s*\?\s*\([\s\S]*?\)\s*:\s*null\}/g,
  ""
);

// 4. Replace full role dropdown section safely
const startText = `<label style={styles.label}>Select Target Job Role</label>`;
const endText = `<label style={styles.label}>Paste Job Description Optional</label>`;

const startIndex = code.indexOf(startText);
const endIndex = code.indexOf(endText, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log("❌ Could not find role dropdown section.");
  process.exit(1);
}

const fixedSection = `<label style={styles.label}>Select Target Job Role</label>
              <select
                style={styles.select}
                value={targetRole}
                onChange={(e) => {
                  setTargetRole(e.target.value);
                  if (e.target.value !== "custom") {
                    setCustomRole("");
                  }
                }}
              >
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {targetRole === "custom" && (
                <div style={{ marginTop: "14px" }}>
                  <label style={styles.label}>Enter Custom Job Role</label>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="Example: Cyber Security Analyst, Product Manager, Sales Executive"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                  />
                </div>
              )}

              <label style={styles.label}>Paste Job Description Optional</label>`;

code =
  code.slice(0, startIndex) +
  fixedSection +
  code.slice(endIndex + endText.length);

// 5. Make Gemini use effective role
code = code.replaceAll("targetRole={targetRole}", "targetRole={effectiveTargetRole}");

// 6. Save
fs.writeFileSync(appPath, code, "utf8");

console.log("✅ Custom role crash fixed.");
console.log("customRole state:", code.includes("const [customRole, setCustomRole] = useState"));
console.log("effectiveTargetRole:", code.includes("const effectiveTargetRole ="));
console.log("Object.entries(roleLabels):", code.includes("Object.entries(roleLabels)"));
console.log("Enter Custom Job Role count:", (code.match(/Enter Custom Job Role/g) || []).length);