import * as core from "@actions/core";
import * as glob from "@actions/glob";
import { DefaultArtifactClient } from "@actions/artifact";
import path from "node:path";

export async function uploadGithubArtifact(
  artifactId: string,
  pluginPath: string,
) {
  const artifactName = "build-artifacts";

  const patterns = [
    path.join(pluginPath, "target", `${artifactId}-*.jar`),
    `!${path.join(pluginPath, "target", "original-*.jar")}`,
  ];

  const globber = await glob.create(patterns.join("\n"));
  const files = await globber.glob();

  if (files.length === 0) {
    core.warning(`failed to find any files in ${pluginPath}/target`);
    return;
  }

  core.info(`Uploading artifact(s): ${files.join(", ")}`);

  const retentionDaysInput = core.getInput("artifact-retention-days");
  const retentionDays = retentionDaysInput
    ? parseInt(retentionDaysInput, 10)
    : undefined;

  const artifactClient = new DefaultArtifactClient();

  await artifactClient.uploadArtifact(artifactName, files, pluginPath, {
    retentionDays: retentionDays,
  });
}
