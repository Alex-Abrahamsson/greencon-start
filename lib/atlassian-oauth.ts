import "server-only";

import {
    createCipheriv,
    createDecipheriv,
    createHash,
    randomBytes,
    timingSafeEqual,
} from "node:crypto";

export const ATLASSIAN_SESSION_COOKIE = "greencon_atlassian_session";
export const ATLASSIAN_STATE_COOKIE = "greencon_atlassian_state";
export const ATLASSIAN_VERIFIER_COOKIE = "greencon_atlassian_verifier";

const ATLASSIAN_AUTHORIZE_URL = "https://auth.atlassian.com/authorize";
const ATLASSIAN_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const ATLASSIAN_RESOURCES_URL =
    "https://api.atlassian.com/oauth/token/accessible-resources";
const ATLASSIAN_SITE = "greencon.atlassian.net";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export type AtlassianOAuthConfig = {
    appUrl: URL;
    clientId: string;
    clientSecret: string;
    sessionSecret: string;
};

export type AtlassianSession = {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    cloudId: string;
};

type OAuthTokenResponse = {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
};

type AccessibleResource = {
    id?: unknown;
    url?: unknown;
};

export class AtlassianRequestError extends Error {
    constructor(message: string, readonly status?: number) {
        super(message);
        this.name = "AtlassianRequestError";
    }
}

export function getAtlassianOAuthConfig(): AtlassianOAuthConfig | null {
    const appUrl = process.env.APP_URL;
    const clientId = process.env.ATLASSIAN_CLIENT_ID;
    const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET;
    const sessionSecret = process.env.ATLASSIAN_SESSION_SECRET;

    if (!appUrl || !clientId || !clientSecret || !sessionSecret) {
        return null;
    }

    if (sessionSecret.length < 32) {
        throw new Error("ATLASSIAN_SESSION_SECRET must be at least 32 characters.");
    }

    const parsedAppUrl = new URL(appUrl);
    if (
        parsedAppUrl.protocol !== "https:" &&
        parsedAppUrl.hostname !== "localhost" &&
        parsedAppUrl.hostname !== "127.0.0.1"
    ) {
        throw new Error("APP_URL must use HTTPS outside local development.");
    }

    return {
        appUrl: parsedAppUrl,
        clientId,
        clientSecret,
        sessionSecret,
    };
}

export function getAtlassianCallbackUrl(config: AtlassianOAuthConfig) {
    return new URL("/api/atlassian/callback", config.appUrl).toString();
}

export function createOAuthAuthorizationUrl(
    config: AtlassianOAuthConfig,
    state: string,
    codeChallenge: string,
) {
    const authorizeUrl = new URL(ATLASSIAN_AUTHORIZE_URL);
    authorizeUrl.searchParams.set("audience", "api.atlassian.com");
    authorizeUrl.searchParams.set("client_id", config.clientId);
    authorizeUrl.searchParams.set(
        "scope",
        "read:jira-work read:jira-user offline_access",
    );
    authorizeUrl.searchParams.set("redirect_uri", getAtlassianCallbackUrl(config));
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("prompt", "consent");
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
    return authorizeUrl;
}

export function createOAuthState() {
    return randomBytes(32).toString("base64url");
}

export function createPkceVerifier() {
    return randomBytes(32).toString("base64url");
}

export function createPkceChallenge(verifier: string) {
    return createHash("sha256").update(verifier).digest("base64url");
}

export function safeStringEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return (
        leftBuffer.length === rightBuffer.length &&
        timingSafeEqual(leftBuffer, rightBuffer)
    );
}

export function getCookieValue(request: Request, cookieName: string) {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) {
        return null;
    }

    const cookie = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${cookieName}=`));

    return cookie ? cookie.slice(cookieName.length + 1) : null;
}

function getEncryptionKey(sessionSecret: string) {
    return createHash("sha256").update(sessionSecret).digest();
}

export function encryptAtlassianSession(
    session: AtlassianSession,
    sessionSecret: string,
) {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
        "aes-256-gcm",
        getEncryptionKey(sessionSecret),
        iv,
    );
    const ciphertext = Buffer.concat([
        cipher.update(JSON.stringify(session), "utf8"),
        cipher.final(),
    ]);
    const encrypted = [
        "v1",
        iv.toString("base64url"),
        cipher.getAuthTag().toString("base64url"),
        ciphertext.toString("base64url"),
    ].join(".");

    if (encrypted.length > 3800) {
        throw new Error("Encrypted Atlassian session exceeds the cookie size limit.");
    }

    return encrypted;
}

export function decryptAtlassianSession(
    encrypted: string,
    sessionSecret: string,
): AtlassianSession | null {
    try {
        const [version, encodedIv, encodedTag, encodedCiphertext] =
            encrypted.split(".");
        if (version !== "v1" || !encodedIv || !encodedTag || !encodedCiphertext) {
            return null;
        }

        const decipher = createDecipheriv(
            "aes-256-gcm",
            getEncryptionKey(sessionSecret),
            Buffer.from(encodedIv, "base64url"),
        );
        decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
        const plaintext = Buffer.concat([
            decipher.update(Buffer.from(encodedCiphertext, "base64url")),
            decipher.final(),
        ]).toString("utf8");
        const session: unknown = JSON.parse(plaintext);

        if (
            typeof session !== "object" ||
            session === null ||
            !("accessToken" in session) ||
            typeof session.accessToken !== "string" ||
            !("refreshToken" in session) ||
            typeof session.refreshToken !== "string" ||
            !("expiresAt" in session) ||
            typeof session.expiresAt !== "number" ||
            !("cloudId" in session) ||
            typeof session.cloudId !== "string" ||
            !/^[0-9a-f-]{36}$/i.test(session.cloudId)
        ) {
            return null;
        }

        return {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            expiresAt: session.expiresAt,
            cloudId: session.cloudId,
        };
    } catch {
        return null;
    }
}

async function requestOAuthToken(
    config: AtlassianOAuthConfig,
    payload: Record<string, string>,
): Promise<OAuthTokenResponse> {
    const response = await fetch(ATLASSIAN_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            ...payload,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
        throw new AtlassianRequestError("Atlassian OAuth token request failed.", response.status);
    }

    return (await response.json()) as OAuthTokenResponse;
}

function createSession(
    token: OAuthTokenResponse,
    cloudId: string,
    existingRefreshToken?: string,
): AtlassianSession {
    const accessToken = token.access_token;
    const refreshToken = token.refresh_token ?? existingRefreshToken;
    const expiresIn = token.expires_in;

    if (
        typeof accessToken !== "string" ||
        typeof refreshToken !== "string" ||
        typeof expiresIn !== "number" ||
        !Number.isFinite(expiresIn)
    ) {
        throw new AtlassianRequestError("Atlassian returned an invalid OAuth token.");
    }

    return {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + expiresIn * 1000,
        cloudId,
    };
}

export async function exchangeAuthorizationCode(
    config: AtlassianOAuthConfig,
    code: string,
    verifier: string,
) {
    const token = await requestOAuthToken(config, {
        grant_type: "authorization_code",
        code,
        redirect_uri: getAtlassianCallbackUrl(config),
        code_verifier: verifier,
    });

    if (typeof token.refresh_token !== "string") {
        throw new AtlassianRequestError(
            "Atlassian did not return a refresh token. Check offline_access scope.",
        );
    }

    const accessToken = token.access_token;
    if (typeof accessToken !== "string") {
        throw new AtlassianRequestError("Atlassian returned an invalid access token.");
    }

    const resourcesResponse = await fetch(ATLASSIAN_RESOURCES_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
    });

    if (!resourcesResponse.ok) {
        throw new AtlassianRequestError(
            "Atlassian accessible-resources request failed.",
            resourcesResponse.status,
        );
    }

    const resources: unknown = await resourcesResponse.json();
    if (!Array.isArray(resources)) {
        throw new AtlassianRequestError("Atlassian returned an invalid site list.");
    }

    const site = (resources as AccessibleResource[]).find((resource) => {
        if (typeof resource.url !== "string") {
            return false;
        }
        try {
            return new URL(resource.url).hostname === ATLASSIAN_SITE;
        } catch {
            return false;
        }
    });

    if (typeof site?.id !== "string" || !/^[0-9a-f-]{36}$/i.test(site.id)) {
        throw new AtlassianRequestError(
            "The Atlassian account has no access to the Greencon Jira site.",
        );
    }

    return createSession(token, site.id);
}

export async function refreshAtlassianSession(
    config: AtlassianOAuthConfig,
    session: AtlassianSession,
) {
    const token = await requestOAuthToken(config, {
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
    });

    return createSession(token, session.cloudId, session.refreshToken);
}

export async function getMyOpenSupportIssueCount(session: AtlassianSession) {
    const jql =
        "project = TICKET AND assignee = currentUser() AND resolution IS EMPTY";
    const url = new URL(
        `/ex/jira/${encodeURIComponent(session.cloudId)}/rest/api/3/search/jql`,
        "https://api.atlassian.com",
    );
    url.searchParams.set("jql", jql);
    url.searchParams.set("maxResults", "1");
    url.searchParams.set("fields", "key");

    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
        throw new AtlassianRequestError("Jira issue search failed.", response.status);
    }

    const result: unknown = await response.json();
    if (
        typeof result !== "object" ||
        result === null ||
        !("total" in result) ||
        typeof result.total !== "number" ||
        !Number.isInteger(result.total) ||
        result.total < 0
    ) {
        throw new AtlassianRequestError("Jira returned an invalid issue count.");
    }

    return result.total;
}

export const atlassianSessionMaxAge = SESSION_COOKIE_MAX_AGE;
