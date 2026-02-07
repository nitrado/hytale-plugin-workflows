import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const config = {
  input: "src/index.ts",
  output: {
    esModule: true,
    file: "dist/index.js",
    format: "es",
    sourcemap: true,
  },
  context: "global",
  plugins: [typescript(), nodeResolve({ preferBuiltins: true }), commonjs()],
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
