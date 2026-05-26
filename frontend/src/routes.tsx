import { createBrowserRouter } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import DatasourceList from './components/datasource/DatasourceList';
import DatasourceForm from './components/datasource/DatasourceForm';
import QueryList from './components/query/QueryList';
import QueryEditor from './components/query/QueryEditor';
import DashboardList from './components/dashboard/DashboardList';
import DashboardEditor from './components/dashboard/DashboardEditor';
import SharedDashboardView from './components/viewer/SharedDashboardView';
import Home from './components/home/Home';

const router = createBrowserRouter([
  {
    path: '/view/:token',
    element: <SharedDashboardView />,
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
      { path: 'dashboards/:dashboardId/edit', element: <DashboardEditor /> },
    ],
  },
]);

export default router;
