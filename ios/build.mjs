import { readFile, writeFile, mkdir } from "fs/promises";
import { extname } from "path";
import { createHash } from "crypto";
import { rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import swc from "@swc/core";

const extensions = [".js", ".jsx", ".mjs", ".ts", ".tsx", ".cts", ".mts"];
const plugins = [
  nodeResolve(),
  commonjs(),
  {
    name: "swc",
    async transform(code, id) {
      const ext = extname(id);
      if (!extensions.includes(ext)) return null;
      const ts = ext.includes("ts");
      const tsx = ts ? ext.endsWith("x") : undefined;
      const jsx = !ts ? ext.endsWith("x") : undefined;
      const result = await swc.transform(code, {
        filename: id,
        jsc: {
          externalHelpers: true,
          parser: { syntax: ts ? "typescript" : "ecmascript", tsx, jsx }
        },
        env: { targets: "defaults", include: ["transform-classes", "transform-arrow-functions"] }
      });
      return result.code;
    }
  },
  esbuild({ minify: true })
];

await mkdir("./dist", { recursive: true });
const manifest = JSON.parse(await readFile("./manifest.json", "utf8"));
const bundle = await rollup({
  input: "./src/index.tsx",
  onwarn: () => {},
  plugins,
  external: id => id.startsWith("@vendetta") || id === "react" || id === "react-native"
});
await bundle.write({
  file: "./dist/index.js",
  format: "iife",
  compact: true,
  exports: "named",
  globals(id) {
    if (id.startsWith("@vendetta")) return id.substring(1).replace(/\\//g, ".");
    if (id === "react") return "window.React";
    if (id === "react-native") return "window.ReactNative";
    return null;
  }
});
await bundle.close();
const output = await readFile("./dist/index.js");
manifest.hash = createHash("sha256").update(output).digest("hex");
manifest.main = "index.js";
await writeFile("./dist/manifest.json", JSON.stringify(manifest, null, 2) + "\\n");
console.log("Built DraftTimer iOS plugin.");
