import type { QuickLink } from "@/types/links";
import styles from "./LinkCard.module.scss";

type LinkCardProps = {
    link: QuickLink;
};

export function LinkCard({ link }: LinkCardProps) {
    return (
        <a className={styles.card} href={link.href}>
            <h2 className={styles.title}>{link.title}</h2>
            <p className={styles.description}>{link.description}</p>
        </a>
    );
}