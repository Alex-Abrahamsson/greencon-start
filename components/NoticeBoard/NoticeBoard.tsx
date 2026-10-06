"use client";

import { useEffect, useState } from "react";
import {
    NoticeBoardSuggestion,
    PostitColor,
} from "@/types/noticeBoard";
import styles from "./NoticeBoard.module.scss";

const COLORS: { value: PostitColor; label: string }[] = [
    { value: "yellow", label: "Gul" },
    { value: "green", label: "Grön" },
    { value: "blue", label: "Blå" },
    { value: "pink", label: "Rosa" },
    { value: "orange", label: "Orange" },
    { value: "purple", label: "Lila" },
];

const VOTER_STORAGE_KEY = "greencon_startpage_feedback_voter";

function getOrCreateVoterId() {
    const storedId = localStorage.getItem(VOTER_STORAGE_KEY);
    if (storedId) return storedId;

    const voterId = crypto.randomUUID();
    localStorage.setItem(VOTER_STORAGE_KEY, voterId);
    return voterId;
}

function isNoticeBoardSuggestion(value: unknown): value is NoticeBoardSuggestion {
    if (typeof value !== "object" || value === null) return false;
    const suggestion = value as Record<string, unknown>;
    return (
        typeof suggestion.id === "string" &&
        typeof suggestion.title === "string" &&
        typeof suggestion.description === "string" &&
        typeof suggestion.author === "string" &&
        typeof suggestion.createdAt === "string" &&
        typeof suggestion.likes === "number" &&
        Number.isInteger(suggestion.likes) &&
        suggestion.likes >= 0 &&
        typeof suggestion.isLiked === "boolean" &&
        typeof suggestion.color === "string" &&
        COLORS.some((color) => color.value === suggestion.color)
    );
}

async function ensureSuccessfulResponse(response: Response) {
    if (response.ok) return;

    let errorCode = "";
    try {
        const body: unknown = await response.json();
        if (
            typeof body === "object" &&
            body !== null &&
            "error" in body &&
            typeof body.error === "string"
        ) {
            errorCode = body.error;
        }
    } catch {
        errorCode = "";
    }

    if (errorCode === "database-not-configured") {
        throw new Error("Cosmos DB är inte konfigurerat för anslagstavlan.");
    }
    if (errorCode === "not-found") {
        throw new Error("Lappen finns inte längre på anslagstavlan.");
    }
    if (errorCode === "invalid-request") {
        throw new Error("Begäran kunde inte godkännas. Kontrollera uppgifterna.");
    }
    throw new Error("Kunde inte spara eller hämta data från Cosmos DB.");
}

async function fetchSuggestions(voterId: string) {
    const response = await fetch(
        `/api/notice-board?voterId=${encodeURIComponent(voterId)}`,
        { cache: "no-store" },
    );
    await ensureSuccessfulResponse(response);

    const body: unknown = await response.json();
    if (
        typeof body !== "object" ||
        body === null ||
        !("suggestions" in body) ||
        !Array.isArray(body.suggestions) ||
        !body.suggestions.every(isNoticeBoardSuggestion)
    ) {
        throw new Error("Cosmos DB returnerade ett oväntat svar.");
    }

    return body.suggestions;
}

export function NoticeBoard() {
    const [suggestions, setSuggestions] = useState<NoticeBoardSuggestion[]>([]);
    const [voterId, setVoterId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBoardAvailable, setIsBoardAvailable] = useState(false);
    const [isMutating, setIsMutating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        const loadBoard = async () => {
            try {
                const id = getOrCreateVoterId();
                if (active) setVoterId(id);
                const items = await fetchSuggestions(id);
                if (!active) return;
                setSuggestions(items);
                setIsBoardAvailable(true);
            } catch (loadError) {
                if (active) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : "Kunde inte hämta data från Cosmos DB.",
                    );
                }
            } finally {
                if (active) setIsLoading(false);
            }
        };

        void loadBoard();
        return () => {
            active = false;
        };
    }, []);

    // Close modals on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setSelectedSuggestionId(null);
                setIsModalOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [author, setAuthor] = useState("");
    const [color, setColor] = useState<PostitColor>("yellow");

    const refreshBoard = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const id = voterId ?? getOrCreateVoterId();
            if (!voterId) setVoterId(id);
            setSuggestions(await fetchSuggestions(id));
            setIsBoardAvailable(true);
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : "Kunde inte hämta data från Cosmos DB.",
            );
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!voterId) return;

        const refreshTimer = window.setInterval(() => {
            if (document.visibilityState !== "visible") return;
            void fetchSuggestions(voterId)
                .then((items) => {
                    setSuggestions(items);
                    setIsBoardAvailable(true);
                    setError(null);
                })
                .catch((loadError: unknown) => {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : "Kunde inte hämta data från Cosmos DB.",
                    );
                });
        }, 60 * 1000);

        return () => window.clearInterval(refreshTimer);
    }, [voterId]);

    const runMutation = async (request: () => Promise<Response>) => {
        if (!voterId) return false;
        setIsMutating(true);
        setError(null);
        try {
            const response = await request();
            await ensureSuccessfulResponse(response);
            setSuggestions(await fetchSuggestions(voterId));
            setIsBoardAvailable(true);
            return true;
        } catch (mutationError) {
            setError(
                mutationError instanceof Error
                    ? mutationError.message
                    : "Ändringen kunde inte sparas i Cosmos DB.",
            );
            return false;
        } finally {
            setIsMutating(false);
        }
    };

    const handleLike = async (id: string, isLiked: boolean) => {
        await runMutation(() =>
            fetch(`/api/notice-board/${encodeURIComponent(id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ voterId, isLiked }),
            }),
        );
    };

    const handleDelete = async (id: string) => {
        return runMutation(() =>
            fetch(`/api/notice-board/${encodeURIComponent(id)}`, {
                method: "DELETE",
            }),
        );
    };

    const handleCreateSuggestion = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!title.trim() || !description.trim() || !voterId) return;

        const created = await runMutation(() =>
            fetch("/api/notice-board", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    description,
                    author,
                    color,
                }),
            }),
        );
        if (!created) return;

        setTitle("");
        setDescription("");
        setAuthor("");
        setColor("yellow");
        setIsModalOpen(false);
    };

    const selectedSuggestion = selectedSuggestionId
        ? suggestions.find((s) => s.id === selectedSuggestionId) || null
        : null;
    const rankedSuggestions = [...suggestions].sort(
        (left, right) => right.likes - left.likes,
    );

    return (
        <section className={styles.noticeBoardSection} aria-label="Anslagstavlan">
            <div className={styles.board}>
                <div className={styles.boardTopBar}>
                    <div className={styles.boardHeading}>
                        <div className={styles.boardHeadingPin} aria-hidden="true" />
                        <h2 className={styles.boardTitle}>Anslagstavlan</h2>
                    </div>
                    <button
                        type="button"
                        className={styles.addNoteButton}
                        onClick={() => setIsModalOpen(true)}
                        disabled={isLoading || !isBoardAvailable || isMutating}
                        aria-label="Skapa ny lapp"
                    >
                        <span className={styles.addNoteIcon} aria-hidden="true">+</span>
                        <span>Ny lapp</span>
                    </button>
                </div>

                {error && (
                    <div className={styles.boardError} role="alert">
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={() => void refreshBoard()}
                            disabled={isLoading}
                        >
                            Försök igen
                        </button>
                    </div>
                )}

                {isLoading ? (
                    <div className={styles.emptyState}>
                        <p>Hämtar lappar från Cosmos DB…</p>
                    </div>
                ) : error && suggestions.length === 0 ? null : suggestions.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p className={styles.emptyStateTitle}>Inga lappar här ännu</p>
                        <p>Var först med att sätta upp ett förslag till startsidan!</p>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {rankedSuggestions.map((sug) => {
                            const colorClass = styles[`postit_${sug.color}`] || styles.postit_yellow;

                            return (
                                <article
                                    key={sug.id}
                                    className={`${styles.postit} ${colorClass}`}
                                    onClick={() => setSelectedSuggestionId(sug.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setSelectedSuggestionId(sug.id);
                                        }
                                    }}
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`${sug.title}. Klicka för att förstora.`}
                                >
                                    <div className={styles.pin} aria-hidden="true" />
                                    <div className={styles.postitBody}>
                                        <div className={styles.postitTop}>
                                            <button
                                                type="button"
                                                className={styles.deleteButton}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    void handleDelete(sug.id);
                                                }}
                                                disabled={isMutating}
                                                title="Ta bort lapp"
                                                aria-label="Ta bort förslag"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <h3 className={styles.postitTitle}>{sug.title}</h3>
                                        <p className={styles.postitContent}>{sug.description}</p>
                                    </div>

                                    <div className={styles.postitFooter}>
                                        <span className={styles.author}>{sug.author}</span>
                                        <button
                                            type="button"
                                            className={`${styles.likeButton} ${sug.isLiked ? styles.liked : ""}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                void handleLike(sug.id, !sug.isLiked);
                                            }}
                                            disabled={isMutating}
                                            aria-label={`${sug.likes} personer gillar detta förslag`}
                                        >
                                            <span>👍</span>
                                            <span>{sug.likes}</span>
                                        </button>
                                    </div>
                                    <span className={styles.zoomHint}>Klicka för att läsa</span>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedSuggestion && (
                <div
                    className={styles.zoomBackdrop}
                    onClick={() => setSelectedSuggestionId(null)}
                    role="presentation"
                >
                    <div
                        className={`${styles.zoomCard} ${
                            styles[`postit_${selectedSuggestion.color}`] || styles.postit_yellow
                        }`}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="zoom-card-title"
                    >
                        <div className={styles.largePin} aria-hidden="true" />
                        <div className={styles.zoomCardHeader}>
                            <div className={styles.zoomHeaderActions}>
                                <button
                                    type="button"
                                    className={styles.deleteButton}
                                    onClick={() => {
                                        void handleDelete(selectedSuggestion.id).then((deleted) => {
                                            if (deleted) setSelectedSuggestionId(null);
                                        });
                                    }}
                                    disabled={isMutating}
                                    title="Ta bort lapp"
                                    aria-label="Ta bort förslag"
                                >
                                    ✕
                                </button>
                                <button
                                    type="button"
                                    className={styles.closeZoomButton}
                                    onClick={() => setSelectedSuggestionId(null)}
                                    aria-label="Stäng förstorad vy"
                                >
                                    Stäng ✕
                                </button>
                            </div>
                        </div>

                        <h3 id="zoom-card-title" className={styles.zoomCardTitle}>
                            {selectedSuggestion.title}
                        </h3>

                        <div className={styles.zoomCardBody}>
                            <p className={styles.zoomCardDescription}>{selectedSuggestion.description}</p>
                        </div>

                        <div className={styles.zoomCardFooter}>
                            <div className={styles.zoomMeta}>
                                <span className={styles.zoomAuthor}>{selectedSuggestion.author}</span>
                                <span className={styles.zoomDate}>{selectedSuggestion.createdAt}</span>
                            </div>
                            <button
                                type="button"
                                className={`${styles.likeButton} ${styles.zoomLikeButton} ${
                                    selectedSuggestion.isLiked ? styles.liked : ""
                                }`}
                                onClick={() =>
                                    void handleLike(
                                        selectedSuggestion.id,
                                        !selectedSuggestion.isLiked,
                                    )
                                }
                                disabled={isMutating}
                                aria-label={`${selectedSuggestion.likes} personer gillar detta förslag`}
                            >
                                <span>👍 Gilla idé</span>
                                <span className={styles.likeCountBadge}>{selectedSuggestion.likes}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div
                    className={styles.modalBackdrop}
                    onClick={() => setIsModalOpen(false)}
                    role="presentation"
                >
                    <div
                        className={styles.modal}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                    >
                        <div className={styles.modalHeader}>
                            <h3 id="modal-title">Förslag till startsidan</h3>
                            <button
                                type="button"
                                className={styles.closeButton}
                                onClick={() => setIsModalOpen(false)}
                                aria-label="Stäng formulär"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateSuggestion} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label htmlFor="sug-title">Rubrik / Funktion *</label>
                                <input
                                    id="sug-title"
                                    type="text"
                                    required
                                    maxLength={120}
                                    placeholder="T.ex. Dagens lunch från favoritrestauranger"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="sug-desc">Beskrivning av idén *</label>
                                <textarea
                                    id="sug-desc"
                                    required
                                    maxLength={2000}
                                    placeholder="Beskriv vad du vill se på denna startsida och hur det hjälper oss..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="sug-author">Ditt namn / Signatur</label>
                                <input
                                    id="sug-author"
                                    type="text"
                                    maxLength={80}
                                    placeholder="Lämna tomt för anonymt"
                                    value={author}
                                    onChange={(e) => setAuthor(e.target.value)}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Välj färg på Post-it</label>
                                <div className={styles.colorPicker} role="radiogroup" aria-label="Färg på Post-it">
                                    {COLORS.map((c) => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            title={c.label}
                                            aria-label={`Välj färg ${c.label}`}
                                            aria-pressed={color === c.value}
                                            className={`${styles.colorOption} ${styles[`colorOpt_${c.value}`]} ${
                                                color === c.value ? styles.selectedColor : ""
                                            }`}
                                            onClick={() => setColor(c.value)}
                                        >
                                            {color === c.value && <span className={styles.checkmark}>✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.modalFooter}>
                                <button
                                    type="button"
                                    className={styles.cancelButton}
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Avbryt
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitButton}
                                    disabled={isMutating}
                                >
                                    {isMutating ? "Sparar…" : "Sätt upp lapp"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
