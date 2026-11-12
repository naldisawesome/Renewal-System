import { defineConfig } from "vitest/config";
import path from "path";

// Tests live next to the code they check. "@/" works inside them like everywhere else in the app.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { include: ["src/**/*.test.{ts,tsx}"] },
});
