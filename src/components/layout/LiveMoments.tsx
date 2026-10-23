import { useEffect, useState } from 'react';
import { useGameEvents } from '../../api/games.ts';
import type { GameEventDto } from '../../api/types.ts';
import { describeEvent, eventKind } from '../../lib/labels.ts';
import { playCue } from '../../lib/sound.ts';
import { useSettingsStore } from '../../stores/settingsStore.ts';
import styles from './LiveMoments.module.css';

const BREAKING_MS = 4500;
const TOAST_MS = 6000;
const MAX_TOASTS = 3;

interface Tracked {
  events: GameEventDto[] | undefined;
  seen: ReadonlySet<string> | null;
  breaking: GameEventDto[];
  toasts: GameEventDto[];
}

/**
 * Turns freshly arrived world events into broadcast moments: a BREAKING banner for signings and
 * hijacks, and small toasts for other news. Events already in the log when the game loads stay quiet.
 */
export function LiveMoments() {
  const events = useGameEvents().data?.events;
  const sound = useSettingsStore((state) => state.sound);
  const [tracked, setTracked] = useState<Tracked>({
    events: undefined,
    seen: null,
    breaking: [],
    toasts: [],
  });

  if (events && tracked.events !== events) {
    const fresh = tracked.seen ? events.filter((event) => !tracked.seen?.has(event.id)) : [];
    const seen = new Set([...(tracked.seen ?? []), ...events.map((event) => event.id)]);
    // The log is newest first; present the oldest new event first.
    const ordered = [...fresh].reverse();
    const loud = ordered.filter((event) => ['breaking', 'deal'].includes(eventKind(event.eventType)));
    const quiet = ordered.filter((event) => eventKind(event.eventType) === 'news');
    setTracked({
      events,
      seen,
      breaking: [...tracked.breaking, ...loud],
      toasts: [...tracked.toasts, ...quiet].slice(-MAX_TOASTS),
    });
  }

  const current = tracked.breaking[0];
  const toastIds = tracked.toasts.map((toast) => toast.id).join();

  useEffect(() => {
    if (!current) return;
    if (sound) playCue(eventKind(current.eventType) === 'deal' ? 'deal' : 'breaking');
    const timer = setTimeout(
      () => setTracked((state) => ({ ...state, breaking: state.breaking.slice(1) })),
      BREAKING_MS,
    );
    return () => clearTimeout(timer);
  }, [current, sound]);

  useEffect(() => {
    if (!toastIds) return;
    if (sound) playCue('news');
    const timer = setTimeout(
      () => setTracked((state) => ({ ...state, toasts: state.toasts.slice(1) })),
      TOAST_MS,
    );
    return () => clearTimeout(timer);
  }, [toastIds, sound]);

  const dismissBreaking = () => setTracked((state) => ({ ...state, breaking: state.breaking.slice(1) }));
  const dismissToast = (id: string) =>
    setTracked((state) => ({ ...state, toasts: state.toasts.filter((toast) => toast.id !== id) }));

  return (
    <>
      {current && (
        <div
          key={current.id}
          className={styles.breaking}
          data-kind={eventKind(current.eventType)}
          role="alert"
        >
          <span className={styles.flag}>
            {eventKind(current.eventType) === 'deal' ? 'Here we go' : 'Breaking'}
          </span>
          <p className={styles.headline}>{describeEvent(current)}</p>
          <button type="button" className={styles.close} onClick={dismissBreaking}>
            <span className="visually-hidden">Dismiss</span>
            <span aria-hidden="true">×</span>
          </button>
          <span
            className={styles.timer}
            style={{ animationDuration: `${BREAKING_MS}ms` }}
            aria-hidden="true"
          />
        </div>
      )}
      {tracked.toasts.length > 0 && (
        <ul className={styles.toasts} aria-label="Latest news" aria-live="polite">
          {tracked.toasts.map((toast) => (
            <li key={toast.id} className={styles.toast}>
              <span className={styles.toastKind}>News</span>
              <span className={styles.toastText}>{describeEvent(toast)}</span>
              <button type="button" className={styles.toastClose} onClick={() => dismissToast(toast.id)}>
                <span className="visually-hidden">Dismiss</span>
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
