"use client";

import { useEffect, useState } from "react";
import styles from "./MySupportIssuesCard.module.scss";

type SupportIssueState =
    | { status: "loading" }
    | { status: "connected"; count: number }
    | { status: "disconnected" }
    | { status: "not-configured" }
    | { status: "unavailable" };

const supportQueueUrl =
    "https://greencon.atlassian.net/jira/servicedesk/projects/TICKET/queues/custom/17";

export function MySupportIssuesCard() {
    const [state, setState] = useState<SupportIssueState>({ status: "loading" });

    useEffect(() => {
        let active = true;

        const loadCount = async () => {
            try {
                const response = await fetch("/api/atlassian/my-support-issues", {
                    cache: "no-store",
                });
                const result: unknown = await response.json();
                if (
                    !active ||
                    typeof result !== "object" ||
                    result === null ||
                    !("status" in result)
                ) {
                    return;
                }

                if (
                    result.status === "connected" &&
                    "count" in result &&
                    typeof result.count === "number" &&
                    Number.isInteger(result.count) &&
                    result.count >= 0
                ) {
                    setState({ status: "connected", count: result.count });
                } else if (result.status === "disconnected") {
                    setState({ status: "disconnected" });
                } else if (result.status === "not-configured") {
                    setState({ status: "not-configured" });
                } else {
                    setState({ status: "unavailable" });
                }
            } catch {
                if (active) {
                    setState({ status: "unavailable" });
                }
            }
        };

        void loadCount();
        const refreshTimer = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                void loadCount();
            }
        }, 5 * 60 * 1000);

        return () => {
            active = false;
            window.clearInterval(refreshTimer);
        };
    }, []);

    const connected = state.status === "connected";
    const canConnect = state.status === "disconnected";
    const destination = connected ? supportQueueUrl : "/api/atlassian/connect";
    const detail = (() => {
        switch (state.status) {
            case "loading":
                return "Hämtar från Jira…";
            case "connected":
                return "Öppna ärenden tilldelade dig";
            case "disconnected":
                return "Anslut ditt Jira-konto";
            case "not-configured":
                return "Jira-inloggning behöver konfigureras";
            case "unavailable":
                return "Kunde inte hämta från Jira";
        }
    })();

    const content = (
        <>
            <span className={styles.copy}>
                <span className={styles.title}>Mina supportärenden</span>
                <span className={styles.detail}>{detail}</span>
            </span>
            <span
                className={`${styles.count} ${connected && state.count > 0 ? styles.hasIssues : ""}`}
                aria-hidden="true"
            >
                {connected
                    ? state.count
                    : state.status === "loading"
                      ? "…"
                      : canConnect
                        ? "↗"
                        : "!"}
            </span>
        </>
    );

    if (connected || canConnect) {
        return (
            <a
                className={styles.card}
                href={destination}
                aria-label={
                    connected
                        ? `Mina supportärenden: ${state.count} öppna ärenden. Öppna Jira-kön.`
                        : `Mina supportärenden. ${detail}.`
                }
            >
                {content}
            </a>
        );
    }

    return <div className={`${styles.card} ${styles.inactive}`}>{content}</div>;
}
