# Hytale Plugin Workflows

Reusable GitHub Actions workflows for building, testing, and publishing Hytale plugins.

## Available Workflows

| Workflow                                                              | Description                                                                 |
|-----------------------------------------------------------------------|-----------------------------------------------------------------------------|
| [`maven-plugin-ci.yml`](#plugin-ci-plugin-ciyml)                      | Complete CI/CD workflow for building, releasing, and publishing with maven  |
| [`gradle-plugin-ci.yml`](#plugin-ci-plugin-ciyml)                     | Complete CI/CD workflow for building, releasing, and publishing with gradle |
| [`maven-publish.yml`](#maven-publish-maven-publishyml)                | Standalone Maven repository publishing                                      |
| [`gcs-publish.yml`](#gcs-publish-gcs-publishyml)                      | Standalone Google Cloud Storage publishing                                  |
| [`modtale-publish.yml`](#modtale-publish-modtale-publishyml)          | Standalone Modtale publishing                                               |
| [`curseforge-publish.yml`](#curseforge-publish-curseforge-publishyml) | Standalone CurseForge publishing                                            |

---

## Plugin CI (`*-plugin-ci.yml`)

A complete CI/CD workflow for Java-based Hytale plugins that handles building, versioning, GitHub releases, Maven publishing, and GCS artifact uploads.
- Use maven-plugin-ci.yml for maven projects.
- Use gradle-plugin-ci.yml for gradle projects.

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
    uses: nitrado/hytale-plugin-workflows/.github/workflows/maven-plugin-ci.yml@main
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
```

### Gradle version

The gradle version requires in the `build.gradle` file the following task:

```groovy
jar {
   destinationDirectory.set(file("$buildDir/out"))
}
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
    uses: nitrado/hytale-plugin-workflows/.github/workflows/maven-plugin-ci.yml@main
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

## What It Does

1. **Build Job**
   - Checks out code
   - Sets up Java with Maven caching
   - Determines version from git tags
   - Fetches the latest Hytale Server version from [maven.hytale.com](https://maven.hytale.com/release/com/hypixel/hytale/Server/maven-metadata.xml)
   - Updates `manifest.json` version (if enabled)
   - Builds the project with `mvn package`, passing `-Dhytale.server.version=<version>`
   - Uploads JAR artifacts

2. **Publish Job** (releases only)
   - Creates a GitHub Release with release notes
   - Uploads JAR and ZIP archives to the release
   - Optionally uploads artifacts to GCS

3. **Maven Publish Job** (releases only)
   - Deploys artifacts to a Maven repository

4. **Modtale Publish Job** (releases only)
   - Fetches GitHub-generated release notes
   - Publishes to [Modtale](https://modtale.net) with appropriate channel (RELEASE or BETA based on prerelease status)

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

After a release tag is pushed:
1. The **build** and **generate-changelog** jobs run automatically
2. The **publish** job creates the GitHub Release with auto-generated notes
3. The workflow **pauses** and waits for approval on the `publish-external` environment
4. You can edit the GitHub Release notes during this time
5. Once approved, all external publish jobs (GCS, Maven, Modtale, CurseForge) proceed in parallel

> **Note:** Without the `publish-external` environment configured with required reviewers, the external publish jobs will run immediately after the GitHub Release is created.

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
    uses: nitrado/hytale-plugin-workflows/.github/workflows/plugin-ci.yml@main
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
    uses: nitrado/hytale-plugin-workflows/.github/workflows/maven-publish.yml@main
    with:
      version: "1.0.0"
      tag-name: "v1.0.0"
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

| Input          | Type   | Required | Default | Description                    |
|----------------|--------|----------|---------|--------------------------------|
| `version`      | string | Yes      | -       | The version to publish         |
| `tag-name`     | string | Yes      | -       | The GitHub release tag name    |
| `java-version` | string | No       | `"25"`  | Java version for Maven publish |

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
    uses: nitrado/hytale-plugin-workflows/.github/workflows/gcs-publish.yml@main
    with:
      artifact-id: "my-plugin"
      version: "1.0.0"
      tag-name: "v1.0.0"
    secrets:
      GCP_CREDENTIALS: ${{ secrets.GCP_CREDENTIALS }}
      GCS_BUCKET: ${{ secrets.GCS_BUCKET }}
```

### Inputs

| Input         | Type   | Required | Description                    |
|---------------|--------|----------|--------------------------------|
| `artifact-id` | string | Yes      | The artifact ID (jar prefix)   |
| `version`     | string | Yes      | The version to publish         |
| `tag-name`    | string | Yes      | The GitHub release tag name    |

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
    uses: nitrado/hytale-plugin-workflows/.github/workflows/modtale-publish.yml@main
    with:
      artifact-id: "my-plugin"
      version: "1.0.0"
      tag-name: "v1.0.0"
      channel: "RELEASE"  # optional: RELEASE, BETA, or ALPHA
      game-versions: "1.0-SNAPSHOT"  # optional
    secrets:
      MODTALE_API_KEY: ${{ secrets.MODTALE_API_KEY }}
      MODTALE_PROJECT_ID: ${{ secrets.MODTALE_PROJECT_ID }}
```

### Inputs

| Input           | Type   | Required | Default                          | Description                       |
|-----------------|--------|----------|----------------------------------|-----------------------------------|
| `artifact-id`   | string | Yes      | -                                | The artifact ID (jar prefix)      |
| `version`       | string | Yes      | -                                | The version to publish            |
| `tag-name`      | string | Yes      | -                                | The GitHub release tag name       |
| `channel`       | string | No       | `"RELEASE"`                      | Channel: RELEASE, BETA, or ALPHA  |
| `game-versions` | string | No       | `"1.0-SNAPSHOT"`                 | Hytale versions (comma-separated) |
| `changelog`     | string | No       | `"Automated Build & Release..."` | Changelog for this version        |

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
    uses: nitrado/hytale-plugin-workflows/.github/workflows/curseforge-publish.yml@main
    with:
      artifact-id: "my-plugin"
      version: "1.0.0"
      tag-name: "v1.0.0"
      release-type: "release"  # optional: release, beta, or alpha
      game-endpoint: "hytale"  # optional
    secrets:
      CURSEFORGE_TOKEN: ${{ secrets.CURSEFORGE_TOKEN }}
      CURSEFORGE_PROJECT_ID: ${{ secrets.CURSEFORGE_PROJECT_ID }}
```

### Inputs

| Input            | Type   | Required | Default                          | Description                              |
|------------------|--------|----------|----------------------------------|------------------------------------------|
| `artifact-id`    | string | Yes      | -                                | The artifact ID (jar prefix)             |
| `version`        | string | Yes      | -                                | The version to publish                   |
| `tag-name`       | string | Yes      | -                                | The GitHub release tag name              |
| `release-type`   | string | No       | `"release"`                      | Type: release, beta, or alpha            |
| `game-endpoint`  | string | No       | `"authors"`                      | CurseForge subdomain (e.g., hytale)      |
| `game-versions`  | string | No       | `""`                             | Game version IDs (comma-separated)       |
| `changelog`      | string | No       | `"Automated Build & Release..."` | Changelog for this version               |
| `changelog-type` | string | No       | `"markdown"`                     | Changelog type: text, html, or markdown  |
| `relations`      | string | No       | `""`                             | Project relations (slug:type, comma-sep) |

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
