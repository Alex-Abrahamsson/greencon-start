"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { WeeklyLetter as WeeklyLetterType } from "@/types/weeklyLetter";
import styles from "./WeeklyLetter.module.scss";

interface WeeklyLetterProps {
  letters: WeeklyLetterType[];
}

const STORAGE_KEY = "greencon_read_weekly_letters";
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((callback) => callback());
}

function subscribeReadLetters(callback: () => void) {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

let cachedReadLetters: string[] = [];
let lastReadLettersString = "";

function getReadLettersSnapshot(): string[] {
  if (typeof window === "undefined") return EMPTY_READ;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return EMPTY_READ;
    if (raw !== lastReadLettersString) {
      lastReadLettersString = raw;
      cachedReadLetters = JSON.parse(raw);
    }
    return cachedReadLetters;
  } catch {
    return EMPTY_READ;
  }
}

const EMPTY_READ: string[] = [];
function getServerReadSnapshot(): string[] {
  return EMPTY_READ;
}

export function WeeklyLetter({ letters }: WeeklyLetterProps) {
  const [selectedId, setSelectedId] = useState<string>(letters[0]?.id || "");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const readLetters = useSyncExternalStore(
    subscribeReadLetters,
    getReadLettersSnapshot,
    getServerReadSnapshot
  );

  const currentLetter = letters.find((l) => l.id === selectedId) || letters[0];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  if (!currentLetter) {
    return null;
  }

  const isRead = readLetters.includes(currentLetter.id);

  const toggleReadStatus = (letterId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (typeof window === "undefined") return;
    try {
      let updated: string[];
      if (readLetters.includes(letterId)) {
        updated = readLetters.filter((id) => id !== letterId);
      } else {
        updated = [...readLetters, letterId];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      notifySubscribers();
    } catch {
      // localStorage error fallback
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    if (!isRead) {
      // Automatically mark as read when opening
      if (typeof window !== "undefined") {
        try {
          const updated = [...readLetters, currentLetter.id];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          notifySubscribers();
        } catch {
          // ignore
        }
      }
    }
  };

  return (
    <div className={styles.floatingContainer}>
      <button
        type="button"
        className={`${styles.miniEnvelope} ${isRead ? styles.isRead : styles.isUnread}`}
        onClick={handleOpenModal}
        aria-haspopup="dialog"
        aria-expanded={isModalOpen}
        aria-label={`VD:s Veckobrev v.${currentLetter.weekNumber} (${isRead ? "Läst" : "Oläst"}). Klicka för att öppna.`}
        title={`VD:s Veckobrev v.${currentLetter.weekNumber} - ${currentLetter.title}`}
      >
        {/* Envelope Top Flap */}
        <div className={styles.flap} aria-hidden="true" />

        {/* Mini Postage Stamp */}
        <div className={styles.miniStamp} aria-hidden="true">
          <span className={styles.stampIcon}>🌿</span>
        </div>

        {/* Week / VD label */}
        <div className={styles.miniLabel} aria-hidden="true">
          <span className={styles.labelTitle}>Veckobrev</span>
          <span className={styles.labelWeek}>V.{currentLetter.weekNumber}</span>
        </div>

        {/* Envelope Bottom Seal Accent */}
        <div className={styles.envelopeAccent} aria-hidden="true" />

        {/* Unread Exclamation Badge */}
        {!isRead && (
          <div className={styles.alertBadge} title="Oläst veckobrev">
            <span className={styles.alertIcon} aria-hidden="true">!</span>
          </div>
        )}
      </button>

      {/* Reading Modal / Popup */}
      {isModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-letter-title"
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Letterhead */}
            <div className={styles.modalLetterhead}>
              <div className={styles.letterheadLeft}>
                <div className={styles.companyLogo}>
                  <span className={styles.logoIcon}>🌿</span>
                  <span className={styles.logoText}>GREENCON</span>
                </div>
                <span className={styles.letterheadSubtitle}>Intern VD-uppdatering</span>
              </div>
              <div className={styles.letterheadRight}>
                {letters.length > 1 && (
                  <select
                    className={styles.historySelect}
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    aria-label="Välj tidigare veckobrev"
                  >
                    {letters.map((letter) => {
                      const letterIsRead = readLetters.includes(letter.id);
                      return (
                        <option key={letter.id} value={letter.id}>
                          Vecka {letter.weekNumber} ({letter.year}) {letterIsRead ? "✓" : "• Oläst"}
                        </option>
                      );
                    })}
                  </select>
                )}
                <span className={styles.modalDate}>{currentLetter.date}</span>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setIsModalOpen(false)}
                aria-label="Stäng veckobrevet"
              >
                ✕
              </button>
            </div>

            {/* Letter Body */}
            <div className={styles.modalBody}>
              <h2 id="modal-letter-title" className={styles.modalTitle}>
                {currentLetter.title}
              </h2>

              <div className={styles.authorBadgeRow}>
                <div className={styles.avatarSmall} aria-hidden="true">
                  <span>JA</span>
                </div>
                <div>
                  <div className={styles.modalAuthorName}>{currentLetter.author}</div>
                  <div className={styles.modalAuthorRole}>{currentLetter.authorRole} • {currentLetter.readTime} lästid</div>
                </div>
              </div>

              {currentLetter.highlights && currentLetter.highlights.length > 0 && (
                <div className={styles.highlightsContainer}>
                  <strong className={styles.highlightsTitle}>Veckans viktigaste punkter:</strong>
                  <ul className={styles.highlightsList}>
                    {currentLetter.highlights.map((highlight, index) => (
                      <li key={index} className={styles.highlightItem}>
                        <span className={styles.bulletCheck}>✓</span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={styles.letterText}>
                {currentLetter.content.map((paragraph, index) => (
                  <p key={index} className={styles.paragraph}>
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className={styles.signOff}>
                <p>Med vänliga hälsningar,</p>
                <strong>{currentLetter.author}</strong>
                <span>{currentLetter.authorRole}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.toggleReadAction}
                onClick={(e) => toggleReadStatus(currentLetter.id, e)}
              >
                {isRead ? "Markera som oläst" : "Markera som läst"}
              </button>
              <button
                type="button"
                className={styles.closeModalAction}
                onClick={() => setIsModalOpen(false)}
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
