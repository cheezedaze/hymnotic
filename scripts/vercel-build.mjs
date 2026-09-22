import { spawnSync } from "node:child_process";
import { unlinkSync } from "node:fs";

if (process.platform !== "linux") {
  // Vercel creates this file before running the build command. Remove it so a
  // failed local build cannot be followed by an accidental --prebuilt deploy.
  try {
    unlinkSync(new URL("../.vercel/output/config.json", import.meta.url));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  console.error(
    [
      "Vercel production artifacts must be built on Linux.",
      "Local prebuilt deployments can bundle a macOS FFmpeg binary that cannot run in Vercel Functions.",
      "Deploy with `vercel --prod` so Vercel builds the source remotely; do not use `vercel build` followed by `vercel deploy --prebuilt`.",
    ].join("\n")
  );
  process.exit(1);
}

const build = spawnSync("npm", ["run", "build"], { stdio: "inherit" });

if (build.error) {
  console.error(build.error.message);
  process.exit(1);
}

process.exit(build.status ?? 1);
