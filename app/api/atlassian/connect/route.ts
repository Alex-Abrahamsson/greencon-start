import { NextResponse } from "next/server";
import {
    ATLASSIAN_STATE_COOKIE,
    ATLASSIAN_VERIFIER_COOKIE,
    createOAuthAuthorizationUrl,
    createOAuthState,
    createPkceChallenge,
    createPkceVerifier,
    getAtlassianOAuthConfig,
} from "@/lib/atlassian-oauth";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const config = getAtlassianOAuthConfig();
        if (!config) {
            return NextResponse.json(
                { status: "not-configured" },
                { status: 503, headers: { "Cache-Control": "no-store" } },
            );
        }

        const state = createOAuthState();
        const verifier = createPkceVerifier();
        const response = NextResponse.redirect(
            createOAuthAuthorizationUrl(config, state, createPkceChallenge(verifier)),
        );
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
            path: "/api/atlassian/callback",
            maxAge: 600,
        };

        response.cookies.set(ATLASSIAN_STATE_COOKIE, state, cookieOptions);
        response.cookies.set(ATLASSIAN_VERIFIER_COOKIE, verifier, cookieOptions);
        response.headers.set("Cache-Control", "no-store");
        return response;
    } catch (error) {
        console.error("Unable to start Atlassian OAuth flow.", error);
        return NextResponse.json(
            { status: "unavailable" },
            { status: 500, headers: { "Cache-Control": "no-store" } },
        );
    }
}
