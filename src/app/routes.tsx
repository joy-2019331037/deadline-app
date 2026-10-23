import type { RouteObject } from 'react-router';
import { AppShell } from '../components/layout/AppShell.tsx';
import { DashboardPage } from '../pages/game/DashboardPage.tsx';
import { GameLayout } from '../pages/game/GameLayout.tsx';
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
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
