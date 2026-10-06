import { NextRequest, NextResponse } from "next/server";
import {
    ATLASSIAN_SESSION_COOKIE,
    AtlassianRequestError,
    decryptAtlassianSession,
    encryptAtlassianSession,
    getAtlassianOAuthConfig,
    getCookieValue,
    getMyOpenSupportIssueCount,
    refreshAtlassianSession,
    atlassianSessionMaxAge,
} from "@/lib/atlassian-oauth";

export const dynamic = "force-dynamic";

function jsonResponse(body: object, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: { "Cache-Control": "no-store" },
    });
}

export async function GET(request: NextRequest) {
    try {
        const config = getAtlassianOAuthConfig();
        if (!config) {
            return jsonResponse({ status: "not-configured" });
        }

        const encryptedSession = getCookieValue(request, ATLASSIAN_SESSION_COOKIE);
        if (!encryptedSession) {
            return jsonResponse({ status: "disconnected" });
        }

        let session = decryptAtlassianSession(
            encryptedSession,
            config.sessionSecret,
        );
        if (!session) {
            const response = jsonResponse({ status: "disconnected" });
            response.cookies.set(ATLASSIAN_SESSION_COOKIE, "", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/api/atlassian",
                maxAge: 0,
            });
            return response;
        }

        let refreshed = false;
        if (session.expiresAt <= Date.now() + 60_000) {
            session = await refreshAtlassianSession(config, session);
            refreshed = true;
        }

        const count = await getMyOpenSupportIssueCount(session);
        const response = jsonResponse({ status: "connected", count });
        if (refreshed) {
            const encryptedRefreshedSession = encryptAtlassianSession(
                session,
                config.sessionSecret,
            );
            response.cookies.set(
                ATLASSIAN_SESSION_COOKIE,
                encryptedRefreshedSession,
                {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    path: "/api/atlassian",
                    maxAge: atlassianSessionMaxAge,
                },
            );
        }
        return response;
    } catch (error) {
        if (error instanceof AtlassianRequestError && error.status === 401) {
            const response = jsonResponse({ status: "disconnected" });
            response.cookies.set(ATLASSIAN_SESSION_COOKIE, "", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/api/atlassian",
                maxAge: 0,
            });
            return response;
        }

        console.error("Unable to load the current user's Jira support issue count.", error);
        return jsonResponse({ status: "unavailable" }, 502);
    }
}
