import path from "path";
import { defineConfig, UserConfig } from "vite";
import pkg from "./package.json" assert { type: "json" };

export default defineConfig({
  base: "./",
  build: {
    minify: false,
    lib: {
      entry: path.resolve(__dirname, "src/bin.ts"),
      name: "sequence-cli",
      formats: ["es"],
      fileName: "bin",
    },
    rollupOptions: {
      external: [
        ...Object.keys(pkg.dependencies), // don't bundle dependencies
        /^node:.*/, // don't bundle built-in Node.js modules (use protocol imports!)
      ],
    },
    target: "esnext", // transpile as little as possible
  },
} satisfies UserConfig);
