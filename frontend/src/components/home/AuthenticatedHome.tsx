import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Check,
  Database,
  LayoutDashboard,
  Star,
  Terminal,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchDashboards } from '../../store/dashboardSlice';
import { fetchDatasources } from '../../store/datasourceSlice';
import { fetchQueries } from '../../store/querySlice';
import { teamAPI } from '../../api/team';
import { auditActionLabel } from '../../utils/audit';
import { canEditContent } from '../../utils/permissions';
import { pluralize, relativeTime } from '../../utils/format';
import { usePageTitle } from '../../utils/usePageTitle';
import type { AuditEvent } from '../../types';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import {
  buildOnboarding,
  buildRecentDashboards,
  completedSteps,
  getPrimaryAction,
} from './homeModel';
import './Home.css';

const ONBOARDING_STORAGE_KEY = 'dashboard-builder-onboarding-dismissed';

function readOnboardingDismissed(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

const HomeSkeleton = () => (
  <div className="home-skeleton" role="status" aria-live="polite">
    <span className="sr-only">Loading your workspace</span>
    <div className="home-skeleton__summary" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <span key={item} className="home-skeleton__tile" />
      ))}
    </div>
    <div className="home-skeleton__grid" aria-hidden="true">
      <div className="home-skeleton__card" />
      <div className="home-skeleton__card home-skeleton__card--short" />
    </div>
  </div>
);

const AuthenticatedHome = () => {
  const user = useAppSelector((state) => state.auth.user);
  const dashboards = useAppSelector((state) => state.dashboards.list);
  const dashboardsLoaded = useAppSelector((state) => state.dashboards.loaded);
  const dashboardsError = useAppSelector((state) => state.dashboards.error);
  const datasources = useAppSelector((state) => state.datasources.items);
  const datasourcesLoaded = useAppSelector((state) => state.datasources.loaded);
  const datasourcesError = useAppSelector((state) => state.datasources.error);
  const queries = useAppSelector((state) => state.queries.items);
  const queriesLoaded = useAppSelector((state) => state.queries.loaded);
  const queriesError = useAppSelector((state) => state.queries.error);

  const dispatch = useAppDispatch();
  const [onboardingDismissed, setOnboardingDismissed] = useState(readOnboardingDismissed);
  const [activity, setActivity] = useState<AuditEvent[] | null>(null);
  const [activityError, setActivityError] = useState(false);
  const [activityAttempt, setActivityAttempt] = useState(0);

  usePageTitle('Home — Dashboard Builder');

  const canEdit = canEditContent(user);
  const isAdmin = user?.role === 'admin';
  const librariesLoaded = dashboardsLoaded && datasourcesLoaded && queriesLoaded;
  const libraryError = dashboardsError ?? datasourcesError ?? queriesError ?? null;

  const counts = useMemo(
    () => ({
      dashboardCount: dashboards.length,
      datasourceCount: datasources.length,
      queryCount: queries.length,
    }),
    [dashboards.length, datasources.length, queries.length],
  );

  const primaryAction = librariesLoaded && !libraryError
    ? getPrimaryAction({ canEdit, ...counts })
    : null;
  const onboarding = useMemo(() => buildOnboarding(counts), [counts]);
  const doneSteps = completedSteps(onboarding);
  const allDone = doneSteps === onboarding.length;
  const recentDashboards = useMemo(() => buildRecentDashboards(dashboards), [dashboards]);

  // AppShell owns library loading. This effect only adds the admin audit feed,
  // which no other route needs.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    teamAPI
      .listAudit(5)
      .then((res) => {
        if (!cancelled) setActivity(res.data.events.slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) {
          setActivity([]);
          setActivityError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, activityAttempt]);

  const dismissOnboarding = () => {
    setOnboardingDismissed(true);
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    } catch {
      // The checklist still stays hidden for this session.
    }
  };

  const retryLibraries = () => {
    dispatch(fetchDashboards());
    dispatch(fetchDatasources());
    dispatch(fetchQueries());
  };

  const retryActivity = () => {
    setActivity(null);
    setActivityError(false);
    setActivityAttempt((attempt) => attempt + 1);
  };

  const firstName = user?.email?.split('@')[0] || 'there';
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header__copy">
          <p className="home-header__eyebrow">Welcome back</p>
          <h1 className="home-header__title">{displayName}</h1>
          <p className="home-header__lede">
            {canEdit
              ? 'Pick up where you left off, or take the next step in your workspace.'
              : 'Browse the dashboards your team has shared with you.'}
          </p>
        </div>
        {primaryAction && (
          <Link to={primaryAction.to} className="home-primary">
            {primaryAction.label}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </header>

      {!librariesLoaded && !libraryError && <HomeSkeleton />}

      {libraryError && (
        <ErrorState
          title="Could not load your workspace"
          description="The dashboard, datasource, or query library did not respond. Check the API and try again."
          details={libraryError}
          onRetry={retryLibraries}
        />
      )}

      {librariesLoaded && !libraryError && (
        <>
          <nav className="home-summary" aria-label="Workspace summary">
            <ul>
              <li>
                <Link to="/dashboards">
                  <span className="home-summary__icon" aria-hidden="true">
                    <LayoutDashboard size={16} />
                  </span>
                  <span className="home-summary__text">
                    <span className="home-summary__value">{counts.dashboardCount}</span>
                    <span className="home-summary__label">Dashboards</span>
                  </span>
                </Link>
              </li>
              <li>
                <Link to="/datasources">
                  <span className="home-summary__icon" aria-hidden="true">
                    <Database size={16} />
                  </span>
                  <span className="home-summary__text">
                    <span className="home-summary__value">{counts.datasourceCount}</span>
                    <span className="home-summary__label">Datasources</span>
                  </span>
                </Link>
              </li>
              <li>
                <Link to="/queries">
                  <span className="home-summary__icon" aria-hidden="true">
                    <Terminal size={16} />
                  </span>
                  <span className="home-summary__text">
                    <span className="home-summary__value">{counts.queryCount}</span>
                    <span className="home-summary__label">Queries</span>
                  </span>
                </Link>
              </li>
            </ul>
          </nav>

          {canEdit && !onboardingDismissed && !allDone && (
            <section className="home-card home-onboarding" aria-labelledby="home-onboarding-heading">
              <div className="home-card__head">
                <div>
                  <h2 id="home-onboarding-heading">Get started</h2>
                  <p>
                    {doneSteps} of {onboarding.length} steps complete
                  </p>
                </div>
                <button
                  type="button"
                  className="home-dismiss"
                  onClick={dismissOnboarding}
                  aria-label="Dismiss getting started checklist"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              <div
                className="home-onboarding__progress"
                role="progressbar"
                aria-label="Getting started progress"
                aria-valuemin={0}
                aria-valuemax={onboarding.length}
                aria-valuenow={doneSteps}
              >
                <span style={{ width: `${(doneSteps / onboarding.length) * 100}%` }} />
              </div>

              <ol className="home-steps">
                {onboarding.map((step, index) => (
                  <li
                    key={step.id}
                    className={`home-step${step.done ? ' home-step--done' : ''}`}
                  >
                    <span className="home-step__marker" aria-hidden="true">
                      {step.done ? <Check size={14} /> : index + 1}
                    </span>
                    <div className="home-step__body">
                      <span className="home-step__title">
                        {step.title}
                        {step.done && <span className="sr-only"> (done)</span>}
                      </span>
                      <span className="home-step__desc">{step.description}</span>
                      {step.done ? (
                        <span className="home-step__state">Done</span>
                      ) : (
                        <Link to={step.to} className="home-step__action">
                          {step.action}
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className={`home-grid${isAdmin ? ' home-grid--rail' : ''}`}>
            <section className="home-card home-recent" aria-labelledby="home-recent-heading">
              <div className="home-card__head">
                <div>
                  <h2 id="home-recent-heading">Recently updated</h2>
                  <p>Pinned dashboards first, then the latest changes.</p>
                </div>
                {counts.dashboardCount > 0 && (
                  <Link to="/dashboards" className="home-card__link">
                    View all
                  </Link>
                )}
              </div>

              {recentDashboards.length === 0 ? (
                <EmptyState
                  icon="dashboard"
                  title="No dashboards yet"
                  description={
                    canEdit
                      ? 'Create your first dashboard to start visualizing your data.'
                      : 'No dashboards have been shared with you yet.'
                  }
                  action={canEdit ? { label: 'New dashboard', to: '/dashboards?new=1' } : undefined}
                />
              ) : (
                <ul className="home-recent__list">
                  {recentDashboards.map((dashboard) => (
                    <li key={dashboard.id}>
                      <Link to={`/dashboards/${dashboard.id}`} className="home-recent__row">
                        <span
                          className={`home-recent__icon${dashboard.is_favorite ? ' home-recent__icon--pinned' : ''}`}
                          aria-hidden="true"
                        >
                          {dashboard.is_favorite ? (
                            <Star size={16} fill="currentColor" />
                          ) : (
                            <LayoutDashboard size={16} />
                          )}
                        </span>
                        <span className="home-recent__body">
                          <span className="home-recent__name">
                            {dashboard.name}
                            {dashboard.is_favorite && <span className="sr-only"> (pinned)</span>}
                          </span>
                          <span className="home-recent__meta">
                            {pluralize(dashboard.widget_count ?? 0, 'widget')} · updated{' '}
                            {relativeTime(dashboard.updated_at)}
                          </span>
                        </span>
                        <ArrowRight className="home-recent__chevron" size={16} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {isAdmin && (
              <aside className="home-card home-activity" aria-labelledby="home-activity-heading">
                <div className="home-card__head">
                  <div>
                    <h2 id="home-activity-heading">Team activity</h2>
                    <p>Recent changes across the workspace.</p>
                  </div>
                  <Link to="/team" className="home-card__link">
                    View all
                  </Link>
                </div>

                {activityError ? (
                  <ErrorState
                    compact
                    title="Could not load activity"
                    description="The audit feed is unavailable right now."
                    onRetry={retryActivity}
                  />
                ) : activity === null ? (
                  <div className="home-activity__skeleton" aria-hidden="true">
                    <span className="home-skeleton__tile" />
                    <span className="home-skeleton__tile" />
                    <span className="home-skeleton__tile" />
                  </div>
                ) : activity.length === 0 ? (
                  <p className="home-activity__empty">No team activity yet.</p>
                ) : (
                  <ul className="home-activity__list">
                    {activity.map((event) => (
                      <li className="home-activity__item" key={event.id}>
                        <span className="home-activity__icon" aria-hidden="true">
                          <Activity size={13} />
                        </span>
                        <span className="home-activity__body">
                          <span className="home-activity__title">
                            {auditActionLabel(event.action)}
                            {event.target_name && <strong> {event.target_name}</strong>}
                          </span>
                          <span className="home-activity__meta">
                            {event.actor_email || 'System'} · {relativeTime(event.created_at)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AuthenticatedHome;
