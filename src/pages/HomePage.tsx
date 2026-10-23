import styles from './HomePage.module.css';

export function HomePage() {
  return (
    <section className={styles.hero} aria-labelledby="home-title">
      <h1 id="home-title" className={styles.title}>
        DEADLINE
      </h1>
      <p className={styles.tagline}>In football, the truth is negotiable.</p>
    </section>
  );
}
