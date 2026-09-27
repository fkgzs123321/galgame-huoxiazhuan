// 截面板的图（改 UI 前先看真实渲染）
// 用法: node scripts/shot-panel.cjs [page]
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const ROOT = "E:/Games/写卡/tavern_helper_template";
const D = ROOT + "/src/旮旯给木-英雄坛说";
const 页 = process.argv[2] || "overview";
const 出 = ROOT + "/.tmp-shot/" + 页 + "-" + Date.now() + ".png";
execFileSync("node", [D + "/scripts/gen-panel.cjs"], { stdio: "ignore" });
execFileSync("node", [D + "/scripts/_make-preview.cjs"], { stdio: "ignore" });
fs.mkdirSync(path.dirname(出), { recursive: true });
execFileSync("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", [
  "--headless=new", "--disable-gpu", "--hide-scrollbars",
  "--window-size=880,1500", "--screenshot=" + 出, "--virtual-time-budget=3000",
  "file:///" + D + "/scripts/_preview.html?page=" + 页
], { stdio: "ignore" });
console.log(出);