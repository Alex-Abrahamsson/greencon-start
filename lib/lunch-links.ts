import "server-only";

import { randomUUID } from "node:crypto";
import { getNoticeBoardContainer } from "@/lib/cosmos-db";
import type { LunchLink } from "@/types/lunchLink";

const contentId = "greencon-start";
const lunchLinkKind = "lunch-link";

export class LunchLinkInputError extends Error {
  constructor() {
    super("The lunch link request is invalid.");
    this.name = "LunchLinkInputError";
  }
}

export class LunchLinkNotFoundError extends Error {
  constructor() {
    super("The requested lunch link was not found.");
    this.name = "LunchLinkNotFoundError";
  }
}

export class LunchLinkConflictError extends Error {
  constructor() {
    super("The lunch link was changed by another request.");
    this.name = "LunchLinkConflictError";
  }
}

type NewLunchLink = Pick<LunchLink, "name" | "href">;

type StoredLunchLink = LunchLink & {
  contentId: string;
  kind: typeof lunchLinkKind;
  _etag?: string;
};

export function isLunchLinkId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function parseLunchLink(value: unknown): NewLunchLink {
  if (typeof value !== "object" || value === null) {
    throw new LunchLinkInputError();
  }

  const input = value as Record<string, unknown>;
  const { name, href } = input;
  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    name.trim().length > 120 ||
    typeof href !== "string" ||
    href.trim().length > 2048
  ) {
    throw new LunchLinkInputError();
  }

  let url: URL;
  try {
    url = new URL(href.trim());
  } catch {
    throw new LunchLinkInputError();
  }

  if (
    url.protocol !== "https:" ||
    url.username.length > 0 ||
    url.password.length > 0
  ) {
    throw new LunchLinkInputError();
  }

  return {
    name: name.trim(),
    href: url.toString(),
  };
}

function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const { code } = error;
  if (typeof code === "number") return code;
  if (typeof code === "string" && /^\d+$/.test(code)) return Number(code);
  return undefined;
}

async function readLunchLink(id: string) {
  try {
    const { resource } = await getNoticeBoardContainer()
      .item(id, contentId)
      .read<StoredLunchLink>();

    if (!resource || resource.kind !== lunchLinkKind) {
      throw new LunchLinkNotFoundError();
    }

    return resource;
  } catch (error) {
    if (error instanceof LunchLinkNotFoundError) throw error;
    if (getStatusCode(error) === 404) {
      throw new LunchLinkNotFoundError();
    }
    throw error;
  }
}

export async function getLunchLinks(): Promise<LunchLink[]> {
  const { resources } = await getNoticeBoardContainer().items
    .query<StoredLunchLink>(
      {
        query:
          "SELECT * FROM c WHERE c.contentId = @contentId AND c.kind = @kind ORDER BY c.name ASC",
        parameters: [
          { name: "@contentId", value: contentId },
          { name: "@kind", value: lunchLinkKind },
        ],
      },
      { partitionKey: contentId },
    )
    .fetchAll();

  return resources.map(({ id, name, href }) => ({ id, name, href }));
}

export async function createLunchLink(input: NewLunchLink) {
  const link: StoredLunchLink = {
    id: randomUUID(),
    contentId,
    kind: lunchLinkKind,
    ...input,
  };

  await getNoticeBoardContainer().items.create(link);
}

export async function updateLunchLink(id: string, input: NewLunchLink) {
  const link = await readLunchLink(id);
  if (!link._etag) {
    throw new Error("Cosmos DB did not return a lunch link ETag.");
  }

  try {
    await getNoticeBoardContainer()
      .item(id, contentId)
      .replace(
        {
          ...link,
          ...input,
        },
        {
          accessCondition: {
            type: "IfMatch",
            condition: link._etag,
          },
        },
      );
  } catch (error) {
    if (getStatusCode(error) === 412) {
      throw new LunchLinkConflictError();
    }
    throw error;
  }
}

export async function deleteLunchLink(id: string) {
  await readLunchLink(id);
  try {
    await getNoticeBoardContainer().item(id, contentId).delete();
  } catch (error) {
    if (getStatusCode(error) === 404) {
      throw new LunchLinkNotFoundError();
    }
    throw error;
  }
}
