import type { RouteObject } from 'react-router';
import { AppShell } from '../components/layout/AppShell.tsx';
import { DashboardPage } from '../pages/game/DashboardPage.tsx';
import { GameLayout } from '../pages/game/GameLayout.tsx';
import { MarketPage } from '../pages/game/MarketPage.tsx';
import { NegotiationPage } from '../pages/game/NegotiationPage.tsx';
import { NegotiationsPage } from '../pages/game/NegotiationsPage.tsx';
import { PlayerProfilePage } from '../pages/game/PlayerProfilePage.tsx';
import { SquadPage } from '../pages/game/SquadPage.tsx';
import { HomePage } from '../pages/HomePage.tsx';
import { NotFoundPage } from '../pages/NotFoundPage.tsx';

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'game',
        element: <GameLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'squad', element: <SquadPage /> },
          { path: 'market', element: <MarketPage /> },
          { path: 'players/:playerId', element: <PlayerProfilePage /> },
          { path: 'negotiations', element: <NegotiationsPage /> },
          { path: 'negotiations/:negotiationId', element: <NegotiationPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
