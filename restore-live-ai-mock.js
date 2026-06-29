const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "frontend", "src", "App.jsx");
const componentPath = path.join(
  __dirname,
  "frontend",
  "src",
  "components",
  "LiveAIMockInterview.jsx"
);

if (!fs.existsSync(appPath)) {
  console.log("❌ App.jsx not found:", appPath);
  process.exit(1);
}

if (!fs.existsSync(componentPath)) {
  console.log("❌ LiveAIMockInterview.jsx component not found:", componentPath);
  console.log("You need to restore/create the component file first.");
  process.exit(1);
}

let code = fs.readFileSync(appPath, "utf8");

fs.writeFileSync(appPath + ".backup-before-live-ai-restore", code, "utf8");

const liveImport = `import LiveAIMockInterview from "./components/LiveAIMockInterview";`;

if (!code.includes(liveImport)) {
  const landingImport = `import LandingPagePolish from "./components/LandingPagePolish";`;

  if (code.includes(landingImport)) {
    code = code.replace(
      landingImport,
      `${landingImport}
${liveImport}`
    );
  } else {
    code = code.replace(
      `import AdminDashboard from "./components/AdminDashboard";`,
      `import AdminDashboard from "./components/AdminDashboard";
${liveImport}`
    );
  }
}

if (!code.includes("const effectiveTargetRole =")) {
  code = code.replace(
    `const isPremium = user?.plan === "premium";`,
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

const liveMockBlock = `
            <LiveAIMockInterview
              token={token}
              apiBaseUrl={API_BASE_URL}
              resumeText={resumeText}
              targetRole={effectiveTargetRole}
              jobDescription={jobDescription}
              result={result}
            />
`;

if (!code.includes("<LiveAIMockInterview")) {
  const preferredAnchor = `{result.mockInterview && (`;
  const fallbackAnchor = `<div style={styles.reportCta}>`;

  if (code.includes(preferredAnchor)) {
    code = code.replace(
      preferredAnchor,
      `${liveMockBlock}
            ${preferredAnchor}`
    );
  } else if (code.includes(fallbackAnchor)) {
    code = code.replace(
      fallbackAnchor,
      `${liveMockBlock}
            ${fallbackAnchor}`
    );
  } else {
    console.log("❌ Could not find a safe place to insert LiveAIMockInterview.");
    process.exit(1);
  }
}

code = code.replaceAll(
  "targetRole={targetRole}",
  "targetRole={effectiveTargetRole}"
);

fs.writeFileSync(appPath, code, "utf8");

console.log("✅ Live AI Mock Interview restored successfully.");
console.log("Import exists:", code.includes(liveImport));
console.log("Render exists:", code.includes("<LiveAIMockInterview"));
console.log("Uses effectiveTargetRole:", code.includes("targetRole={effectiveTargetRole}"));