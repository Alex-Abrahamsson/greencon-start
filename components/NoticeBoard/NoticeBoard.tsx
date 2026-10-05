"use client";

import { useSyncExternalStore, useState, useEffect } from "react";
import { initialSuggestions } from "@/data/improvementSuggestions";
import {
    ImprovementSuggestion,
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

const STORAGE_KEY = "greencon_startpage_feedback";
const LIKES_KEY = "greencon_startpage_feedback_likes";

const EMPTY_LIKES: string[] = [];

let suggestionsListeners: (() => void)[] = [];
let likesListeners: (() => void)[] = [];

function getServerSuggestions() {
    return initialSuggestions;
}

function getServerLikes() {
    return EMPTY_LIKES;
}

function subscribeSuggestions(listener: () => void) {
    suggestionsListeners.push(listener);
    return () => {
        suggestionsListeners = suggestionsListeners.filter((l) => l !== listener);
    };
}

let cachedSuggestionsSnapshot: ImprovementSuggestion[] = initialSuggestions;
let cachedSuggestionsRaw: string | null = null;

function getCachedSuggestions(): ImprovementSuggestion[] {
    if (typeof window === "undefined") return initialSuggestions;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw !== cachedSuggestionsRaw) {
            cachedSuggestionsRaw = raw;
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    cachedSuggestionsSnapshot = parsed;
                } else {
                    cachedSuggestionsSnapshot = initialSuggestions;
                }
            } else {
                cachedSuggestionsSnapshot = initialSuggestions;
            }
        }
    } catch {
        cachedSuggestionsSnapshot = initialSuggestions;
    }
    return cachedSuggestionsSnapshot;
}

function subscribeLikes(listener: () => void) {
    likesListeners.push(listener);
    return () => {
        likesListeners = likesListeners.filter((l) => l !== listener);
    };
}

let cachedLikesSnapshot: string[] = EMPTY_LIKES;
let cachedLikesRaw: string | null = null;

function getCachedLikes(): string[] {
    if (typeof window === "undefined") return EMPTY_LIKES;
    try {
        const raw = localStorage.getItem(LIKES_KEY);
        if (raw !== cachedLikesRaw) {
            cachedLikesRaw = raw;
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    cachedLikesSnapshot = parsed;
                } else {
                    cachedLikesSnapshot = EMPTY_LIKES;
                }
            } else {
                cachedLikesSnapshot = EMPTY_LIKES;
            }
        }
    } catch {
        cachedLikesSnapshot = EMPTY_LIKES;
    }
    return cachedLikesSnapshot;
}

function setStoredSuggestions(updated: ImprovementSuggestion[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
        // Ignore storage errors
    }
    suggestionsListeners.forEach((l) => l());
}

function setStoredLikes(updated: string[]) {
    try {
        localStorage.setItem(LIKES_KEY, JSON.stringify(updated));
    } catch {
        // Ignore storage errors
    }
    likesListeners.forEach((l) => l());
}

export function NoticeBoard() {
    const suggestions = useSyncExternalStore(
        subscribeSuggestions,
        getCachedSuggestions,
        getServerSuggestions
    );

    const likedIds = useSyncExternalStore(
        subscribeLikes,
        getCachedLikes,
        getServerLikes
    );

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);

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

    const handleLike = (id: string) => {
        const isLiked = likedIds.includes(id);
        const updatedLikes = isLiked
            ? likedIds.filter((item) => item !== id)
            : [...likedIds, id];

        setStoredLikes(updatedLikes);

        const updatedSuggestions = suggestions.map((sug) => {
            if (sug.id === id) {
                return {
                    ...sug,
                    likes: isLiked ? Math.max(0, sug.likes - 1) : sug.likes + 1,
                };
            }
            return sug;
        });

        setStoredSuggestions(updatedSuggestions);
    };

    const handleDelete = (id: string) => {
        const updated = suggestions.filter((sug) => sug.id !== id);
        setStoredSuggestions(updated);
    };

    const handleCreateSuggestion = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;

        const newSug: ImprovementSuggestion = {
            id: `sug-${Date.now()}`,
            title: title.trim(),
            description: description.trim(),
            author: author.trim() || "Anonym kollega",
            createdAt: new Date().toISOString().split("T")[0],
            likes: 0,
            color,
        };

        const updated = [newSug, ...suggestions];
        setStoredSuggestions(updated);

        // Reset form
        setTitle("");
        setDescription("");
        setAuthor("");
        setColor("yellow");
        setIsModalOpen(false);
    };

    const selectedSuggestion = selectedSuggestionId
        ? suggestions.find((s) => s.id === selectedSuggestionId) || null
        : null;

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
                        aria-label="Skapa ny lapp"
                    >
                        <span className={styles.addNoteIcon} aria-hidden="true">+</span>
                        <span>Ny lapp</span>
                    </button>
                </div>

                {suggestions.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p className={styles.emptyStateTitle}>Inga lappar här ännu</p>
                        <p>Var först med att sätta upp ett förslag till startsidan!</p>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {suggestions.map((sug) => {
                            const isLiked = likedIds.includes(sug.id);
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
                                                    handleDelete(sug.id);
                                                }}
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
                                            className={`${styles.likeButton} ${isLiked ? styles.liked : ""}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleLike(sug.id);
                                            }}
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
                                        handleDelete(selectedSuggestion.id);
                                        setSelectedSuggestionId(null);
                                    }}
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
                                    likedIds.includes(selectedSuggestion.id) ? styles.liked : ""
                                }`}
                                onClick={() => handleLike(selectedSuggestion.id)}
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
                                <button type="submit" className={styles.submitButton}>
                                    Sätt upp lapp
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
