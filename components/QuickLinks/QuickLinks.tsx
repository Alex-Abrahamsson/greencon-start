import { LinkCard } from "@/components/LinkCard/LinkCard";
import type { QuickLink } from "@/types/links";
import styles from "./QuickLinks.module.scss";

type QuickLinksProps = {
    links: QuickLink[];
};

export function QuickLinks({ links }: QuickLinksProps) {
    return (
        <section className={styles.grid} aria-label="Snabblänkar">
            {links.map((link) => (
                <LinkCard key={link.title} link={link} />
            ))}
        </section>
    );
}