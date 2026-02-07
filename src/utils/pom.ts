import * as core from "@actions/core";
import * as exec from "@actions/exec";

export async function getArtifactId(pluginPath: string): Promise<string> {
  const pom = await exec.getExecOutput(
    "mvn",
    ["help:evaluate", "-Dexpression=project.artifactId", "-q", "-DforceStdout"],
    { cwd: pluginPath },
  );

  if (pom.exitCode !== 0) {
    core.setFailed(pom.stderr.toString());
    return "";
  }

  const artifactId = pom.stdout.toString().trim();
  core.setOutput("artifact_id", artifactId);

  return artifactId;
}
