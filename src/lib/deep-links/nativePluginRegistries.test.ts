import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const REQUIRED_REGISTRIES = [
  "android/app/src/main/assets/capacitor.config.json",
  "android/app/src/main/assets/capacitor.plugins.json",
  "ios/App/App/capacitor.config.json",
] as const;

describe("native plugin registries", () => {
  it.each(REQUIRED_REGISTRIES)(
    "tracks and parses %s for clean-checkout builds",
    (path) => {
      const tracked = spawnSync(
        "git",
        ["ls-files", "--error-unmatch", path],
        { encoding: "utf8" }
      );

      expect(tracked.status, tracked.stderr).toBe(0);
      expect(() => JSON.parse(readFileSync(path, "utf8"))).not.toThrow();
    }
  );

  it("registers App and Share in the Android plugin registry", () => {
    const plugins = JSON.parse(
      readFileSync(REQUIRED_REGISTRIES[1], "utf8")
    ) as Array<{ pkg: string; classpath: string }>;

    expect(plugins).toEqual(
      expect.arrayContaining([
        {
          pkg: "@capacitor/app",
          classpath: "com.capacitorjs.plugins.app.AppPlugin",
        },
        {
          pkg: "@capacitor/share",
          classpath: "com.capacitorjs.plugins.share.SharePlugin",
        },
      ])
    );
  });

  it("registers App and Share in the iOS package class list", () => {
    const config = JSON.parse(
      readFileSync(REQUIRED_REGISTRIES[2], "utf8")
    ) as { packageClassList: string[] };

    expect(config.packageClassList).toEqual(
      expect.arrayContaining(["AppPlugin", "SharePlugin"])
    );
  });
});
