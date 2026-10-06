import { NextRequest, NextResponse } from "next/server";
import {
    ATLASSIAN_SESSION_COOKIE,
    ATLASSIAN_STATE_COOKIE,
    ATLASSIAN_VERIFIER_COOKIE,
    atlassianSessionMaxAge,
    encryptAtlassianSession,
    exchangeAuthorizationCode,
    getAtlassianOAuthConfig,
    getCookieValue,
    safeStringEqual,
} from "@/lib/atlassian-oauth";

export const dynamic = "force-dynamic";

function clearOAuthCookies(response: NextResponse) {
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/api/atlassian/callback",
        maxAge: 0,
    };
    response.cookies.set(ATLASSIAN_STATE_COOKIE, "", options);
    response.cookies.set(ATLASSIAN_VERIFIER_COOKIE, "", options);
}

export async function GET(request: NextRequest) {
    const config = getAtlassianOAuthConfig();
    if (!config) {
        return NextResponse.json(
            { status: "not-configured" },
            { status: 503, headers: { "Cache-Control": "no-store" } },
        );
    }

    const responseError = request.nextUrl.searchParams.get("error");
    if (responseError) {
        const response = NextResponse.redirect(new URL("/?jira=denied", config.appUrl));
        clearOAuthCookies(response);
        response.headers.set("Cache-Control", "no-store");
        return response;
    }

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const savedState = getCookieValue(request, ATLASSIAN_STATE_COOKIE);
    const verifier = getCookieValue(request, ATLASSIAN_VERIFIER_COOKIE);

    if (
        !code ||
        !state ||
        !savedState ||
        !verifier ||
        !safeStringEqual(state, savedState)
    ) {
        const response = NextResponse.redirect(new URL("/?jira=invalid-state", config.appUrl));
        clearOAuthCookies(response);
        response.headers.set("Cache-Control", "no-store");
        return response;
    }

    try {
        const session = await exchangeAuthorizationCode(config, code, verifier);
        const encryptedSession = encryptAtlassianSession(
            session,
            config.sessionSecret,
        );
        const response = NextResponse.redirect(new URL("/", config.appUrl));
        clearOAuthCookies(response);
        response.headers.set("Cache-Control", "no-store");
        response.cookies.set(ATLASSIAN_SESSION_COOKIE, encryptedSession, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/api/atlassian",
            maxAge: atlassianSessionMaxAge,
        });
        response.headers.set("Cache-Control", "no-store");
        return response;
    } catch (error) {
        console.error("Atlassian OAuth callback failed.", error);
        const response = NextResponse.redirect(new URL("/?jira=connect-error", config.appUrl));
        clearOAuthCookies(response);
        response.headers.set("Cache-Control", "no-store");
        return response;
    }
}
