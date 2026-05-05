// Merge package.base.json + package.web.json -> package.json (cwd = build/tmp)
const fs = require("fs");
const mode = process.argv[2] || "electron";

const base = JSON.parse(fs.readFileSync("package.base.json", "utf8"));
const web = JSON.parse(fs.readFileSync("package.web.json", "utf8"));

if (mode === "nwjs") {
  const app = JSON.parse(fs.readFileSync("app.json", "utf8"));
  Object.assign(base, app);
  if (base.window && typeof base.window === "object" && "icon" in base.window) {
    delete base.window.icon;
  }
  base.nwbuild = {
    mode: "build",
    glob: false,
    version: "0.79.1",
    platform: "win",
    arch: "x64",
    app: { icon: "icon.ico" },
  };
}

if (base.dependencies == null) base.dependencies = {};
base.dependencies = web.dependencies;
fs.writeFileSync("package.json", JSON.stringify(base, null, 2) + "\n");
