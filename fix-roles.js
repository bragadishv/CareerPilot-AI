const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "frontend", "src", "App.jsx");

let code = fs.readFileSync(appPath, "utf8");

const oldOptions = `<option value="fresher">Fresher General</option>
                <option value="it-support">IT Support</option>
                <option value="project-coordinator">Project Coordinator</option>
                <option value="customer-support">Customer Support</option>
                <option value="data-analyst">Data Analyst</option>`;

const newOptions = `{Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}`;

if (!code.includes("Object.entries(roleLabels).map")) {
  code = code.replace(oldOptions, newOptions);
}

const selectEnd = `</select>

              <label style={styles.label}>Paste Job Description Optional</label>`;

const customRoleInput = `</select>

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
              )}

              <label style={styles.label}>Paste Job Description Optional</label>`;

if (!code.includes("Enter Custom Job Role")) {
  code = code.replace(selectEnd, customRoleInput);
}

code = code.replace(
  "targetRole={targetRole}",
  "targetRole={effectiveTargetRole}"
);

code = code.replace(
  'addSmallText(`Target Role: ${roleLabels[targetRole] || "Fresher General"}`);',
  "addSmallText(`Target Role: ${displayTargetRole}`);"
);

code = code.replace(
  '{roleLabels[targetRole] || "Fresher General"}',
  "{displayTargetRole}"
);

fs.writeFileSync(appPath, code, "utf8");

console.log("✅ App.jsx role dropdown fixed successfully.");