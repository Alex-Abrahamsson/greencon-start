import "server-only";

import { CosmosClient } from "@azure/cosmos";

export class CosmosConfigurationError extends Error {
  constructor() {
    super("Cosmos DB server configuration is incomplete.");
    this.name = "CosmosConfigurationError";
  }
}

const globalForCosmos = globalThis as typeof globalThis & {
  cosmosClient?: CosmosClient;
};

export function getCosmosClient(): CosmosClient {
  const endpoint = process.env.COSMOS_ENDPOINT?.trim();
  const key = process.env.COSMOS_KEY?.trim();

  if (!endpoint || !key) {
    throw new CosmosConfigurationError();
  }

  if (!globalForCosmos.cosmosClient) {
    globalForCosmos.cosmosClient = new CosmosClient({ endpoint, key });
  }

  return globalForCosmos.cosmosClient;
}

export function getNoticeBoardContainer() {
  const databaseId = process.env.COSMOS_DATABASE?.trim();
  const containerId = process.env.COSMOS_CONTENT_CONTAINER?.trim();

  if (!databaseId || !containerId) {
    throw new CosmosConfigurationError();
  }

  return getCosmosClient().database(databaseId).container(containerId);
}

export function getCalendarEventsContainer() {
  const databaseId = process.env.COSMOS_DATABASE?.trim();
  const containerId = process.env.COSMOS_EVENTS_CONTAINER?.trim();

  if (!databaseId || !containerId) {
    throw new CosmosConfigurationError();
  }

  return getCosmosClient().database(databaseId).container(containerId);
}
