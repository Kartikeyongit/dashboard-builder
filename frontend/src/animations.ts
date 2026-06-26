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

export const counterAnimation = (end: number, duration = 1.5) => ({
  initial: { count: 0 },
  animate: { count: end, transition: { duration, ease: 'easeOut' } },
});
