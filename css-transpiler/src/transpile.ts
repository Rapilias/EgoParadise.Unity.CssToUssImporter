import * as process from "node:process";
import * as path from "node:path";
import * as fs from "node:fs";
import postcss from "postcss";
import postcssNested from "postcss-nested";
import postcssCustomProperties from "postcss-custom-properties";
import postcssCssFormatter from "./cssFormatter.js";

async function main() {
  const args: string[] = process.argv.slice(2);

  // 入力
  const cssFilePath = args[0];

  if (!cssFilePath) {
    console.error("No input file specified.");
    process.exit(2);
  }

  const inputPath = path.resolve(process.cwd(), cssFilePath);
  if (!fs.existsSync(inputPath)) {
    console.error(`Input not found: ${cssFilePath}`);
    process.exit(3);
  }
  const file = fs.readFileSync(inputPath, "utf-8");

  // css を作成
  const plugins = [
    postcssNested(),
    postcssCustomProperties(),
    postcssCssFormatter({ indent: 2 }),
  ];
  const result = await postcss(plugins).process(file, { from: inputPath });

  // 出力
  const outputFilePath = args[1];
  if (outputFilePath) {
    fs.writeFileSync(
      path.resolve(process.cwd(), outputFilePath),
      result.css,
      "utf8",
    );
  } else {
    process.stdout.write(result.css);
  }
}

main();
