import { useGameEvents } from '../../api/games.ts';
import { formatGameMoment } from '../../lib/format.ts';
import { describeEvent, EVENT_KIND_LABEL, eventKind } from '../../lib/labels.ts';
import styles from './NewsTicker.module.css';

const TICKER_KINDS = new Set(['breaking', 'news', 'deal']);

/** Bottom-of-screen scrolling headlines built from the public event log. */
export function NewsTicker() {
  const { data } = useGameEvents();
  const headlines = (data?.events ?? [])
    .filter((event) => TICKER_KINDS.has(eventKind(event.eventType)))
    .slice(0, 12);

  if (headlines.length === 0) return null;

  // Two copies of the track make the marquee loop seamless; only the first is exposed to assistive tech.
  const track = (hidden: boolean) => (
    <ul
      className={styles.track}
      aria-hidden={hidden || undefined}
      aria-label={hidden ? undefined : 'Headlines'}
    >
      {headlines.map((event) => {
        const kind = eventKind(event.eventType);
        return (
          <li key={event.id} className={styles.item} data-kind={kind}>
            <span className={styles.kind}>{EVENT_KIND_LABEL[kind]}</span>
            <span className={styles.time}>{formatGameMoment(event.createdAtGameHour)}</span>
            <span>{describeEvent(event)}</span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside className={styles.ticker} aria-label="News ticker">
      <span className={styles.label} aria-hidden="true">
        Deadline Wire
      </span>
      <div className={styles.viewport}>
        <div
          className={styles.marquee}
          style={{ animationDuration: `${Math.max(30, headlines.length * 9)}s` }}
        >
          {track(false)}
          {track(true)}
        </div>
      </div>
    </aside>
  );
}
