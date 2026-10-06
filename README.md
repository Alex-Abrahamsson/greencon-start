This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Mina supportärenden (Jira OAuth)

The personalized open-ticket count requires a server deployment and an Atlassian OAuth 2.0 (3LO) app. It cannot run as a static export.

1. Create an OAuth 2.0 (3LO) integration in the Atlassian Developer Console.
2. Add the Jira API scopes `read:jira-work`, `read:jira-user`, and `offline_access`.
3. Register this callback URL in the integration: `${APP_URL}/api/atlassian/callback`.
4. Copy `.env.example` to `.env.local` and set `APP_URL`, `ATLASSIAN_CLIENT_ID`, and `ATLASSIAN_CLIENT_SECRET`.
5. Set `ATLASSIAN_SESSION_SECRET` to a unique random value of at least 32 characters. Keep all values server-side and never commit `.env.local`.
6. Restart the app and select **Anslut ditt Jira-konto** on the start page.

The card counts unresolved issues in project `TICKET` assigned to the authorized Atlassian user, refreshes the count every five minutes while the page is visible, and opens the support queue when selected. OAuth tokens are encrypted in an HTTP-only cookie and are not sent to client-side JavaScript.

## Anslagstavlan (Azure Cosmos DB for NoSQL)

The notice board reads and writes suggestions through server-side API routes. To connect it:

1. Create an Azure Cosmos DB account with the **Azure Cosmos DB for NoSQL** API.
2. Create a database named `greencon-start` and a container named `greencon-content` with partition key `/contentId`.
3. Copy the Cosmos settings from `.env.example` into `.env.local` and set the account endpoint and key. Keep the key server-side; do not prefix it with `NEXT_PUBLIC_`.
4. Restart the app. The board only displays documents stored in Cosmos DB; it does not seed sample notes or import browser-local notes.

Suggestions and their like markers share the `greencon-start` logical partition so the board can be queried and updated without cross-partition requests. Likes are associated with a browser-generated ID stored in each Cosmos DB suggestion; the displayed total is derived from those IDs. The browser stores only its own ID locally. Cosmos DB credentials stay on the server.

Lunch links use the same `greencon-content` container and `contentId` partition, stored as `lunch-link` documents. They can be added, edited, and deleted from the Lunch card without creating another container.

The board and lunch-link management currently have no sign-in requirement: anyone who can access the app can create, edit, or delete their content. Keep the app behind your company access controls; do not expose these write endpoints publicly.

## Kalender (Azure Cosmos DB for NoSQL)

The shared calendar stores events in its own container. In the `greencon-start` database, create a container named `greencon-events` with partition key `/eventId`, then set `COSMOS_EVENTS_CONTAINER=greencon-events` in `.env.local` and restart the app. The calendar shows up to seven future events in Sweden local time; new databases start empty and do not import the former sample events.

Anyone with access to the internal app can add, edit, or delete events. Keep the app behind company access controls; the calendar API is not intended for public exposure.

The alert banner uses the same `greencon-events` container and `/eventId` partition key. Alerts are stored as documents with `kind: "alert"`, shown prominently while active, and remain until someone removes them in **Hantera**.

The suggested container names are general-purpose, but the content and event containers have separate configured throughput. If you created a container using an earlier name, create the correctly named container before updating the app configuration; containers cannot be renamed in Cosmos DB.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
