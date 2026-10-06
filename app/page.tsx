import { connection } from "next/server";
import { AlertBanner } from "@/components/AlertBanner/AlertBanner";
import { CalendarPanel } from "@/components/CalendarPanel/CalendarPanel";
import { LunchCard } from "@/components/LunchCard/LunchCard";
import { NoticeBoard } from "@/components/NoticeBoard/NoticeBoard";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Route66Progress } from "@/components/Route66Progress/Route66Progress";
import { SearchCard } from "@/components/SearchCard/SearchCard";
import { WeeklyLetter } from "@/components/WeeklyLetter/WeeklyLetter";
import { weeklyLetters } from "@/data/weeklyLetters";
import styles from "./page.module.scss";

export default async function Home() {
  await connection();

  return (
    <main className={styles.page}>
      <aside className={styles.noticeSidebar} aria-label="Anslagstavla">
        <NoticeBoard />
      </aside>

      <section className={styles.content}>
        <div className={styles.container}>
          <AlertBanner />
          <PageHeader
            eyebrow="GreenconStart"
            title="Välkommen"
            description={
              <>
                Det här är en testsida under utveckling. Hjälp till att göra den
                bättre genom att lägga post-it-lappar på anslagstavlan med
                förbättringar, idéer och förslag på sådant som borde finnas här.
                <br />
                <br />
                Förlag med många Likes hamnar högst upp på listan.
              </>
            }
          />
        </div>
      </section>

      <LunchCard />

      <SearchCard />

      <div className={styles.calendarColumn}>
        <CalendarPanel />
      </div>
      <WeeklyLetter letters={weeklyLetters} />

      <Route66Progress />
    </main>
  );
}