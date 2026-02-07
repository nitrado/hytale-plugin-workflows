import * as core from "@actions/core";
import { getArtifactId } from "./utils/pom.js";
import { getLatestHytaleServerVersion } from "./utils/hytale.js";
import { determineVersion } from "./utils/version.js";
import { buildPlugin } from "./build/maven.js";

export async function run() {
  const pluginPath = core.getInput("plugin-path");
  core.info(`Detected plugin path: ${pluginPath}`);

  const artifactId = await getArtifactId(pluginPath);
  core.info(`Detected artifact ID: ${artifactId}`);
  core.setOutput("artifact_id", artifactId);

  const versionInfo = await determineVersion();
  core.setOutput("version", versionInfo.version);
  core.setOutput("is_release", versionInfo.isRelease);
  core.setOutput("is_prerelease", versionInfo.isPrerelease);
  if (versionInfo.tagName) {
    core.setOutput("tag_name", versionInfo.tagName);
  }

  const hytaleServerVersion = await getLatestHytaleServerVersion();
  core.info(`Detected Hytale Server version: ${hytaleServerVersion}`);
  core.setOutput("hytale_server_version", hytaleServerVersion);

  await buildPlugin(pluginPath, versionInfo.version, hytaleServerVersion);
}
