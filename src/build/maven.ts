import * as core from "@actions/core";
import * as exec from "@actions/exec";

export async function buildPlugin(
  pluginPath: string,
  version: string,
  hytaleServerVersion: string,
) {
  core.info("Starting Maven build...");

  const mvn = await exec.getExecOutput(
    "mvn",
    [
      "-B",
      "-V",
      "clean",
      "package",
      `-Drevision=${version}`,
      `-Dhytale.server.version=${hytaleServerVersion}`,
    ],
    { cwd: pluginPath },
  );

  const output = mvn.stdout.toString();
  core.debug(output);

  if (mvn.exitCode !== 0) {
    core.setFailed(output);
  }

  core.info("Maven build complete");
}
