import React from 'react';
import { MotionConfig } from 'framer-motion';
import { useAppSelector } from '../../hooks';
import LandingPage from '../landing/LandingPage';
import AuthenticatedHome from './AuthenticatedHome';

/**
 * Route entry point: anonymous visitors get the marketing landing page,
 * signed-in users get their workspace overview.
 *
 * MotionConfig lives here, not in the entry chunk, so Framer stays lazy while
 * both halves of this route still honour the OS reduced-motion preference.
 */
const Home: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  return (
    <MotionConfig reducedMotion="user">
      {user ? <AuthenticatedHome /> : <LandingPage />}
    </MotionConfig>
  );
};

export default Home;
