const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "frontend", "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.log("❌ App.jsx not found:", appPath);
  process.exit(1);
}

let code = fs.readFileSync(appPath, "utf8");

const importLine = `import LiveAIMockInterview from "./components/LiveAIMockInterview";`;

const hasImport =
  code.includes(`LiveAIMockInterview from "./components/LiveAIMockInterview"`) ||
  code.includes(`LiveAIMockInterview from './components/LiveAIMockInterview'`);

if (!hasImport) {
  const importRegex = /import[\s\S]*?;\r?\n/g;
  let match;
  let lastImportEnd = 0;

  while ((match = importRegex.exec(code)) !== null) {
    lastImportEnd = match.index + match[0].length;
  }

  if (lastImportEnd > 0) {
    code =
      code.slice(0, lastImportEnd) +
      importLine +
      "\n" +
      code.slice(lastImportEnd);
  } else {
    code = importLine + "\n" + code;
  }
}

fs.writeFileSync(appPath, code, "utf8");

console.log("✅ LiveAIMockInterview import fixed.");
console.log(
  "Import exists:",
  code.includes(`LiveAIMockInterview from "./components/LiveAIMockInterview"`)
);
console.log("Render exists:", code.includes("<LiveAIMockInterview"));