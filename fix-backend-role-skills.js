const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "backend", "server.js");

if (!fs.existsSync(serverPath)) {
  console.log("❌ backend/server.js not found:", serverPath);
  process.exit(1);
}

let code = fs.readFileSync(serverPath, "utf8");

fs.writeFileSync(
  serverPath + ".backup-before-expanded-role-skills",
  code,
  "utf8"
);

const expandedRoleLabels = `const roleLabels = {
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

const expandedRoleSkills = `const roleSkills = {
    fresher: [
      "communication",
      "problem solving",
      "teamwork",
      "learning",
      "excel",
      "presentation",
      "basic computer",
      "adaptability",
      "time management",
      "documentation",
    ],
    "it-support": [
      "it support",
      "technical support",
      "troubleshooting",
      "hardware",
      "software",
      "windows",
      "networking",
      "ticketing",
      "customer service",
      "communication",
    ],
    "desktop-support-engineer": [
      "desktop support",
      "troubleshooting",
      "hardware",
      "software",
      "windows",
      "printer",
      "networking",
      "ticketing",
      "installation",
      "customer service",
    ],
    "service-desk-analyst": [
      "service desk",
      "incident management",
      "ticketing",
      "sla",
      "troubleshooting",
      "active directory",
      "windows",
      "escalation",
      "documentation",
      "communication",
    ],
    "technical-support-executive": [
      "technical support",
      "troubleshooting",
      "customer service",
      "ticketing",
      "hardware",
      "software",
      "networking",
      "documentation",
      "escalation",
      "communication",
    ],
    "it-helpdesk-engineer": [
      "helpdesk",
      "it support",
      "ticketing",
      "troubleshooting",
      "windows",
      "hardware",
      "software",
      "networking",
      "active directory",
      "customer service",
    ],
    "project-coordinator": [
      "project coordination",
      "coordination",
      "planning",
      "tracking",
      "documentation",
      "reporting",
      "excel",
      "stakeholder",
      "communication",
      "follow up",
    ],
    "project-manager": [
      "project management",
      "planning",
      "stakeholder management",
      "risk management",
      "timeline",
      "budget",
      "reporting",
      "leadership",
      "coordination",
      "communication",
    ],
    "project-delivery-manager": [
      "project delivery",
      "delivery management",
      "stakeholder management",
      "planning",
      "tracking",
      "risk management",
      "team management",
      "reporting",
      "operations",
      "communication",
    ],
    "pmo-executive": [
      "pmo",
      "project tracking",
      "reporting",
      "documentation",
      "excel",
      "dashboard",
      "stakeholder",
      "coordination",
      "mis",
      "communication",
    ],
    "operations-executive": [
      "operations",
      "coordination",
      "reporting",
      "excel",
      "process",
      "customer service",
      "vendor management",
      "tracking",
      "documentation",
      "communication",
    ],
    "operations-manager": [
      "operations",
      "team management",
      "process improvement",
      "reporting",
      "vendor management",
      "stakeholder management",
      "planning",
      "execution",
      "leadership",
      "communication",
    ],
    "mis-executive": [
      "mis",
      "excel",
      "reporting",
      "dashboard",
      "data analysis",
      "pivot table",
      "vlookup",
      "power bi",
      "documentation",
      "accuracy",
    ],
    "business-analyst": [
      "business analysis",
      "requirements gathering",
      "stakeholder management",
      "documentation",
      "process mapping",
      "excel",
      "sql",
      "reporting",
      "dashboard",
      "communication",
    ],
    "customer-support": [
      "customer support",
      "customer service",
      "communication",
      "problem solving",
      "crm",
      "ticketing",
      "escalation",
      "support",
      "documentation",
      "patience",
    ],
    "customer-success-executive": [
      "customer success",
      "customer service",
      "crm",
      "retention",
      "relationship management",
      "communication",
      "escalation",
      "support",
      "reporting",
      "problem solving",
    ],
    "customer-service-support-manager": [
      "customer service",
      "support management",
      "team management",
      "escalation",
      "crm",
      "sla",
      "customer satisfaction",
      "reporting",
      "leadership",
      "communication",
    ],
    "data-analyst": [
      "data analysis",
      "excel",
      "sql",
      "power bi",
      "dashboard",
      "reporting",
      "python",
      "statistics",
      "visualization",
      "data cleaning",
    ],
    "hr-executive": [
      "hr",
      "recruitment",
      "onboarding",
      "employee engagement",
      "payroll",
      "communication",
      "documentation",
      "interview",
      "attendance",
      "coordination",
    ],
    "admin-executive": [
      "administration",
      "coordination",
      "documentation",
      "vendor management",
      "office management",
      "excel",
      "communication",
      "records",
      "support",
      "reporting",
    ],
    "finance-executive": [
      "finance",
      "accounts",
      "invoice",
      "billing",
      "excel",
      "reconciliation",
      "gst",
      "reporting",
      "documentation",
      "accuracy",
    ],
    "digital-marketing-executive": [
      "digital marketing",
      "seo",
      "social media",
      "content",
      "campaign",
      "google ads",
      "analytics",
      "email marketing",
      "branding",
      "reporting",
    ],
    "software-developer": [
      "javascript",
      "react",
      "node",
      "api",
      "database",
      "html",
      "css",
      "git",
      "debugging",
      "problem solving",
    ],
    "frontend-developer": [
      "react",
      "javascript",
      "html",
      "css",
      "responsive design",
      "api integration",
      "vite",
      "git",
      "ui",
      "debugging",
    ],
    "backend-developer": [
      "node",
      "express",
      "mongodb",
      "api",
      "authentication",
      "database",
      "server",
      "jwt",
      "security",
      "debugging",
    ],
  };`;

function replaceConstObject(source, constName, replacement) {
  const keyword = `const ${constName}`;
  const start = source.indexOf(keyword);

  if (start === -1) {
    return { code: source, replaced: false };
  }

  const equalsIndex = source.indexOf("=", start);
  const objectStart = source.indexOf("{", equalsIndex);

  if (equalsIndex === -1 || objectStart === -1) {
    return { code: source, replaced: false };
  }

  let depth = 0;
  let objectEnd = -1;

  for (let i = objectStart; i < source.length; i++) {
    const char = source[i];

    if (char === "{") depth++;
    if (char === "}") depth--;

    if (depth === 0) {
      objectEnd = i;
      break;
    }
  }

  if (objectEnd === -1) {
    return { code: source, replaced: false };
  }

  let statementEnd = objectEnd + 1;

  while (
    statementEnd < source.length &&
    /\s/.test(source[statementEnd])
  ) {
    statementEnd++;
  }

  if (source[statementEnd] === ";") {
    statementEnd++;
  }

  return {
    code:
      source.slice(0, start) +
      replacement +
      source.slice(statementEnd),
    replaced: true,
  };
}

const roleLabelsResult = replaceConstObject(
  code,
  "roleLabels",
  expandedRoleLabels
);

code = roleLabelsResult.code;

const roleSkillsResult = replaceConstObject(
  code,
  "roleSkills",
  expandedRoleSkills
);

code = roleSkillsResult.code;

if (!roleSkillsResult.replaced) {
  console.log("❌ Could not find const roleSkills in backend/server.js.");
  console.log("Upload or paste backend/server.js if you want me to patch it manually.");
  process.exit(1);
}

if (!code.includes("const humanizeTargetRole =")) {
  const insertAfter = expandedRoleLabels;

  const helper = `

const humanizeTargetRole = (role) => {
  if (!role) return "Fresher General";

  return String(role)
    .replace(/-/g, " ")
    .replace(/\\s+/g, " ")
    .trim()
    .replace(/\\b\\w/g, (letter) => letter.toUpperCase());
};`;

  if (code.includes(insertAfter)) {
    code = code.replace(insertAfter, insertAfter + helper);
  }
}

code = code.replace(
  /const\s+requiredSkills\s*=\s*roleSkills\[selectedRole\]\s*\|\|\s*roleSkills\.fresher\s*;/,
  `const requiredSkills =
      roleSkills[selectedRole] || [
        "communication",
        "problem solving",
        "excel",
        "reporting",
        "documentation",
        "teamwork",
        "learning",
        "presentation",
        "customer service",
        "operations",
      ];`
);

fs.writeFileSync(serverPath, code, "utf8");

console.log("✅ Backend role labels and role skills updated successfully.");
console.log("roleLabels replaced:", roleLabelsResult.replaced);
console.log("roleSkills replaced:", roleSkillsResult.replaced);
console.log("Project Manager skills:", code.includes('"project-manager"'));
console.log("Operations Manager skills:", code.includes('"operations-manager"'));
console.log("Business Analyst skills:", code.includes('"business-analyst"'));
console.log("Custom role fallback:", code.includes('"operations"'));