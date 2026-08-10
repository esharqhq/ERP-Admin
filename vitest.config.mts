import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // `node`, not `jsdom`: this suite covers pure logic only. Components are
    // verified by `tsc`, `build` and looking at them — adding jsdom here would
    // invite component tests that nobody maintains.
    environment: "node",
    // Colocated with the module under test. Deliberately excludes app/ and
    // components/ so a stray render test cannot creep in without a config change.
    include: ["lib/**/*.test.ts", "hooks/**/*.test.ts"],
  },
});
