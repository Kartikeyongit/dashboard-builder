import type { Variants } from 'framer-motion';

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export const scaleOnHover = { whileHover: { scale: 1.02 } };
export const tapOnce = { whileTap: { scale: 0.98 } };

export const cardHover = {
  whileHover: { y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.12)' },
  transition: { type: 'spring', stiffness: 300, damping: 20 },
};

export const shapeFloat = (duration = 20) => ({
  x: [0, 15, -10, 5, 0],
  y: [0, -10, 15, -5, 0],
  transition: { duration, repeat: Infinity, ease: 'easeInOut' as const },
});

export const nodePulse = (delay = 0) => ({
  r: [3, 5, 3],
  opacity: [0.3, 0.6, 0.3],
  transition: { duration: 2 + delay * 0.5, repeat: Infinity, ease: 'easeInOut' as const },
});

export const slowRotate = (duration = 60) => ({
  rotate: [0, 360],
  transition: { duration, repeat: Infinity, ease: 'linear' as const },
});
