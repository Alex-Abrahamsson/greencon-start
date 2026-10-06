"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useAlerts } from "@/hooks/useAlerts";
import type { AlertMessage, AlertType } from "@/types/alert";
import styles from "./AlertBanner.module.scss";

type AlertForm = Pick<AlertMessage, "prefix" | "text" | "type">;

const emptyForm: AlertForm = {
  prefix: "VARNING",
  text: "",
  type: "alert",
};

const alertTypeLabels: Record<AlertType, string> = {
  alert: "Varning",
  warning: "Observera",
  info: "Information",
  success: "Klart",
};

const alertTypePrefixes: Record<AlertType, string> = {
  alert: "VARNING",
  warning: "OBSERVERA",
  info: "INFO",
  success: "KLART",
};

const typePriority: Record<AlertType, number> = {
  alert: 0,
  warning: 1,
  info: 2,
  success: 3,
};

export function AlertBanner() {
  const {
    items: alerts,
    isLoading,
    isAvailable,
    isMutating,
    error,
    refresh,
    create,
    remove,
  } = useAlerts();
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AlertMessage | null>(null);
  const [form, setForm] = useState<AlertForm>(emptyForm);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await create(form)) {
      setForm(emptyForm);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    if (await remove(pendingDelete.id)) {
      setPendingDelete(null);
    }
  };

  const bannerType =
    alerts.length > 0
      ? [...alerts].sort(
          (left, right) => typePriority[left.type] - typePriority[right.type],
        )[0].type
      : "info";

  return (
    <div className={styles.bannerWrapper}>
      {alerts.length > 0 ? (
        <aside
          className={`${styles.banner} ${styles[`severity${bannerType}`]}`}
          role="region"
          aria-label="Aktuella alerts"
          aria-live="polite"
        >
          <div className={styles.badge}>
            <span className={styles.led} aria-hidden="true" />
            <span className={styles.badgeText}>AKTUELLT</span>
          </div>

          <div className={styles.alertList}>
            {alerts.map((alert) => (
              <p
                className={`${styles.alertMessage} ${styles[`message${alert.type}`]}`}
                key={alert.id}
              >
                <span className={styles.itemPrefix}>{alert.prefix}</span>
                <span>{alert.text}</span>
              </p>
            ))}
          </div>

          <button
            className={styles.manageButton}
            type="button"
            onClick={() => setIsManageOpen(true)}
            disabled={!isAvailable || isLoading || isMutating}
          >
            Hantera
          </button>
        </aside>
      ) : (
        <div className={styles.emptyBanner}>
          {!isLoading && error ? (
            <span role="alert">{error}</span>
          ) : (
            <span>{isLoading ? "Hämtar alerts…" : "Inga aktiva alerts"}</span>
          )}
          {!isLoading && error && (
            <button type="button" onClick={() => void refresh()}>
              Försök igen
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsManageOpen(true)}
            disabled={!isAvailable || isLoading || isMutating}
          >
            Lägg till alert
          </button>
        </div>
      )}

      {isManageOpen && (
        <div className={styles.modalBackdrop}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="alerts-dialog-title"
          >
            <header className={styles.modalHeader}>
              <h2 id="alerts-dialog-title">Hantera alerts</h2>
              <button
                className={styles.closeButton}
                type="button"
                onClick={() => setIsManageOpen(false)}
                disabled={isMutating}
                aria-label="Stäng"
              >
                ×
              </button>
            </header>

            <div className={styles.manageContent}>
              <section className={styles.activeAlerts}>
                <h3>Aktiva alerts</h3>
                {alerts.length === 0 ? (
                  <p className={styles.emptyState}>Det finns inga aktiva alerts.</p>
                ) : (
                  <ul>
                    {alerts.map((alert) => (
                      <li key={alert.id}>
                        <div>
                          <strong>{alert.prefix}</strong>
                          <p>{alert.text}</p>
                        </div>
                        <button
                          className={styles.removeButton}
                          type="button"
                          onClick={() => setPendingDelete(alert)}
                          disabled={isMutating}
                          aria-label={`Ta bort ${alert.prefix}: ${alert.text}`}
                          title="Ta bort alert"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <form className={styles.form} onSubmit={handleSubmit}>
                <h3>Lägg till alert</h3>
                <label>
                  Typ
                  <select
                    value={form.type}
                    onChange={(event) => {
                      const type = event.target.value as AlertType;
                      setForm((current) => ({
                        ...current,
                        type,
                        prefix: alertTypePrefixes[type],
                      }));
                    }}
                  >
                    {Object.entries(alertTypeLabels).map(([type, label]) => (
                      <option key={type} value={type}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Meddelande
                  <textarea
                    required
                    maxLength={500}
                    rows={3}
                    value={form.text}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        text: event.target.value,
                      }))
                    }
                    placeholder="Beskriv vad kollegorna behöver veta"
                  />
                </label>
                {error && <div className={styles.error} role="alert">{error}</div>}
                <div className={styles.formActions}>
                  <button type="submit" disabled={isMutating}>
                    {isMutating ? "Sparar…" : "Publicera alert"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      )}

      {pendingDelete && (
        <div className={styles.modalBackdrop}>
          <section
            className={styles.confirmModal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-alert-title"
            aria-describedby="delete-alert-description"
          >
            <h2 id="delete-alert-title">Ta bort alert?</h2>
            <p id="delete-alert-description">
              Vill du ta bort alerten &quot;{pendingDelete.text}&quot;?
            </p>
            {error && <div className={styles.error} role="alert">{error}</div>}
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
    </div>
  );
}
