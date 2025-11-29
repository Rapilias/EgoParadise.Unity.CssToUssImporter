import fs from "node:fs";

const CHANGELOG_PATH = "../Unity/Unity.CssToUssTranspiler/Assets/Packages/com.egoparadise.unity.css-to-uss-importer/CHANGELOG.md";
const PACKAGE_JSON_PATH = "../Unity/Unity.CssToUssTranspiler/Assets/Packages/com.egoparadise.unity.css-to-uss-importer/package.json";
const SEPARATOR = "--------";

const executeAsync = async () => {
  // CHANGELOGを読み込む
  const changelogContent = fs.readFileSync(CHANGELOG_PATH, "utf-8").replace(/\r/g, "");
  
  // セパレーター以前の内容を抽出
  const lines = changelogContent.split("\n");
  const separatorIndex = lines.findIndex(line => line.trim() === SEPARATOR);
  const relevantLines = separatorIndex !== -1 
    ? lines.slice(0, separatorIndex)
    : lines;
  
  // 末尾の空行を削除
  while (relevantLines.length > 0 && relevantLines[relevantLines.length - 1].trim() === "") {
    relevantLines.pop();
  }
  
  const changelogText = relevantLines.join("\n");
  
  // package.jsonを読み込む
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf-8"));
  
  // _upm.changelogを更新
  if (!packageJson._upm) {
    packageJson._upm = {};
  }
  packageJson._upm.changelog = changelogText;
  
  // package.jsonを書き込む
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + "\n", "utf-8");
  
  console.log(`Changelog updated: ${PACKAGE_JSON_PATH}`);
};

await executeAsync();
