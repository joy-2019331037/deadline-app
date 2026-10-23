import { useGame } from '../../api/games.ts';

export function DashboardPage() {
  const { data } = useGame();
  if (!data) return null;

  return (
    <section aria-labelledby="dashboard-title">
      <h1 id="dashboard-title">Dashboard</h1>
      <p>{data.game.club?.name}</p>
    </section>
  );
}
