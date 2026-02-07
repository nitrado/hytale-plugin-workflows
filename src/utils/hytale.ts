import { HttpClient } from "@actions/http-client";

const METADATA_URL =
  "https://maven.hytale.com/release/com/hypixel/hytale/Server/maven-metadata.xml";

export async function getLatestHytaleServerVersion(): Promise<string> {
  const http = new HttpClient("hytale-plugin-workflows");
  const response = await http.get(METADATA_URL);

  if (response.message.statusCode !== 200) {
    throw new Error(
      `Failed to fetch Hytale metadata: ${response.message.statusMessage}`,
    );
  }

  const body = await response.readBody();
  const match = body.match(/<release>([^<]+)<\/release>/);

  if (!match) {
    throw new Error(
      "Could not parse Hytale Server version from maven-metadata.xml",
    );
  }

  return match[1];
}
