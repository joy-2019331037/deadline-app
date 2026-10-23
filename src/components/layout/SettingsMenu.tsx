import { useEffect, useId, useRef, useState } from 'react';
import { useSettingsStore, type Settings } from '../../stores/settingsStore.ts';
import styles from './SettingsMenu.module.css';

const OPTIONS: { key: keyof Settings; label: string; hint: string }[] = [
  {
    key: 'realisticReplies',
    label: 'Realistic reply timing',
    hint: 'Agents take a moment to read and type.',
  },
  { key: 'ticker', label: 'News ticker', hint: 'Scrolling headlines along the bottom.' },
  { key: 'sound', label: 'Sound cues', hint: 'Short alerts for breaking news and deals.' },
];

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const settings = useSettingsStore();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !root.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={root}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
            <circle cx="15" cy="7" r="2" />
            <circle cx="9" cy="17" r="2" />
          </g>
        </svg>
        <span className="visually-hidden">Settings</span>
      </button>
      {open && (
        <div id={panelId} className={styles.panel} role="group" aria-label="Settings">
          {OPTIONS.map((option) => (
            <label key={option.key} className={styles.option}>
              <span>
                <span className={styles.label}>{option.label}</span>
                <span className={styles.hint}>{option.hint}</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className={styles.switch}
                checked={settings[option.key]}
                onChange={(event) => settings.setSetting(option.key, event.target.checked)}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
