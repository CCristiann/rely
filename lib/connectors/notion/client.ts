import { Client } from "@notionhq/client";

export function createNotionClient(accessToken: string): Client {
    return new Client({ auth: accessToken });
}