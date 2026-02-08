import * as core from "@actions/core";
import * as github from "@actions/github";
import * as exec from "@actions/exec";
import { valid } from "semver";
import { VersionInfo } from "../utils/version.js";

export async function generateChangelog(
  versionInfo: VersionInfo,
  modName?: string,
): Promise<string> {
  const { tagName, isPrerelease, version } = versionInfo;

  if (!tagName) {
    core.info("No tag detected, using default notes generation");
    return await generateNotes(undefined, undefined);
  }

  core.info(
    `Generating changelog for tag: ${tagName} (prerelease: ${isPrerelease})`,
  );

  const allTags = await getAllSemverTags();

  let prevTag: string | undefined;

  if (isPrerelease) {
    prevTag = allTags.find((tag) => tag !== tagName);
    core.info(
      `Prerelease: comparing against previous tag: ${prevTag || "none"}`,
    );
  } else {
    prevTag = allTags.find((tag) => tag !== tagName && isFullRelease(tag));
    core.info(
      `Full release: comparing against previous full release: ${prevTag || "none"}`,
    );
  }

  const prevVersion = prevTag
    ? prevTag.startsWith("v")
      ? prevTag.slice(1)
      : prevTag
    : undefined;

  const releaseType = isPrerelease ? "Pre-release" : "Release";
  let header = `# ${modName ? `${modName} - ` : ""}${releaseType} v${version}`;

  if (prevVersion) {
    header += `\nBelow are the changes since \`${prevVersion}\`.`;
  } else {
    header += `\nChanges since initial release:`;
  }

  const changelog = await generateNotes(tagName, prevTag);
  return `${header}\n\n${changelog || "No changes recorded"}`;
}

async function getAllSemverTags(): Promise<string[]> {
  let output = "";
  try {
    await exec.exec("git", ["tag", "-l", "v*", "--sort=-creatordate"], {
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        },
      },
      silent: true,
    });
  } catch (error) {
    core.warning(`Failed to list tags: ${error}`);
    return [];
  }

  return output
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => {
      if (!t) return false;
      const v = t.startsWith("v") ? t.slice(1) : t;
      return valid(v) !== null;
    });
}

function isFullRelease(tag: string): boolean {
  const v = tag.startsWith("v") ? tag.slice(1) : tag;
  const parsed = valid(v);
  return parsed !== null && !v.includes("-");
}

async function generateNotes(
  tagName?: string,
  prevTagName?: string,
): Promise<string> {
  const token = core.getInput("github-token");
  if (!token) {
    core.warning("No github-token provided, cannot generate release notes");
    return "";
  }

  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;

  try {
    const { data } = await octokit.rest.repos.generateReleaseNotes({
      owner,
      repo,
      tag_name: tagName || "HEAD",
      previous_tag_name: prevTagName,
    });
    return data.body;
  } catch (error) {
    core.warning(`Failed to generate release notes via API: ${error}`);
    return "";
  }
}
