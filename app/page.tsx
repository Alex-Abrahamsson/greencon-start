import { AlertBanner } from "@/components/AlertBanner/AlertBanner";
import { CalendarPanel } from "@/components/CalendarPanel/CalendarPanel";
import { NoticeBoard } from "@/components/NoticeBoard/NoticeBoard";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { QuickLinks } from "@/components/QuickLinks/QuickLinks";
import { WeeklyLetter } from "@/components/WeeklyLetter/WeeklyLetter";
import { alertMessages } from "@/data/alertMessages";
import { calendarEvents } from "@/data/calendarEvents";
import { quickLinks } from "@/data/quickLinks";
import { weeklyLetters } from "@/data/weeklyLetters";
import styles from "./page.module.scss";

export default function Home() {
  return (
    <main className={styles.page}>
      <aside className={styles.noticeSidebar} aria-label="Anslagstavla">
        <NoticeBoard />
      </aside>

      <section className={styles.content}>
        <div className={styles.container}>
          <AlertBanner messages={alertMessages} />

          <PageHeader
            eyebrow="Greencon Start"
            title="Din interna startsida"
            description="Här samlar vi företagets viktigaste länkar, förbättringsförslag och gemensamma händelser för att underlätta det dagliga arbetet."
          />

          <WeeklyLetter letters={weeklyLetters} />

          <QuickLinks links={quickLinks} />
        </div>
      </section>

      <CalendarPanel events={calendarEvents} />
    </main>
  );
}