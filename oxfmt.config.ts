import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  // Skill files are vendored from get-convex/agent-skills and hash-locked in
  // skills-lock.json; reformatting them invalidates those hashes.
  ignorePatterns: [...ultracite.ignorePatterns, "**/.claude", "**/.agents"],
  // Ultracite's preset unwraps every Markdown paragraph onto one line. Our docs
  // (SRS, README) are hand-wrapped and reviewed as diffs, so keep the wrapping.
  proseWrap: "preserve",
});
