import * as core from "@actions/core";
import { getArtifactId } from "./utils/pom.js";
import { getLatestHytaleServerVersion } from "./utils/hytale.js";
import { determineVersion } from "./utils/version.js";
import { buildPlugin } from "./build/maven.js";
import { generateChangelog } from "./publish/changelog.js";
import { uploadGithubArtifact } from "./publish/artifact.js";
import { createGithubRelease } from "./publish/release.js";

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

  // i realized halfway through that we dont actually need this
  // forgot that in workflwos youh have to in order to get it in another job
  // buuuut, it might be useful for other things?????
  await uploadGithubArtifact(artifactId, pluginPath);

  if (versionInfo.isRelease && changelog) {
    await createGithubRelease(versionInfo, changelog, artifactId, pluginPath);
  }
}
