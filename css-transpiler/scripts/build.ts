import { build, BuildOptions } from "esbuild";
import fs from "node:fs";

const entryPoint = "./src/transpile.ts";
  // 共通ビルドオプション
  const options: BuildOptions = {
    entryPoints: [entryPoint],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: "./dist/transpile.mjs",
    treeShaking: true,
    banner: {
      js: `import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);`,
    },
    sourcemap: false,
  };
  // minify版ビルドオプション
  const minifyOptions:BuildOptions = {
    ...options,
    outfile: "./dist/transpile.min.mjs",
    minify: true

  };

const executeAsync = async () => {
  await build(options);
  await build(minifyOptions);

  console.log("Build completed.");

  fs.copyFileSync("./dist/transpile.min.mjs", "../Unity/Unity.CssToUssTranspiler/Assets/Packages/com.egoparadise.unity.css-to-uss-importer/Editor/node/transpile.min.mjs");
};

await executeAsync();
