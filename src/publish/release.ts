import * as core from "@actions/core";
import * as github from "@actions/github";
import * as glob from "@actions/glob";
import * as fs from "node:fs";
import * as path from "node:path";
import { VersionInfo } from "../utils/version.js";

export async function findBuildArtifacts(
  artifactId: string,
  pluginPath: string,
): Promise<string[]> {
  const patterns = [
    path.join(pluginPath, "target", `${artifactId}-*.jar`),
    `!${path.join(pluginPath, "target", "original-*.jar")}`,
  ];

  const globber = await glob.create(patterns.join("\n"));
  return globber.glob();
}

export async function createGithubRelease(
  versionInfo: VersionInfo,
  changelog: string,
  artifactId: string,
  pluginPath: string,
): Promise<void> {
  const { tagName, version, isPrerelease } = versionInfo;

  if (!tagName) {
    core.warning("No tag name detected, skipping GitHub release");
    return;
  }

  // not quite sure if this is the right way to get the token
  const token = core.getInput("github-token");
  if (!token) {
    core.setFailed("github-token is required to create a release");
    return;
  }

  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;

  const jarFiles = await findBuildArtifacts(artifactId, pluginPath);

  if (jarFiles.length === 0) {
    core.setFailed(`No JAR files found in ${pluginPath}/target`);
    return;
  }

  core.info(`Creating GitHub Release for ${tagName}...`);

  const release = await octokit.rest.repos.createRelease({
    owner,
    repo,
    tag_name: tagName,
    name: `Release ${version}`,
    body: changelog,
    prerelease: isPrerelease,
  });

  const releaseId = release.data.id;

  for (const jarPath of jarFiles) {
    const fileName = path.basename(jarPath);
    const fileContent = fs.readFileSync(jarPath);

    await octokit.rest.repos.uploadReleaseAsset({
      owner,
      repo,
      release_id: releaseId,
      name: fileName,
      // @ts-expect-error
      // i think should accept a buffer as well
      data: fileContent,
    });

    core.info(`Uploaded: ${fileName}`);
  }

  core.info(`GitHub Release created: ${release.data.html_url}`);
}
