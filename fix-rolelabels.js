const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "frontend", "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.log("❌ App.jsx not found:", appPath);
  process.exit(1);
}

let code = fs.readFileSync(appPath, "utf8");

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

code = code.replace(
  /const\s+roleLabels\s*=\s*\{[\s\S]*?\};/,
  newRoleLabels
);

fs.writeFileSync(appPath, code, "utf8");

console.log("✅ roleLabels updated successfully.");
console.log("Project Manager exists:", code.includes("Project Manager"));
console.log("Custom Job Role exists:", code.includes("Custom Job Role"));