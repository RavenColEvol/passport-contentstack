import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import sourceMaps from "rollup-plugin-sourcemaps";
import typescript from "rollup-plugin-typescript2";
import json from "rollup-plugin-json";

const pkg = require("./package.json");

export default {
  input: "src/index.ts",
  output: [{ file: pkg.main, format: "cjs", sourcemap: true }],
  external: ["prettier", "path", "fs", "commander", "chalk", "contentstack"],
  watch: {
    include: "src/**",
  },
  plugins: [
    json(),
    typescript({ useTsconfigDeclarationDir: true }),
    commonjs({}),
    resolve(),
    sourceMaps(),
  ],
};
