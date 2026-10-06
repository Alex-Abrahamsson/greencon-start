'use client';

import type { FormEvent } from 'react';
import { MySupportIssuesCard } from '@/components/MySupportIssuesCard/MySupportIssuesCard';
import styles from './SearchCard.module.scss';

type SearchDefinition = {
    id: string;
    label: string;
    placeholder: string;
    destination: 'jira' | 'confluence';
    queryType?: 'issue' | 'summary' | 'appBugs' | 'officeBugs' | 'text';
};

const searches: SearchDefinition[] = [
    {
        id: 'jira-issue-id',
        label: 'Ticket eller Ärende_ID',
        placeholder: 'T.ex. TICKET-12345',
        destination: 'jira',
        queryType: 'issue',
    },
    {
        id: 'jira-summary',
        label: 'Ärendesammanfattning',
        placeholder: 'Sök på sammanfattning',
        destination: 'jira',
        queryType: 'summary',
    },
    {
        id: 'jira-app-bugs',
        label: 'Sök appbuggar',
        placeholder: 'Beskriv appbuggen',
        destination: 'jira',
        queryType: 'appBugs',
    },
    {
        id: 'jira-office-bugs',
        label: 'Sök kontorsbuggar',
        placeholder: 'Beskriv kontorsbuggen',
        destination: 'jira',
        queryType: 'officeBugs',
    },
    {
        id: 'confluence',
        label: 'Sök på Confluence',
        placeholder: 'Sök i kunskapsbanken',
        destination: 'confluence',
    },
];

function escapeJqlValue(value: string) {
    return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function createJiraUrl(search: SearchDefinition, value: string) {
    if (search.queryType === 'issue') {
        const ticketId = value.match(/^(?:TICKET-)?(\d+)$/i)?.[1];

        if (ticketId) {
            const ticketKey = `TICKET-${ticketId}`;
            return `https://greencon.atlassian.net/jira/servicedesk/projects/TICKET/queues/custom/17/${ticketKey}`;
        }
    }

    const escapedValue = escapeJqlValue(value);
    const phrase = `"${escapedValue}"`;
    let jql: string;

    switch (search.queryType) {
        case 'issue':
            jql = `(key = "${escapedValue}" OR text ~ ${phrase})`;
            break;
        case 'summary':
            jql = `summary ~ ${phrase}`;
            break;
        case 'appBugs':
            jql = `project="GreenView App" AND Type="Bugg" AND Summary~"${escapedValue}*" ORDER BY Status ASC`;
            break;
        case 'officeBugs':
            jql = `project="GreenView Kontor" AND Type="Bugg" AND Summary~"${escapedValue}*" ORDER BY Status ASC`;
            break;
        default:
            jql = `text ~ ${phrase}`;
    }

    return `https://greencon.atlassian.net/issues/?jql=${encodeURIComponent(jql)}`;
}

function handleSearch(
    event: FormEvent<HTMLFormElement>,
    search: SearchDefinition,
) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = String(formData.get('search') ?? '').trim();

    if (!value) {
        return;
    }

    const url =
        search.destination === 'confluence'
            ? `https://greencon.atlassian.net/wiki/search?text=${encodeURIComponent(value)}&spaces=IN%2CGREENCON%2CGV2&product=confluence`
            : createJiraUrl(search, value);

    window.open(url, '_blank', 'noopener,noreferrer');
}

export function SearchCard() {
    return (
        <aside className={styles.sidebar} aria-label='Sök och snabblänkar'>
            <MySupportIssuesCard />
            <section className={styles.card}>
                <header className={styles.header}>
                    <span className={styles.eyebrow}>
                        Jira &amp; Confluence
                    </span>
                    <h2 className={styles.title}>Snabbsök</h2>
                </header>

                <div className={styles.searchList}>
                    {searches.map((search) => (
                        <form
                            key={search.id}
                            className={styles.searchForm}
                            onSubmit={(event) => handleSearch(event, search)}
                        >
                            <label className={styles.label} htmlFor={search.id}>
                                {search.label}
                            </label>
                            <div className={styles.inputGroup}>
                                <input
                                    id={search.id}
                                    className={styles.input}
                                    name='search'
                                    type='search'
                                    placeholder={search.placeholder}
                                    autoComplete='off'
                                    maxLength={255}
                                    required
                                />
                                <button
                                    className={styles.submitButton}
                                    type='submit'
                                    aria-label={`Sök: ${search.label}`}
                                >
                                    <svg
                                        aria-hidden='true'
                                        viewBox='0 0 20 20'
                                        fill='none'
                                    >
                                        <circle cx='8.75' cy='8.75' r='5.75' />
                                        <path d='m13 13 4 4' />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    ))}
                </div>
            </section>

            <section
                className={`${styles.card} ${styles.stackedCard}`}
                aria-labelledby='app-releases-title'
            >
                <header className={styles.header}>
                    <span className={styles.eyebrow}>Confluence</span>
                    <h2 className={styles.title} id='app-releases-title'>
                        AppReleaser
                    </h2>
                    <p className={styles.description}>
                        Releaseöversikter för våra appar.
                    </p>
                </header>

                <div className={styles.releaseLinks}>
                    <a
                        className={styles.releaseLink}
                        href='https://greencon.atlassian.net/wiki/spaces/GV2/pages/2992209921/Release+versikt+f+r+GV2-App'
                        target='_blank'
                        rel='noopener noreferrer'
                    >
                        <span className={styles.releaseLinkTitle}>
                            App (GV2)
                        </span>
                        <span className={styles.releaseLinkDetail}>
                            Releaseöversikt
                        </span>
                        <span
                            className={styles.releaseLinkArrow}
                            aria-hidden='true'
                        >
                            ↗
                        </span>
                    </a>
                    <a
                        className={styles.releaseLink}
                        href='https://greencon.atlassian.net/wiki/spaces/GV2/pages/2992439297/Release+versikt+f+r+App-FOP3'
                        target='_blank'
                        rel='noopener noreferrer'
                    >
                        <span className={styles.releaseLinkTitle}>
                            App (FOP3)
                        </span>
                        <span className={styles.releaseLinkDetail}>
                            Releaseöversikt
                        </span>
                        <span
                            className={styles.releaseLinkArrow}
                            aria-hidden='true'
                        >
                            ↗
                        </span>
                    </a>
                </div>
            </section>
        </aside>
    );
}
