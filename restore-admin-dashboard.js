const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "frontend", "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.log("❌ App.jsx not found");
  process.exit(1);
}

let code = fs.readFileSync(appPath, "utf8");

fs.writeFileSync(appPath + ".backup-before-admin-restore", code, "utf8");

const adminImport = `import AdminDashboard from "./components/AdminDashboard";`;

if (!code.includes(adminImport)) {
  const lastImportRegex = /import[\s\S]*?;\r?\n/g;
  let match;
  let lastImportEnd = 0;

  while ((match = lastImportRegex.exec(code)) !== null) {
    lastImportEnd = match.index + match[0].length;
  }

  if (lastImportEnd > 0) {
    code =
      code.slice(0, lastImportEnd) +
      adminImport +
      "\n" +
      code.slice(lastImportEnd);
  } else {
    code = adminImport + "\n" + code;
  }
}

if (!code.includes("const isAdminUser =")) {
  const isPremiumLine = `const isPremium = user?.plan === "premium";`;

  const adminChecker = `${isPremiumLine}

  const isAdminUser =
    user?.isAdmin === true ||
    String(user?.email || "").toLowerCase().trim() === "bragadishv@gmail.com";`;

  if (code.includes(isPremiumLine)) {
    code = code.replace(isPremiumLine, adminChecker);
  } else {
    console.log("❌ Could not find isPremium line.");
    process.exit(1);
  }
}

const adminRender = `            {isAdminUser && (
              <AdminDashboard token={token} apiBaseUrl={API_BASE_URL} />
            )}

`;

if (!code.includes("<AdminDashboard")) {
  const anchor = `<DashboardAnalytics`;

  if (!code.includes(anchor)) {
    console.log("❌ Could not find DashboardAnalytics section.");
    process.exit(1);
  }

  code = code.replace(anchor, adminRender + `            ${anchor}`);
}

fs.writeFileSync(appPath, code, "utf8");

console.log("✅ Admin Dashboard restored.");
console.log("Import exists:", code.includes(adminImport));
console.log("Admin checker exists:", code.includes("const isAdminUser ="));
console.log("Admin render exists:", code.includes("<AdminDashboard"));