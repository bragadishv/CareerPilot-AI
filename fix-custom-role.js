const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "frontend", "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.log("❌ App.jsx not found:", appPath);
  process.exit(1);
}

let code = fs.readFileSync(appPath, "utf8");

const startText = `<label style={styles.label}>Select Target Job Role</label>`;
const endText = `<label style={styles.label}>Paste Job Description Optional</label>`;

const startIndex = code.indexOf(startText);
const endIndex = code.indexOf(endText, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log("❌ Could not find role dropdown section.");
  process.exit(1);
}

const replacement = `<label style={styles.label}>Select Target Job Role</label>
              <select
                style={styles.select}
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              >
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {targetRole === "custom" ? (
                <div>
                  <label style={styles.label}>Enter Custom Job Role</label>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="Example: Cyber Security Analyst, Product Manager, Sales Executive"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                  />
                </div>
              ) : null}

              <label style={styles.label}>Paste Job Description Optional</label>`;

code =
  code.slice(0, startIndex) +
  replacement +
  code.slice(endIndex + endText.length);

fs.writeFileSync(appPath, code, "utf8");

console.log("✅ Custom Job Role section fixed.");
console.log("Project Manager exists:", code.includes("Project Manager"));
console.log("Object.entries(roleLabels) exists:", code.includes("Object.entries(roleLabels)"));

const customRoleCount = (code.match(/Enter Custom Job Role/g) || []).length;
console.log("Enter Custom Job Role count:", customRoleCount);