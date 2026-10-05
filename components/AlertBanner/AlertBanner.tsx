"use client";

import { AlertMessage } from "@/types/alert";
import styles from "./AlertBanner.module.scss";

interface AlertBannerProps {
  messages: AlertMessage[];
}

export function AlertBanner({ messages }: AlertBannerProps) {
  if (!messages || messages.length === 0) {
    return null;
  }

  // Render a single sequence of messages
  const renderMessageList = (keyPrefix: string) => (
    <div className={styles.tickerGroup} key={keyPrefix} aria-hidden={keyPrefix !== "primary"}>
      {messages.map((item, index) => (
        <span key={`${keyPrefix}-${item.id || index}`} className={styles.tickerItem}>
          {item.prefix && (
            <span
              className={`${styles.itemPrefix} ${
                item.type === "alert"
                  ? styles.typeAlert
                  : item.type === "warning"
                  ? styles.typeWarning
                  : item.type === "success"
                  ? styles.typeSuccess
                  : styles.typeInfo
              }`}
            >
              [{item.prefix}]
            </span>
          )}
          <span className={styles.itemText}>{item.text}</span>
          <span className={styles.separator} aria-hidden="true">
            +++
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div className={styles.bannerWrapper}>
      <aside
        className={styles.banner}
        role="region"
        aria-label="Trafikinformation och driftmeddelanden"
      >
        <div className={styles.badge}>
          <span className={styles.led} aria-hidden="true" />
          <span className={styles.badgeText}>INFO-TAVLA</span>
        </div>

        <div className={styles.tickerViewport} tabIndex={0} aria-label="Rullande meddelanden">
          <div className={styles.tickerTrack}>
            {renderMessageList("primary")}
            {renderMessageList("duplicate")}
          </div>
        </div>
      </aside>
    </div>
  );
}
