import type { CalendarEvent } from "@/types/calendar";
import styles from "./CalendarPanel.module.scss";

type CalendarPanelProps = {
    events: CalendarEvent[];
};

export function CalendarPanel({ events }: CalendarPanelProps) {
    return (
        <aside className={styles.panel} aria-label="Gemensam kalender">
            <div className={styles.header}>
                <div>
                    <p className={styles.eyebrow}>Kalender</p>
                    <h2 className={styles.title}>Viktigt just nu</h2>
                </div>

                <button className={styles.addButton} type="button">
                    Lägg till
                </button>
            </div>

            <div className={styles.eventList}>
                {events.map((event) => (
                    <article key={event.id} className={styles.eventCard}>
                        <div className={styles.eventMeta}>
                            <span className={styles.eventCategory}>{event.category}</span>
                            <span>
                {event.dateLabel} {event.time}
              </span>
                        </div>

                        <h3 className={styles.eventTitle}>{event.title}</h3>
                        <p className={styles.eventDescription}>{event.description}</p>
                    </article>
                ))}
            </div>
        </aside>
    );
}