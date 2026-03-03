# Hytale Plugin Workflows (v2)

Reusable GitHub Actions workflows for building, testing, and publishing Hytale plugins.

## Changes from v1

- The `tag-name` input is now required on all publish workflows (including `workflow_dispatch`). It is used solely to identify the GitHub release for asset downloads and prerelease detection.
- Release type / channel (release vs beta) is now always auto-detected from the GitHub release's prerelease status. The `release-type`, `channel`, and `changelog` inputs have been removed from CurseForge and Modtale publish workflows.
- Changelog is now always fetched from the GitHub release body rather than passed as an input.

## Available Workflows

| Workflow                                                                                               | Description                                                           |
|--------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| [`plugin-ci.yml`](#plugin-ci-plugin-ciyml)                                                             | Complete CI/CD workflow for building, releasing, and publishing       |
| [`rebuild-on-new-server-version.yml`](#rebuild-on-new-server-version-rebuild-on-new-server-versionyml) | Schedulable check to rebuild when a new Hytale Server version appears |
| [`maven-publish.yml`](#maven-publish-maven-publishyml)                                                 | Standalone Maven repository publishing                                |
| [`gcs-publish.yml`](#gcs-publish-gcs-publishyml)                                                       | Standalone Google Cloud Storage publishing                            |
| [`modtale-publish.yml`](#modtale-publish-modtale-publishyml)                                           | Standalone Modtale publishing                                         |
| [`curseforge-publish.yml`](#curseforge-publish-curseforge-publishyml)                                  | Standalone CurseForge publishing                                      |

---

## Plugin CI (`plugin-ci.yml`)

A complete CI/CD workflow for Java-based Hytale plugins that handles building, versioning, GitHub releases, Maven publishing, and GCS artifact uploads. Supports re-running on an existing tag to produce additional builds when the Hytale Server version changes.

### Usage

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
    uses: nitrado/hytale-plugin-workflows/.github/workflows/plugin-ci.yml@v2
    secrets:
      MAVEN_REPO_URL: ${{ secrets.MAVEN_REPO_URL }}
      MAVEN_USERNAME: ${{ secrets.MAVEN_USERNAME }}
      MAVEN_PASSWORD: ${{ secrets.MAVEN_PASSWORD }}
      MAVEN_PUBLISH_URL: ${{ secrets.MAVEN_PUBLISH_URL }}
      MAVEN_PUBLISH_USERNAME: ${{ secrets.MAVEN_PUBLISH_USERNAME }}
      MAVEN_PUBLISH_PASSWORD: ${{ secrets.MAVEN_PUBLISH_PASSWORD }}
      GCP_CREDENTIALS: ${{ secrets.GCP_CREDENTIALS }}
      GCS_BUCKET: ${{ secrets.GCS_BUCKET }}
      MODTALE_API_KEY: ${{ secrets.MODTALE_API_KEY }}
      MODTALE_PROJECT_ID: ${{ secrets.MODTALE_PROJECT_ID }}
      CURSEFORGE_TOKEN: ${{ secrets.CURSEFORGE_TOKEN }}
      CURSEFORGE_PROJECT_ID: ${{ secrets.CURSEFORGE_PROJECT_ID }}
```

## Inputs

| Input                     | Type   | Default                              | Description                                                     |
|---------------------------|--------|--------------------------------------|-----------------------------------------------------------------|
| `java-version`            | string | `"25"`                               | Java version for building                                       |
| `java-version-publish`    | string | `"25"`                               | Java version for Maven publishing                               |
| `artifact-retention-days` | number | `7`                                  | Number of days to retain build artifacts                        |
| `manifest-path`           | string | `"src/main/resources/manifest.json"` | Path to manifest.json file                                      |
| `checkout-ref`            | string | `""`                                 | Git ref to checkout (tag, branch, SHA). Defaults to the triggering ref |

### Example with Custom Inputs

```yaml
jobs:
  build:
    uses: nitrado/hytale-plugin-workflows/.github/workflows/plugin-ci.yml@v2
    with:
      java-version: "25"
      artifact-retention-days: 14
      has-manifest: false
    secrets:
      # ...
```

## Secrets

| Secret                   | Required | Description                                    |
|--------------------------|----------|------------------------------------------------|
| `MAVEN_REPO_URL`         | No       | Maven repository URL for fetching dependencies |
| `MAVEN_USERNAME`         | No       | Maven repository username                      |
| `MAVEN_PASSWORD`         | No       | Maven repository password                      |
| `MAVEN_PUBLISH_URL`      | No       | Maven repository URL for publishing releases   |
| `MAVEN_PUBLISH_USERNAME` | No       | Maven publish username                         |
| `MAVEN_PUBLISH_PASSWORD` | No       | Maven publish password                         |
| `GCP_CREDENTIALS`        | No       | GCP credentials JSON for GCS uploads           |
| `GCS_BUCKET`             | No       | GCS bucket name for artifact storage           |
| `MODTALE_API_KEY`        | No       | Modtale API key for publishing to Modtale      |
| `MODTALE_PROJECT_ID`     | No       | Modtale project ID for publishing              |
| `CURSEFORGE_TOKEN`       | No       | CurseForge API token for publishing            |
| `CURSEFORGE_PROJECT_ID`  | No       | CurseForge project ID (numeric)                |

## Outputs

| Output                  | Description                                      |
|-------------------------|--------------------------------------------------|
| `version`               | The resolved version string                      |
| `artifact_id`           | The Maven artifact ID                            |
| `is_release`            | Whether this is a release build (`true`/`false`) |
| `hytale_server_version` | The Hytale Server version used for building      |

## Versioning Behavior

- **Tagged builds** (e.g., `v1.2.3`): Uses the tag as the version, triggers release publishing
- **Prerelease tags** (e.g., `v1.2.3-rc1`, `v1.2.3-alpha1`): Creates a prerelease on GitHub
- **Non-tagged builds**: Uses `0.0.0-<commit-hash>` as a snapshot version

Tags must follow semver format with a leading `v` (e.g., `v1.0.0`, `v2.1.0-beta1`).

## Re-running for New Server Versions

The Hytale Server version can change independently of your plugin. When that happens, you can re-run the workflow on a previously released tag to produce an additional build:

1. Navigate to **Actions** → **CI** → select a previous run on the release tag → **Re-run all jobs** (or trigger a new workflow run on the same tag)
2. The build job compiles against the latest Hytale Server version, producing a new JAR (e.g., `my-plugin-1.0.0+2026.02.19-1a311a592.jar` alongside the existing `my-plugin-1.0.0+2026.02.18-f3b8fff95.jar`)
3. The release job detects the existing GitHub Release and:
   - Adds the new JAR as an additional asset (does **not** remove previous JARs)
   - Rebuilds the `.zip` archive to contain **all** JARs from the release
   - Updates the `## Server Versions` section in the release body to list every server version
   - Preserves the original changelog
4. External publish jobs (GCS, Maven, Modtale, CurseForge) run for the newly built JAR

## What It Does

1. **Build Job**
   - Checks out code
   - Sets up Java with Maven caching
   - Determines version from git tags
   - Fetches the latest Hytale Server version from [maven.hytale.com](https://maven.hytale.com/release/com/hypixel/hytale/Server/maven-metadata.xml)
   - Updates `manifest.json` version (if enabled)
   - Builds the project with `mvn package`, passing `-Dhytale.server.version=<version>`
   - Uploads JAR artifacts

2. **Release Job** (releases only)
   - **New release:** Generates a changelog and creates a GitHub Release with the JAR, a ZIP archive, and a "Server Versions" section listing the Hytale Server version
   - **Existing release (re-run):** Downloads all existing JARs from the release, adds the newly built JAR, rebuilds the ZIP to contain all JARs, and updates the "Server Versions" section. The original changelog is preserved.
   - This allows the workflow to be re-run on the same tag when a new Hytale Server version is released, producing an additional JAR without creating a new GitHub release.

3. **GCS Publish Job** (releases only)
   - Uploads artifacts to Google Cloud Storage

4. **Maven Publish Job** (releases only)
   - Deploys artifacts to a Maven repository

5. **Modtale Publish Job** (releases only)
   - Fetches GitHub-generated release notes
   - Publishes to [Modtale](https://modtale.net) with appropriate channel (RELEASE or BETA based on prerelease status)

6. **CurseForge Publish Job** (releases only)
   - Fetches GitHub-generated release notes
   - Publishes to CurseForge with appropriate release type (release or beta based on prerelease status)

## Manual Approval for External Publishing

External platform publishing (GCS, Maven, Modtale, CurseForge) requires manual approval via a GitHub environment. This
allows you to review and edit the GitHub Release notes before they are pushed to external platforms.

### Setup

Each repository using these workflows must configure the environment:

1. Go to **your plugin repository's** Settings → Environments
2. Create a new environment named `publish-external`
3. Enable **Required reviewers** and add the appropriate approvers
4. Optionally configure a wait timer or deployment branches

> **Important:** The `publish-external` environment must be configured in each repository that calls these workflows—not in this workflows repository.

### Workflow Behavior

After a release tag is pushed (or re-run on an existing tag):
1. The **build** job runs automatically
2. The **release** job creates or updates the GitHub Release with auto-generated notes and a "Server Versions" list
3. The workflow **pauses** and waits for approval on the `publish-external` environment
4. You can edit the GitHub Release notes during this time
5. Once approved, all external publish jobs (GCS, Maven, Modtale, CurseForge) proceed in parallel

> **Note:** Without the `publish-external` environment configured with required reviewers, the external publish jobs will run immediately after the GitHub Release is created.

---

## Rebuild on new Server Version (`rebuild-on-new-server-version.yml`)

A reusable workflow intended to run on a schedule. It checks whether the latest Hytale Server version is already covered by the most recent stable GitHub release, and if not, triggers a full `plugin-ci` build against that release tag.

### How It Works

1. Fetches the current Hytale Server version from [maven.hytale.com](https://maven.hytale.com/release/com/hypixel/hytale/Server/maven-metadata.xml)
2. Determines the latest stable (non-prerelease) GitHub release
3. Inspects the release's JAR assets to extract which server versions are already supported (based on the `+<server-version>` suffix in filenames like `my-plugin-1.0.0+2026.02.19-1a311a592.jar`)
4. If the current server version is **not** among the supported versions, calls `plugin-ci.yml` with `checkout-ref` set to the release tag - producing a new JAR, updating the release, and publishing to all configured platforms

### Usage

Create a scheduled workflow in your plugin repository (e.g., `.github/workflows/server-version-check.yml`):

```yaml
name: Check for new Hytale Server version

on:
  schedule:
    - cron: '0 */6 * * *'  # every 6 hours
  workflow_dispatch:         # allow manual triggers

jobs:
  check:
    uses: nitrado/hytale-plugin-workflows/.github/workflows/rebuild-on-new-server-version.yml@v2
    with:
      artifact-id: my-plugin
    secrets:
      MAVEN_REPO_URL: ${{ secrets.MAVEN_REPO_URL }}
      MAVEN_USERNAME: ${{ secrets.MAVEN_USERNAME }}
      MAVEN_PASSWORD: ${{ secrets.MAVEN_PASSWORD }}
      MAVEN_PUBLISH_URL: ${{ secrets.MAVEN_PUBLISH_URL }}
      MAVEN_PUBLISH_USERNAME: ${{ secrets.MAVEN_PUBLISH_USERNAME }}
      MAVEN_PUBLISH_PASSWORD: ${{ secrets.MAVEN_PUBLISH_PASSWORD }}
      GCP_CREDENTIALS: ${{ secrets.GCP_CREDENTIALS }}
      GCS_BUCKET: ${{ secrets.GCS_BUCKET }}
      MODTALE_API_KEY: ${{ secrets.MODTALE_API_KEY }}
      MODTALE_PROJECT_ID: ${{ secrets.MODTALE_PROJECT_ID }}
      CURSEFORGE_TOKEN: ${{ secrets.CURSEFORGE_TOKEN }}
      CURSEFORGE_PROJECT_ID: ${{ secrets.CURSEFORGE_PROJECT_ID }}
```

### Inputs

| Input         | Type   | Required | Description                                       |
|---------------|--------|----------|---------------------------------------------------|
| `artifact-id` | string | Yes      | The Maven artifact ID, e.g. `nitrado-query`       |

### Secrets

All secrets are forwarded to `plugin-ci.yml`. See the [Plugin CI Secrets](#secrets) table for details.

## Modtale Publishing

The workflow automatically publishes releases to Modtale when the required secrets are configured. No additional inputs are needed—publishing is triggered for all release builds.

### Configuration

Add these secrets to your repository:

| Secret               | Required | Description                                                      |
|----------------------|----------|------------------------------------------------------------------|
| `MODTALE_API_KEY`    | Yes      | Your Modtale API key (obtain from your Modtale account settings) |
| `MODTALE_PROJECT_ID` | Yes      | Your Modtale project ID                                          |

### Example Usage

```yaml
jobs:
  build:
    uses: nitrado/hytale-plugin-workflows/.github/workflows/plugin-ci.yml@v2
    secrets:
      # ... other secrets ...
      MODTALE_API_KEY: ${{ secrets.MODTALE_API_KEY }}
      MODTALE_PROJECT_ID: ${{ secrets.MODTALE_PROJECT_ID }}
```

### Behavior

- **Release tags** (e.g., `v1.0.0`): Published to the `RELEASE` channel
- **Prerelease tags** (e.g., `v1.0.0-rc1`, `v1.0.0-beta2`): Published to the `BETA` channel
- **Changelog**: Automatically uses GitHub-generated release notes
- **Game versions**: Automatically set to the latest Hytale Server version (fetched from maven.hytale.com)

If `MODTALE_API_KEY` or `MODTALE_PROJECT_ID` are not configured, the Modtale publish step is silently skipped.

---

## Maven Publish (`maven-publish.yml`)

Standalone workflow to publish artifacts to a Maven repository. Can be called from other repositories.

### Usage

```yaml
jobs:
  publish-maven:
    uses: nitrado/hytale-plugin-workflows/.github/workflows/maven-publish.yml@v2
    with:
      version: "1.0.0"
      tag-name: "v1.0.0"
      hytale-server-version: "2026.02.19-1a311a592"
      java-version: "25"  # optional, defaults to 25
    secrets:
      MAVEN_REPO_URL: ${{ secrets.MAVEN_REPO_URL }}
      MAVEN_USERNAME: ${{ secrets.MAVEN_USERNAME }}
      MAVEN_PASSWORD: ${{ secrets.MAVEN_PASSWORD }}
      MAVEN_PUBLISH_URL: ${{ secrets.MAVEN_PUBLISH_URL }}
      MAVEN_PUBLISH_USERNAME: ${{ secrets.MAVEN_PUBLISH_USERNAME }}
      MAVEN_PUBLISH_PASSWORD: ${{ secrets.MAVEN_PUBLISH_PASSWORD }}
```

### Inputs

| Input                   | Type   | Required | Default | Description                                                |
|-------------------------|--------|----------|---------|------------------------------------------------------------|
| `version`               | string | Yes      | -       | The Maven version to publish, e.g. `1.1.1-rc1`             |
| `tag-name`              | string | Yes      | -       | The GitHub release tag name                                |
| `hytale-server-version` | string | Yes      | -       | The Hytale Server version to use for dependency resolution |
| `java-version`          | string | No       | `"25"`  | Java version for Maven publish                             |

### Secrets

| Secret                   | Required | Description                         |
|--------------------------|----------|-------------------------------------|
| `MAVEN_REPO_URL`         | No       | Maven repository URL for deps       |
| `MAVEN_USERNAME`         | No       | Maven repository username           |
| `MAVEN_PASSWORD`         | No       | Maven repository password           |
| `MAVEN_PUBLISH_URL`      | Yes      | Maven repository URL for publishing |
| `MAVEN_PUBLISH_USERNAME` | Yes      | Maven publish username              |
| `MAVEN_PUBLISH_PASSWORD` | Yes      | Maven publish password              |

---

## GCS Publish (`gcs-publish.yml`)

Standalone workflow to upload release artifacts to Google Cloud Storage. Can be called from other repositories.

### Usage

```yaml
jobs:
  publish-gcs:
    uses: nitrado/hytale-plugin-workflows/.github/workflows/gcs-publish.yml@v2
    with:
      artifact-id: "my-plugin"
      version: "1.0.0+2026.02.19-1a311a592"
      tag-name: "v1.0.0"
    secrets:
      GCP_CREDENTIALS: ${{ secrets.GCP_CREDENTIALS }}
      GCS_BUCKET: ${{ secrets.GCS_BUCKET }}
```

### Inputs

| Input         | Type   | Required | Description                                                      |
|---------------|--------|----------|------------------------------------------------------------------|
| `artifact-id` | string | Yes      | The Maven artifact ID, e.g. `nitrado-query`                      |
| `version`     | string | Yes      | The semver version string, e.g. `1.1.1-rc1+2026.02.19-1a311a592` |
| `tag-name`    | string | Yes      | The GitHub release tag name                                      |

### Secrets

| Secret            | Required | Description                    |
|-------------------|----------|--------------------------------|
| `GCP_CREDENTIALS` | Yes      | GCP credentials JSON           |
| `GCS_BUCKET`      | Yes      | GCS bucket for artifact upload |

---

## Modtale Publish (`modtale-publish.yml`)

Standalone workflow to publish releases to [Modtale](https://modtale.net). Can be called from other repositories.

### Usage

```yaml
jobs:
  publish-modtale:
    uses: nitrado/hytale-plugin-workflows/.github/workflows/modtale-publish.yml@v2
    with:
      artifact-id: "my-plugin"
      version: "1.0.0+2026.02.19-1a311a592"
      tag-name: "v1.0.0"
      game-versions: "1.0-SNAPSHOT"  # optional
    secrets:
      MODTALE_API_KEY: ${{ secrets.MODTALE_API_KEY }}
      MODTALE_PROJECT_ID: ${{ secrets.MODTALE_PROJECT_ID }}
```

### Inputs

| Input           | Type   | Required | Default          | Description                                                      |
|-----------------|--------|----------|------------------|------------------------------------------------------------------|
| `artifact-id`   | string | Yes      | -                | The Maven artifact ID, e.g. `nitrado-query`                      |
| `version`       | string | Yes      | -                | The semver version string, e.g. `1.1.1-rc1+2026.02.19-1a311a592` |
| `tag-name`      | string | Yes      | -                | The GitHub release tag name                                      |
| `game-versions` | string | No       | `"1.0-SNAPSHOT"` | Hytale versions (comma-separated)                                |

The release channel (RELEASE or BETA) is automatically determined from the GitHub release's prerelease status.

### Secrets

| Secret               | Required | Description          |
|----------------------|----------|----------------------|
| `MODTALE_API_KEY`    | Yes      | Modtale API key      |
| `MODTALE_PROJECT_ID` | Yes      | Modtale project ID   |

---

## CurseForge Publish (`curseforge-publish.yml`)

Standalone workflow to publish releases to CurseForge. Can be called from other repositories.

### Usage

```yaml
jobs:
  publish-curseforge:
    uses: nitrado/hytale-plugin-workflows/.github/workflows/curseforge-publish.yml@v2
    with:
      artifact-id: "my-plugin"
      version: "1.0.0+2026.02.19-1a311a592"
      tag-name: "v1.0.0"
      game-endpoint: "42"  # optional
    secrets:
      CURSEFORGE_TOKEN: ${{ secrets.CURSEFORGE_TOKEN }}
      CURSEFORGE_PROJECT_ID: ${{ secrets.CURSEFORGE_PROJECT_ID }}
```

### Inputs

| Input           | Type   | Required | Default | Description                                                      |
|-----------------|--------|----------|---------|------------------------------------------------------------------|
| `artifact-id`   | string | Yes      | -       | The Maven artifact ID, e.g. `nitrado-query`                      |
| `version`       | string | Yes      | -       | The semver version string, e.g. `1.1.1-rc1+2026.02.19-1a311a592` |
| `tag-name`      | string | Yes      | -       | The GitHub release tag name                                      |
| `game-endpoint` | string | No       | `"42"`  | CurseForge subdomain (e.g., minecraft, kerbal, hytale)           |
| `game-versions` | string | No       | `""`    | Game version IDs (comma-separated)                               |
| `relations`     | string | No       | `""`    | Project relations (slug:type, comma-sep)                         |

The release type (release or beta) is automatically determined from the GitHub release's prerelease status.

### Secrets

| Secret                  | Required | Description                     |
|-------------------------|----------|---------------------------------|
| `CURSEFORGE_TOKEN`      | Yes      | CurseForge API token            |
| `CURSEFORGE_PROJECT_ID` | Yes      | CurseForge project ID (numeric) |

---## Requirements

- Your project must use Maven
- The `pom.xml` should support the `-Drevision` property for version injection
- The `pom.xml` should support the `-Dhytale.server.version` property for the Hytale Server dependency version (see example below)
- For manifest updates, ensure `manifest.json` has a `"Version": "..."` field

### Example `pom.xml` Configuration

Your `pom.xml` should define properties with defaults that can be overridden via command line:

```xml
<properties>
    <revision>1.0.0-SNAPSHOT</revision>
    <hytale.server.version>1.0-SNAPSHOT</hytale.server.version>
</properties>

<dependencies>
    <dependency>
        <groupId>com.hypixel.hytale</groupId>
        <artifactId>Server</artifactId>
        <version>${hytale.server.version}</version>
        <scope>provided</scope>
    </dependency>
</dependencies>
```

The workflow will automatically pass the latest Hytale Server version via `-Dhytale.server.version=<version>` during the build.

