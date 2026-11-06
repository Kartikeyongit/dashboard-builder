import React from 'react';
import { useAppSelector } from '../../hooks';
import LandingPage from '../landing/LandingPage';
import AuthenticatedHome from './AuthenticatedHome';

/**
 * Route entry point: anonymous visitors get the marketing landing page,
 * signed-in users get their workspace overview.
 */
const Home: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  return user ? <AuthenticatedHome /> : <LandingPage />;
};

export default Home;
