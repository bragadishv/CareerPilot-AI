const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "frontend", "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.log("❌ App.jsx not found at:", appPath);
  process.exit(1);
}

let code = fs.readFileSync(appPath, "utf8");

const oldCode = code;

code = code.replace(
  /<select\s+style=\{styles\.select\}\s+value=\{targetRole\}\s+onChange=\{\(e\)\s*=>\s*setTargetRole\(e\.target\.value\)\}\s*>\s*[\s\S]*?\s*<\/select>/,
  `<select
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

              {targetRole === "custom" && (
                <>
                  <label style={styles.label}>Enter Custom Job Role</label>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="Example: Cyber Security Analyst, Product Manager, Sales Executive"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                  />
                </>
              )}`
);

code = code.replaceAll("targetRole={targetRole}", "targetRole={effectiveTargetRole}");

code = code.replace(
  'addSmallText(`Target Role: ${roleLabels[targetRole] || "Fresher General"}`);',
  "addSmallText(`Target Role: ${displayTargetRole}`);"
);

code = code.replaceAll(
  '{roleLabels[targetRole] || "Fresher General"}',
  "{displayTargetRole}"
);

fs.writeFileSync(appPath, code, "utf8");

if (oldCode === code) {
  console.log("⚠️ No change made. The App.jsx structure may be different.");
} else {
  console.log("✅ App.jsx updated successfully.");
}

console.log("Checking results...");
console.log("Object.entries(roleLabels):", code.includes("Object.entries(roleLabels)"));
console.log("Enter Custom Job Role:", code.includes("Enter Custom Job Role"));
console.log("Old hardcoded Project Coordinator option:", code.includes('<option value="project-coordinator">Project Coordinator</option>'));