# Hytale Plugin Workflows

Reusable GitHub Actions workflows for building, testing, and publishing Hytale plugins.

## Available Workflows

### Plugin CI (`plugin-ci.yml`)

A complete CI/CD workflow for Java-based Hytale plugins that handles building, versioning, GitHub releases, Maven publishing, and GCS artifact uploads.

## Usage

Create a workflow file in your plugin repository (e.g., `.github/workflows/ci.yml`):

```yaml
name: CI

on:
  push:
    branches: [main]
    tags:
      - 'v*'
  pull_request:
    branches: [main]

jobs:
  build:
    uses: nitrado/hytale-plugin-workflows/.github/workflows/plugin-ci.yml@main
    secrets:
      MAVEN_REPO_URL: ${{ secrets.MAVEN_REPO_URL }}
      MAVEN_USERNAME: ${{ secrets.MAVEN_USERNAME }}
      MAVEN_PASSWORD: ${{ secrets.MAVEN_PASSWORD }}
      MAVEN_PUBLISH_URL: ${{ secrets.MAVEN_PUBLISH_URL }}
      MAVEN_PUBLISH_USERNAME: ${{ secrets.MAVEN_PUBLISH_USERNAME }}
      MAVEN_PUBLISH_PASSWORD: ${{ secrets.MAVEN_PUBLISH_PASSWORD }}
      GCP_CREDENTIALS: ${{ secrets.GCP_CREDENTIALS }}
      GCS_BUCKET: ${{ secrets.GCS_BUCKET }}
```

## Inputs

| Input                     | Type    | Default                              | Description                                          |
|---------------------------|---------|--------------------------------------|------------------------------------------------------|
| `java-version`            | string  | `"25"`                               | Java version for building                            |
| `java-version-publish`    | string  | `"25"`                               | Java version for Maven publishing                    |
| `artifact-retention-days` | number  | `7`                                  | Number of days to retain build artifacts             |
| `manifest-path`           | string  | `"src/main/resources/manifest.json"` | Path to manifest.json file                           |

### Example with Custom Inputs

```yaml
jobs:
  build:
    uses: nitrado/hytale-plugin-workflows/.github/workflows/plugin-ci.yml@main
    with:
      java-version: "21"
      artifact-retention-days: 14
      has-manifest: false
    secrets:
      # ...
```

## Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `MAVEN_REPO_URL` | No | Maven repository URL for fetching dependencies |
| `MAVEN_USERNAME` | No | Maven repository username |
| `MAVEN_PASSWORD` | No | Maven repository password |
| `MAVEN_PUBLISH_URL` | No | Maven repository URL for publishing releases |
| `MAVEN_PUBLISH_USERNAME` | No | Maven publish username |
| `MAVEN_PUBLISH_PASSWORD` | No | Maven publish password |
| `GCP_CREDENTIALS` | No | GCP credentials JSON for GCS uploads |
| `GCS_BUCKET` | No | GCS bucket name for artifact storage |

## Outputs

| Output | Description |
|--------|-------------|
| `version` | The resolved version string |
| `artifact_id` | The Maven artifact ID |
| `is_release` | Whether this is a release build (`true`/`false`) |

## Versioning Behavior

- **Tagged builds** (e.g., `v1.2.3`): Uses the tag as the version, triggers release publishing
- **Prerelease tags** (e.g., `v1.2.3-rc1`, `v1.2.3-alpha1`): Creates a prerelease on GitHub
- **Non-tagged builds**: Uses `0.0.0-<commit-hash>` as a snapshot version

Tags must follow semver format with a leading `v` (e.g., `v1.0.0`, `v2.1.0-beta1`).

## What It Does

1. **Build Job**
   - Checks out code
   - Sets up Java with Maven caching
   - Determines version from git tags
   - Updates `manifest.json` version (if enabled)
   - Builds the project with `mvn package`
   - Uploads JAR artifacts

2. **Publish Job** (releases only)
   - Creates a GitHub Release with release notes
   - Uploads JAR and ZIP archives to the release
   - Optionally uploads artifacts to GCS

3. **Maven Publish Job** (releases only)
   - Deploys artifacts to a Maven repository

## Requirements

- Your project must use Maven
- The `pom.xml` should support the `-Drevision` property for version injection
- For manifest updates, ensure `manifest.json` has a `"Version": "..."` field
