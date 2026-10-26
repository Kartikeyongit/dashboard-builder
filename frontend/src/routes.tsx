import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import RouteFallback from './components/ui/RouteFallback';

// Routes are split so the initial bundle stays small. Monaco, AG Grid, and
// ECharts load only when the page that needs them is opened.
const Login = lazy(() => import('./components/auth/Login'));
const Register = lazy(() => import('./components/auth/Register'));
const DatasourceList = lazy(() => import('./components/datasource/DatasourceList'));
const DatasourceForm = lazy(() => import('./components/datasource/DatasourceForm'));
const QueryList = lazy(() => import('./components/query/QueryList'));
const QueryEditor = lazy(() => import('./components/query/QueryEditor'));
const DashboardList = lazy(() => import('./components/dashboard/DashboardList'));
const DashboardEditor = lazy(() => import('./components/dashboard/DashboardEditor'));
const DashboardView = lazy(() => import('./components/dashboard/DashboardView'));
const SharedDashboardView = lazy(() => import('./components/viewer/SharedDashboardView'));
const Home = lazy(() => import('./components/home/Home'));

const router = createBrowserRouter([
  {
    path: '/view/:token',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <SharedDashboardView />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'datasources', element: <DatasourceList /> },
      { path: 'datasources/new', element: <DatasourceForm /> },
      { path: 'datasources/:id/edit', element: <DatasourceForm /> },
      { path: 'queries', element: <QueryList /> },
      { path: 'queries/new', element: <QueryEditor /> },
      { path: 'queries/:queryId/edit', element: <QueryEditor /> },
      { path: 'dashboards', element: <DashboardList /> },
      { path: 'dashboards/:dashboardId', element: <DashboardView /> },
      { path: 'dashboards/:dashboardId/edit', element: <DashboardEditor /> },
    ],
  },
]);

export default router;
