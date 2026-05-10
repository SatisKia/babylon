// Merge package.base.json + package.web.json -> package.json (cwd = build/tmp)
const fs = require("fs");
const mode = process.argv[2] || "electron";

const base = JSON.parse(fs.readFileSync("package.base.json", "utf8"));
const web = JSON.parse(fs.readFileSync("package.web.json", "utf8"));

if (mode === "nwjs") {
  const app = JSON.parse(fs.readFileSync("app.json", "utf8"));
  Object.assign(base, app);
  const appHasIcon = app.window && typeof app.window === "object" && "icon" in app.window;
  if (!appHasIcon && base.window && typeof base.window === "object" && "icon" in base.window) {
    delete base.window.icon;
  }
}

base.dependencies = { ...(base.dependencies || {}), ...(web.dependencies || {}) };
fs.writeFileSync("package.json", JSON.stringify(base, null, 2) + "\n");
