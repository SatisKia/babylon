const fs = require("fs");
const mode = process.argv[2] || "electron";

const base = JSON.parse(fs.readFileSync("package." + mode + ".json", "utf8"));
const web = JSON.parse(fs.readFileSync("package.web.json", "utf8"));

if (mode === "nwjs") {
  // package.app.jsonを取り込む
  const app = JSON.parse(fs.readFileSync("package.app.json", "utf8"));
  Object.assign(base, app);
  const appHasIcon = app.window && typeof app.window === "object" && "icon" in app.window;
  if (!appHasIcon && base.window && typeof base.window === "object" && "icon" in base.window) {
    delete base.window.icon;
  }
}

// WEB側のdependenciesを取り込む
base.dependencies = { ...(base.dependencies || {}), ...(web.dependencies || {}) };
fs.writeFileSync("package.json", JSON.stringify(base, null, 2) + "\n");
