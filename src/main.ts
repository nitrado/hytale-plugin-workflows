import * as core from "@actions/core";
import { getArtifactId } from "./utils/pom.js";
import { getLatestHytaleServerVersion } from "./utils/hytale.js";

export async function run() {
  const pluginPath = core.getInput("plugin-path");
  core.info(`Detected plugin path: ${pluginPath}`);

  const artifactId = await getArtifactId(pluginPath);
  core.info(`Detected artifact ID: ${artifactId}`);

  const hytaleServerVersion = await getLatestHytaleServerVersion();
  core.info(`Detected Hytale Server version: ${hytaleServerVersion}`);
}
