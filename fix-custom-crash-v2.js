const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "frontend", "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.log("❌ App.jsx not found:", appPath);
  process.exit(1);
}

let code = fs.readFileSync(appPath, "utf8");

// Backup
fs.writeFileSync(appPath + ".backup-before-custom-v2", code, "utf8");

// Make sure roleLabels has all roles
const newRoleLabels = `const roleLabels = {
  fresher: "Fresher General",
  "it-support": "IT Support",
  "desktop-support-engineer": "Desktop Support Engineer",
  "service-desk-analyst": "Service Desk Analyst",
  "technical-support-executive": "Technical Support Executive",
  "it-helpdesk-engineer": "IT Helpdesk Engineer",
  "project-coordinator": "Project Coordinator",
  "project-manager": "Project Manager",
  "project-delivery-manager": "Project Delivery Manager",
  "pmo-executive": "PMO Executive",
  "operations-executive": "Operations Executive",
  "operations-manager": "Operations Manager",
  "mis-executive": "MIS Executive",
  "business-analyst": "Business Analyst",
  "customer-support": "Customer Support",
  "customer-success-executive": "Customer Success Executive",
  "customer-service-support-manager": "Customer Service Support Manager",
  "data-analyst": "Data Analyst",
  "hr-executive": "HR Executive",
  "admin-executive": "Admin Executive",
  "finance-executive": "Finance Executive",
  "digital-marketing-executive": "Digital Marketing Executive",
  "software-developer": "Software Developer",
  "frontend-developer": "Frontend Developer",
  "backend-developer": "Backend Developer",
  custom: "Custom Job Role",
};`;

code = code.replace(/const\s+roleLabels\s*=\s*\{[\s\S]*?\};/, newRoleLabels);

// Make sure customRole state exists
if (!code.includes("const [customRole, setCustomRole] = useState")) {
  code = code.replace(
    'const [targetRole, setTargetRole] = useState("fresher");',
    `const [targetRole, setTargetRole] = useState("fresher");
  const [customRole, setCustomRole] = useState("");`
  );
}

// Make sure effective role helpers exist
if (!code.includes("const effectiveTargetRole =")) {
  code = code.replace(
    'const isPremium = user?.plan === "premium";',
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

// Remove all existing broken/duplicate Custom Job Role blocks
function removeCustomRoleBlocks(source) {
  let output = source;

  while (output.includes("Enter Custom Job Role")) {
    const phraseIndex = output.indexOf("Enter Custom Job Role");
    const blockStart = output.lastIndexOf("{targetRole", phraseIndex);

    if (blockStart === -1) {
      break;
    }

    let depth = 0;
    let blockEnd = -1;

    for (let i = blockStart; i < output.length; i++) {
      if (output[i] === "{") depth++;
      if (output[i] === "}") depth--;

      if (depth === 0) {
        blockEnd = i + 1;
        break;
      }
    }

    if (blockEnd === -1) {
      break;
    }

    output = output.slice(0, blockStart) + output.slice(blockEnd);
  }

  return output;
}

code = removeCustomRoleBlocks(code);

// Find the target role dropdown by value={targetRole}
const valueIndex = code.indexOf("value={targetRole}");
if (valueIndex === -1) {
  console.log("❌ Could not find value={targetRole} dropdown.");
  process.exit(1);
}

const selectStart = code.lastIndexOf("<select", valueIndex);
const selectCloseTag = "</select>";
const selectEnd = code.indexOf(selectCloseTag, valueIndex);

if (selectStart === -1 || selectEnd === -1) {
  console.log("❌ Could not find complete select dropdown.");
  process.exit(1);
}

const fixedSelectBlock = `<select
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
              )}`;

code =
  code.slice(0, selectStart) +
  fixedSelectBlock +
  code.slice(selectEnd + selectCloseTag.length);

// Make API/Gemini/PDF/report use effective/display role
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

console.log("✅ Custom role crash fixed with v2.");
console.log("Project Manager:", code.includes("Project Manager"));
console.log("Object.entries(roleLabels):", code.includes("Object.entries(roleLabels)"));
console.log("customRole state:", code.includes("const [customRole, setCustomRole] = useState"));
console.log("effectiveTargetRole:", code.includes("const effectiveTargetRole ="));
console.log("Enter Custom Job Role count:", (code.match(/Enter Custom Job Role/g) || []).length);