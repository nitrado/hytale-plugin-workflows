import * as core from "@actions/core";
import { getArtifactId } from "./utils/pom.js";
import { getLatestHytaleServerVersion } from "./utils/hytale.js";
import { determineVersion } from "./utils/version.js";
import { buildPlugin } from "./build/maven.js";
import { generateChangelog } from "./publish/changelog.js";
import { uploadGithubArtifact } from "./publish/artifact.js";

export async function run() {
  const pluginPath = core.getInput("plugin-path");
  core.info(`Detected plugin path: ${pluginPath}`);

  const artifactId = await getArtifactId(pluginPath);
  core.setOutput("artifact-id", artifactId);

  const versionInfo = await determineVersion();
  core.setOutput("version", versionInfo.version);

  let changelog: string | null = null;
  if (versionInfo.isRelease) {
    changelog = await generateChangelog(versionInfo, artifactId);
    if (changelog) {
      core.setOutput("changelog", changelog);
    }
  }

  const hytaleServerVersion = await getLatestHytaleServerVersion();
  core.info(`Detected Hytale Server version: ${hytaleServerVersion}`);
  core.setOutput("hytale_server_version", hytaleServerVersion);

  // todo:
  // 1. set up maven settings.xml if required
  // 2. set up gcp credentials if required
  // 3. set up modtale credentials if required
  // 4. set up curseforge credentials if required

  await buildPlugin(pluginPath, versionInfo.version, hytaleServerVersion);

  await uploadGithubArtifact(artifactId, pluginPath);
}
