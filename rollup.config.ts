import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";

const config = {
  input: "src/index.ts",
  output: {
    esModule: true,
    file: "dist/index.js",
    format: "es",
    sourcemap: true,
  },
  context: "global",
  plugins: [
    json(),
    typescript(),
    nodeResolve({ preferBuiltins: true }),
    commonjs(),
  ],
  onwarn: (warning, warn) => {
    if (
      warning.code === "CIRCULAR_DEPENDENCY" &&
      warning.message.includes("node_modules")
    ) {
      return;
    }
    warn(warning);
  },
};

export default config;
