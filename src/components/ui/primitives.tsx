import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { canAnimate } from '../../lib/motion.ts';
import styles from './primitives.module.css';

export type Tone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger';

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={className ? `${styles.badge} ${className}` : styles.badge} data-tone={tone}>
      {children}
    </span>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  /** Rendered as a chip, keeping the full label text (e.g. "Send · 1 hour"). */
  cost?: string | undefined;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  cost,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={className ? `${styles.button} ${className}` : styles.button}
      data-variant={variant}
      data-size={size}
      {...rest}
    >
      {children}
      {cost && (
        <>
          {' '}
          <span className={styles.cost}>· {cost}</span>
        </>
      )}
    </button>
  );
}

export function StatBar({
  value,
  max = 100,
  tone = 'accent',
  label,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  label?: string;
}) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <span
      className={styles.bar}
      data-tone={tone}
      role={label ? 'meter' : undefined}
      aria-label={label}
      aria-valuenow={label ? value : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? max : undefined}
      aria-hidden={label ? undefined : true}
    >
      <span className={styles.fill} style={{ width: `${percent}%` }} />
    </span>
  );
}

/** Counts up to `value` when it changes; renders the formatted final value for assistive tech. */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (value: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const previous = useRef(value);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (reduce || !canAnimate() || from === value) return;
    const controls = animate(from, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setShown(Math.round(latest)),
      onComplete: () => setShown(null),
    });
    return () => {
      controls.stop();
      setShown(null);
    };
  }, [value, reduce]);

  return <span className={className}>{format(shown ?? value)}</span>;
}

export function Monogram({ name, tone = 'info' }: { name: string; tone?: Tone }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span className={styles.monogram} data-tone={tone} aria-hidden="true">
      {initials}
    </span>
  );
}
