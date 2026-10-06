"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useLunchLinks } from "@/hooks/useLunchLinks";
import type { LunchLink } from "@/types/lunchLink";
import styles from "./LunchCard.module.scss";

type LinkForm = Pick<LunchLink, "name" | "href">;

const emptyForm: LinkForm = {
  name: "",
  href: "",
};

export function LunchCard() {
  const {
    items: links,
    isLoading,
    isAvailable,
    isMutating,
    error,
    refresh,
    create,
    remove,
  } = useLunchLinks();
  const [pendingDelete, setPendingDelete] = useState<LunchLink | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<LinkForm>(emptyForm);

  const openCreateForm = () => {
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isMutating) return;
    setIsFormOpen(false);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = await create({
      name: form.name,
      href: form.href,
    });
    if (saved) {
      setIsFormOpen(false);
      setForm(emptyForm);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const deleted = await remove(pendingDelete.id);
    if (deleted) {
      setPendingDelete(null);
    }
  };

  return (
    <aside className={styles.sidebar} aria-label="Lunchmenyer">
      <section className={styles.card} aria-labelledby="lunch-links-title">
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Restauranger</span>
            <h2 className={styles.title} id="lunch-links-title">
              Lunch
            </h2>
          </div>
          <button
            className={styles.addButton}
            type="button"
            onClick={openCreateForm}
            disabled={!isAvailable || isLoading || isMutating}
          >
            Lägg till
          </button>
        </header>

        {error && !isFormOpen && !pendingDelete && (
          <div className={styles.error} role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={isLoading}
            >
              Försök igen
            </button>
          </div>
        )}

        {isLoading ? (
          <div className={styles.emptyState}>Hämtar lunchlänkar…</div>
        ) : error && !isAvailable ? null : links.length === 0 ? (
          <div className={styles.emptyState}>
            Inga lunchlänkar ännu. Lägg till den första.
          </div>
        ) : (
          <div className={styles.links}>
            {links.map((link) => (
              <div className={styles.linkRow} key={link.id}>
                <a
                  className={styles.link}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={styles.linkTitle}>{link.name}</span>
                  <span className={styles.linkDetail}>Lunchmeny</span>
                  <span className={styles.linkArrow} aria-hidden="true">
                    ↗
                  </span>
                </a>
                <button
                  className={styles.removeButton}
                  type="button"
                  onClick={() => setPendingDelete(link)}
                  disabled={isMutating}
                  aria-label={`Ta bort ${link.name}`}
                  title="Ta bort"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {isFormOpen && (
        <div className={styles.modalBackdrop}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lunch-link-form-title"
          >
            <header className={styles.modalHeader}>
              <h2 id="lunch-link-form-title">Lägg till lunchlänk</h2>
              <button
                className={styles.closeButton}
                type="button"
                onClick={closeForm}
                disabled={isMutating}
                aria-label="Stäng"
              >
                ×
              </button>
            </header>

            <form className={styles.form} onSubmit={handleSubmit}>
              <label>
                Namn
                <input
                  required
                  maxLength={120}
                  autoComplete="off"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Till exempel Restaurangens namn"
                />
              </label>
              <label>
                Länk till meny
                <input
                  required
                  type="url"
                  maxLength={2048}
                  autoComplete="url"
                  value={form.href}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      href: event.target.value,
                    }))
                  }
                  placeholder="https://exempel.se/lunch"
                />
              </label>
              {error && (
                <div className={styles.error} role="alert">
                  {error}
                </div>
              )}

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isMutating}
                >
                  Avbryt
                </button>
                <button type="submit" disabled={isMutating}>
                  {isMutating ? "Sparar…" : "Spara"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {pendingDelete && (
        <div className={styles.modalBackdrop}>
          <section
            className={styles.confirmModal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-lunch-link-title"
            aria-describedby="delete-lunch-link-description"
          >
            <h2 id="delete-lunch-link-title">Ta bort?</h2>
            <p id="delete-lunch-link-description">
              Vill du ta bort lunchlänken &quot;{pendingDelete.name}&quot;?
            </p>
            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}
            <div className={styles.confirmActions}>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={isMutating}
              >
                Nej
              </button>
              <button
                className={styles.confirmDeleteButton}
                type="button"
                onClick={() => void handleDelete()}
                disabled={isMutating}
              >
                {isMutating ? "Tar bort…" : "Ja"}
              </button>
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
