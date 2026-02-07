import * as exec from "@actions/exec";
import * as core from "@actions/core";
import { valid, prerelease } from "semver";

export interface VersionInfo {
  version: string;
  tagName?: string;
  isRelease: boolean;
  isPrerelease: boolean;
}

export async function determineVersion(): Promise<VersionInfo> {
  const githubRef = process.env.GITHUB_REF ?? "";

  if (githubRef.startsWith("refs/tags/")) {
    const tagName = githubRef.replace("refs/tags/", "");

    if (tagName.startsWith("v")) {
      const versionWithoutV = tagName.slice(1);

      if (valid(versionWithoutV)) {
        const prereleaseComponents = prerelease(versionWithoutV);
        const isPrerelease =
          prereleaseComponents !== null && prereleaseComponents.length > 0;

        core.info(
          `Detected semver ${isPrerelease ? "prerelease" : "release"} tag: ${tagName} (version: ${versionWithoutV})`,
        );

        return {
          version: versionWithoutV,
          tagName,
          isRelease: true,
          isPrerelease,
        };
      }
    }

    core.warning(
      `Tag '${tagName}' does not match required format (vX.Y.Z), using snapshot version`,
    );
  } else {
    core.info("No tag detected, using snapshot version");
  }

  const commitHash = await getShortCommitHash();
  return {
    version: `0.0.0-${commitHash}`,
    isRelease: false,
    isPrerelease: false,
  };
}

async function getShortCommitHash(): Promise<string> {
  let output = "";
  await exec.exec("git", ["rev-parse", "--short", "HEAD"], {
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString();
      },
    },
    silent: true,
  });
  return output.trim();
}
