import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lian.fit",
  appName: "予动",
  webDir: "dist",
  android: {
    allowMixedContent: false,
    backgroundColor: "#0b0f14",
  },
};

export default config;
