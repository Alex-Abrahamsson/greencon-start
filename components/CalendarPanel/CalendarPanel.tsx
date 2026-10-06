"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import type { CalendarEvent } from "@/types/calendar";
import styles from "./CalendarPanel.module.scss";

type EventForm = {
    title: string;
    description: string;
    category: string;
    startAt: string;
};

const emptyForm: EventForm = {
    title: "",
    description: "",
    category: "Info",
    startAt: "",
};

function localDateTimeValue(date: Date) {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultStartAt() {
    const date = new Date();
    date.setHours(date.getHours() + 1, 0, 0, 0);
    return localDateTimeValue(date);
}

function dateKey(date: Date) {
    const parts = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return `${value("year")}-${value("month")}-${value("day")}`;
}

function getStockholmToday() {
    return dateKey(new Date());
}

function formatEventDate(startAt: string) {
    const date = new Date(startAt);
    const today = new Date();
    const tomorrow = new Date(
        Date.UTC(
            Number(dateKey(today).slice(0, 4)),
            Number(dateKey(today).slice(5, 7)) - 1,
            Number(dateKey(today).slice(8, 10)) + 1,
        ),
    );
    const eventDay = dateKey(date);

    if (eventDay === dateKey(today)) return "Idag";
    if (eventDay === dateKey(tomorrow)) return "Imorgon";

    const label = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        weekday: "long",
        day: "numeric",
        month: "short",
    }).format(date);
    return label.charAt(0).toLocaleUpperCase("sv-SE") + label.slice(1);
}

function formatEventTime(startAt: string) {
    return new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(startAt));
}

export function CalendarPanel() {
    const {
        items: events,
        isLoading,
        isAvailable,
        isMutating,
        error,
        setError,
        refresh,
        create,
        update,
        remove,
    } = useCalendarEvents();
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [form, setForm] = useState<EventForm>(emptyForm);
    const today = getStockholmToday();
    const todayEvents = events.filter((event) => dateKey(new Date(event.startAt)) === today);
    const upcomingEvents = events.filter((event) => dateKey(new Date(event.startAt)) !== today);

    const openCreateForm = () => {
        setEditingEvent(null);
        setForm({ ...emptyForm, startAt: defaultStartAt() });
        setIsFormOpen(true);
    };

    const openEditForm = (event: CalendarEvent) => {
        setEditingEvent(event);
        setForm({
            title: event.title,
            description: event.description,
            category: event.category,
            startAt: localDateTimeValue(new Date(event.startAt)),
        });
        setIsFormOpen(true);
    };

    const closeForm = () => {
        if (isMutating) return;
        setIsFormOpen(false);
        setEditingEvent(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!form.startAt) {
            setError("Ange datum och tid för händelsen.");
            return;
        }

        const startAt = new Date(form.startAt);
        if (!Number.isFinite(startAt.getTime()) || startAt.getTime() <= Date.now()) {
            setError("Välj ett datum och en tid som ligger framåt.");
            return;
        }

        setError(null);
        const payload = {
            ...form,
            startAt: startAt.toISOString(),
        };
        const saved = editingEvent
            ? await update(editingEvent.id, payload)
            : await create(payload);
        if (saved) {
            setIsFormOpen(false);
            setEditingEvent(null);
        }
    };

    const handleDelete = async (event: CalendarEvent) => {
        if (!window.confirm(`Ta bort "${event.title}" från kalendern?`)) return;
        await remove(event.id);
    };

    return (
        <aside className={styles.panel} aria-label="Gemensam kalender">
            <div className={styles.header}>
                <div>
                    <p className={styles.eyebrow}>Kalender</p>
                    <h2 className={styles.title}>Viktigt just nu</h2>
                </div>

                <button
                    className={styles.addButton}
                    type="button"
                    onClick={openCreateForm}
                    disabled={!isAvailable || isLoading || isMutating}
                >
                    Lägg till
                </button>
            </div>

            {error && (
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
                <div className={styles.emptyState}>Hämtar kalendern…</div>
            ) : error && !isAvailable ? null : events.length === 0 ? (
                <div className={styles.emptyState}>
                    Inga kommande händelser. Lägg till den första.
                </div>
            ) : (
                <div className={styles.eventList}>
                    {[
                        { title: "Idag", items: todayEvents },
                        { title: "Kommande", items: upcomingEvents },
                    ]
                        .filter((group) => group.items.length > 0)
                        .map((group) => (
                            <section className={styles.eventGroup} key={group.title}>
                                <h3 className={styles.eventGroupTitle}>{group.title}</h3>
                                {group.items.map((event) => (
                                    <article key={event.id} className={styles.eventCard}>
                                        <div className={styles.eventMeta}>
                                            <span className={styles.eventCategory}>{event.category}</span>
                                            <span>
                                                {formatEventDate(event.startAt)} {formatEventTime(event.startAt)}
                                            </span>
                                        </div>

                                        <h4 className={styles.eventTitle}>{event.title}</h4>
                                        <p className={styles.eventDescription}>{event.description}</p>

                                        <div className={styles.eventActions}>
                                            <button
                                                type="button"
                                                onClick={() => openEditForm(event)}
                                                disabled={isMutating}
                                                aria-label={`Ändra ${event.title}`}
                                            >
                                                Ändra
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleDelete(event)}
                                                disabled={isMutating}
                                                aria-label={`Ta bort ${event.title}`}
                                            >
                                                Ta bort
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </section>
                        ))}
                </div>
            )}

            {isFormOpen && (
                <div
                    className={styles.modalBackdrop}
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeForm();
                    }}
                    role="presentation"
                >
                    <div
                        className={styles.modal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="calendar-form-title"
                    >
                        <div className={styles.modalHeader}>
                            <h2 id="calendar-form-title">
                                {editingEvent ? "Ändra händelse" : "Lägg till händelse"}
                            </h2>
                            <button
                                type="button"
                                className={styles.closeButton}
                                onClick={closeForm}
                                disabled={isMutating}
                                aria-label="Stäng formulär"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <label>
                                Rubrik
                                <input
                                    required
                                    maxLength={120}
                                    value={form.title}
                                    onChange={(event) =>
                                        setForm({ ...form, title: event.target.value })
                                    }
                                />
                            </label>
                            <label>
                                Beskrivning
                                <textarea
                                    required
                                    maxLength={500}
                                    rows={3}
                                    value={form.description}
                                    onChange={(event) =>
                                        setForm({ ...form, description: event.target.value })
                                    }
                                />
                            </label>
                            <label>
                                Kategori
                                <input
                                    required
                                    maxLength={32}
                                    value={form.category}
                                    onChange={(event) =>
                                        setForm({ ...form, category: event.target.value })
                                    }
                                />
                            </label>
                            <label>
                                Datum och tid
                                <input
                                    required
                                    type="datetime-local"
                                    value={form.startAt}
                                    onChange={(event) =>
                                        setForm({ ...form, startAt: event.target.value })
                                    }
                                />
                            </label>
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
                    </div>
                </div>
            )}
        </aside>
    );
}
