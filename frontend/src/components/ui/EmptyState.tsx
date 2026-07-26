import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import './EmptyState.css';

interface EmptyStateAction {
  label: string;
  to?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon: 'dashboard' | 'datasource' | 'query' | 'widget';
  title: string;
  description: string;
  action?: EmptyStateAction;
}

const ICONS: Record<EmptyStateProps['icon'], React.ReactNode> = {
  dashboard: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="26" height="26" rx="4" stroke="currentColor" strokeWidth="2" />
      <rect x="46" y="8" width="26" height="16" rx="4" stroke="currentColor" strokeWidth="2" />
      <rect x="8" y="46" width="26" height="16" rx="4" stroke="currentColor" strokeWidth="2" />
      <rect x="46" y="38" width="26" height="34" rx="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="21" cy="21" r="2.5" fill="currentColor" opacity="0.4" />
      <circle cx="59" cy="16" r="2.5" fill="currentColor" opacity="0.4" />
      <circle cx="21" cy="54" r="2.5" fill="currentColor" opacity="0.4" />
      <circle cx="59" cy="55" r="2.5" fill="currentColor" opacity="0.4" />
    </svg>
  ),
  datasource: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="22" rx="26" ry="9" stroke="currentColor" strokeWidth="2" />
      <path d="M14 22v12c0 5 11.6 9 26 9s26-4 26-9V22" stroke="currentColor" strokeWidth="2" />
      <path d="M14 34v12c0 5 11.6 9 26 9s26-4 26-9V34" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <circle cx="35" cy="22" r="2.5" fill="currentColor" opacity="0.4" />
      <circle cx="35" cy="34" r="2.5" fill="currentColor" opacity="0.4" />
    </svg>
  ),
  query: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="34" cy="34" r="16" stroke="currentColor" strokeWidth="2" />
      <path d="M45 45l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M28 34h12M34 28v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <circle cx="34" cy="34" r="2" fill="currentColor" opacity="0.4" />
    </svg>
  ),
  widget: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="30" height="30" rx="4" stroke="currentColor" strokeWidth="2" />
      <rect x="44" y="6" width="30" height="20" rx="4" stroke="currentColor" strokeWidth="2" />
      <rect x="6" y="44" width="30" height="20" rx="4" stroke="currentColor" strokeWidth="2" />
      <rect x="44" y="36" width="30" height="38" rx="4" stroke="currentColor" strokeWidth="2" />
      <rect x="10" y="10" width="22" height="8" rx="2" fill="currentColor" opacity="0.08" />
      <rect x="10" y="22" width="22" height="4" rx="1" fill="currentColor" opacity="0.05" />
      <rect x="48" y="10" width="22" height="4" rx="1" fill="currentColor" opacity="0.05" />
      <rect x="10" y="48" width="22" height="4" rx="1" fill="currentColor" opacity="0.05" />
    </svg>
  ),
};

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <motion.div
    className="empty-state"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
  >
    <motion.div
      className="empty-state-icon"
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.1, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {ICONS[icon]}
    </motion.div>
    <div className="empty-state-title">{title}</div>
    <div className="empty-state-description">{description}</div>
    {action && (
      <motion.div
        className="empty-state-action"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        {action.to ? (
          <Link to={action.to} className="empty-state-btn">
            {action.label}
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        ) : (
          <button className="empty-state-btn" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </motion.div>
    )}
  </motion.div>
);

export default EmptyState;
