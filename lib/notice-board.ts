import "server-only";

import { randomUUID } from "node:crypto";
import type {
  ImprovementSuggestion,
  NoticeBoardSuggestion,
  PostitColor,
} from "@/types/noticeBoard";
import { getNoticeBoardContainer } from "@/lib/cosmos-db";

const contentId = "greencon-start";
const suggestionKind = "suggestion";
const validColors: PostitColor[] = [
  "yellow",
  "green",
  "blue",
  "pink",
  "orange",
  "purple",
];

export class NoticeBoardNotFoundError extends Error {
  constructor() {
    super("The requested notice board item was not found.");
    this.name = "NoticeBoardNotFoundError";
  }
}

export class NoticeBoardInputError extends Error {
  constructor() {
    super("The notice board request is invalid.");
    this.name = "NoticeBoardInputError";
  }
}

type NewSuggestion = Pick<
  ImprovementSuggestion,
  "title" | "description" | "author" | "color"
>;

type StoredSuggestion = Omit<ImprovementSuggestion, "likes"> & {
  contentId: string;
  kind: typeof suggestionKind;
  likedBy: string[];
  _etag?: string;
};

export function isVoterId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export const isSuggestionId = isVoterId;

export function parseNewSuggestion(value: unknown): NewSuggestion {
  if (typeof value !== "object" || value === null) {
    throw new NoticeBoardInputError();
  }

  const input = value as Record<string, unknown>;
  const { title, description, author, color } = input;

  if (
    typeof title !== "string" ||
    title.trim().length === 0 ||
    title.trim().length > 120 ||
    typeof description !== "string" ||
    description.trim().length === 0 ||
    description.trim().length > 2000 ||
    typeof author !== "string" ||
    author.trim().length > 80 ||
    typeof color !== "string" ||
    !validColors.includes(color as PostitColor)
  ) {
    throw new NoticeBoardInputError();
  }

  return {
    title: title.trim(),
    description: description.trim(),
    author: author.trim() || "Anonym kollega",
    color: color as PostitColor,
  };
}

function toPublicSuggestion(
  suggestion: StoredSuggestion,
  voterId: string,
): NoticeBoardSuggestion {
  return {
    id: suggestion.id,
    title: suggestion.title,
    description: suggestion.description,
    category: suggestion.category,
    author: suggestion.author,
    createdAt: suggestion.createdAt,
    color: suggestion.color,
    likes: suggestion.likedBy.length,
    isLiked: suggestion.likedBy.includes(voterId),
  };
}

function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const { code } = error;
  return typeof code === "number" ? code : undefined;
}

export async function getNoticeBoard(voterId: string) {
  const container = getNoticeBoardContainer();
  const { resources } = await container.items
    .query<StoredSuggestion>(
      {
        query:
          "SELECT * FROM c WHERE c.contentId = @contentId AND c.kind = @kind ORDER BY c.createdAt DESC",
        parameters: [
          { name: "@contentId", value: contentId },
          { name: "@kind", value: suggestionKind },
        ],
      },
      { partitionKey: contentId },
    )
    .fetchAll();

  return resources.map((suggestion) =>
    toPublicSuggestion(suggestion, voterId),
  );
}

export async function createNoticeBoardSuggestion(input: NewSuggestion) {
  const suggestion: StoredSuggestion = {
    id: randomUUID(),
    contentId,
    kind: suggestionKind,
    title: input.title,
    description: input.description,
    author: input.author,
    createdAt: new Date().toISOString().slice(0, 10),
    likedBy: [],
    color: input.color,
  };

  await getNoticeBoardContainer().items.create(suggestion);
}

export async function deleteNoticeBoardSuggestion(id: string) {
  const container = getNoticeBoardContainer();
  let resource: StoredSuggestion | undefined;
  try {
    ({ resource } = await container
      .item(id, contentId)
      .read<StoredSuggestion>());
  } catch (error) {
    if (getStatusCode(error) === 404) {
      throw new NoticeBoardNotFoundError();
    }
    throw error;
  }

  if (!resource || resource.kind !== suggestionKind) {
    throw new NoticeBoardNotFoundError();
  }

  await container.item(id, contentId).delete();
}

export async function setNoticeBoardLike(
  id: string,
  voterId: string,
  isLiked: boolean,
): Promise<NoticeBoardSuggestion> {
  const container = getNoticeBoardContainer();
  const item = container.item(id, contentId);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    let resource: StoredSuggestion | undefined;
    try {
      ({ resource } = await item.read<StoredSuggestion>());
    } catch (error) {
      if (getStatusCode(error) === 404) {
        throw new NoticeBoardNotFoundError();
      }
      throw error;
    }
    if (!resource || resource.kind !== suggestionKind) {
      throw new NoticeBoardNotFoundError();
    }

    const currentlyLiked = resource.likedBy.includes(voterId);
    if (currentlyLiked === isLiked) {
      return toPublicSuggestion(resource, voterId);
    }

    if (!resource._etag) {
      throw new Error("Cosmos DB did not return an item ETag.");
    }

    const updated: StoredSuggestion = {
      ...resource,
      likedBy: isLiked
        ? [...resource.likedBy, voterId]
        : resource.likedBy.filter((id) => id !== voterId),
    };

    try {
      const { resource: saved } = await item.replace(updated, {
        accessCondition: {
          type: "IfMatch",
          condition: resource._etag,
        },
      });

      if (!saved) {
        throw new Error("Cosmos DB did not return the updated item.");
      }

      return toPublicSuggestion(saved, voterId);
    } catch (error) {
      if (getStatusCode(error) !== 412 || attempt === 4) {
        throw error;
      }
    }
  }

  throw new Error("Could not update the notice board like after retries.");
}
