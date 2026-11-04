import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Copy,
  KeyRound,
  Mail,
  Settings as SettingsIcon,
  Share2,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAppSelector } from '../../hooks';
import { teamAPI } from '../../api/team';
import { addToast } from '../../store/toastSlice';
import { useAppDispatch } from '../../hooks';
import { apiErrorMessage } from '../../utils/apiError';
import { auditActionLabel } from '../../utils/audit';
import { relativeTime } from '../../utils/format';
import type { AuditEvent, Invite, Member, TeamRole } from '../../types';
import Button, { IconButton } from '../../ui/Button';
import ConfirmDialog from '../../ui/ConfirmDialog';
import ErrorState from '../../ui/ErrorState';
import Field, { Input, Select } from '../../ui/Field';
import '../ui/ListPage.css';
import './TeamPage.css';

type TabKey = 'members' | 'invites' | 'activity';

const ROLE_LABEL: Record<TeamRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_HINT: Record<TeamRole, string> = {
  admin: 'Manage the team, connections, and content.',
  editor: 'Create and edit dashboards, queries, and datasources.',
  viewer: 'View dashboards and run saved queries.',
};

const initials = (name: string, email: string) => {
  const source = name.trim() || email.split('@')[0];
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const value = parts.map((part) => part[0]).join('').toUpperCase();
  return value.slice(0, 2) || '??';
};

const memberName = (member: Member) => member.display_name || member.email.split('@')[0];

const actionIcon = (action: string) => {
  switch (action) {
    case 'member.invited':
      return UserPlus;
    case 'member.invite_revoked':
      return Mail;
    case 'member.joined':
      return Users;
    case 'member.role_changed':
      return ShieldCheck;
    case 'member.removed':
      return UserMinus;
    case 'settings.updated':
      return SettingsIcon;
    case 'password.changed':
      return KeyRound;
    case 'share.created':
      return Share2;
    case 'share.revoked':
      return Share2;
    default:
      return Activity;
  }
};

const TeamPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = user?.role === 'admin';

  const [tab, setTab] = useState<TabKey>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('viewer');
  const [inviting, setInviting] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<Invite | null>(null);

  const [confirm, setConfirm] = useState<{ kind: 'member' | 'invite'; id: string; label: string } | null>(null);
  const [auditSearch, setAuditSearch] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const membersRes = await teamAPI.listMembers();
      setMembers(membersRes.data.members);
      if (isAdmin) {
        const [invitesRes, auditRes] = await Promise.all([
          teamAPI.listInvites(),
          teamAPI.listAudit(100),
        ]);
        setInvites(invitesRes.data.invites);
        setEvents(auditRes.data.events);
      }
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Could not load the team.'));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch from the API, not derived state
    void loadAll();
  }, [loadAll]);

  const copyLink = async (url: string) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      dispatch(addToast({ message: 'Invite link copied', type: 'success' }));
    } catch {
      dispatch(addToast({ message: 'Could not copy automatically. Select the link and copy it manually.', type: 'error' }));
    }
  };

  const handleCreateInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inviting) return;
    setInviting(true);
    try {
      const res = await teamAPI.createInvite(inviteEmail.trim(), inviteRole);
      const invite = res.data.invite;
      setInvites((current) => [invite, ...current]);
      setCreatedInvite(invite);
      setInviteEmail('');
      dispatch(addToast({ message: 'Invite created. Copy the link to share it.', type: 'success' }));
    } catch (err) {
      dispatch(addToast({ message: apiErrorMessage(err, 'Could not create the invite.'), type: 'error' }));
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (member: Member, role: TeamRole) => {
    setBusyId(member.id);
    try {
      const res = await teamAPI.updateRole(member.id, role);
      setMembers((current) => current.map((item) => (item.id === member.id ? res.data : item)));
      dispatch(addToast({ message: `${memberName(member)} is now ${ROLE_LABEL[role].toLowerCase()}`, type: 'success' }));
    } catch (err) {
      dispatch(addToast({ message: apiErrorMessage(err, 'Could not change the role.'), type: 'error' }));
    } finally {
      setBusyId('');
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    setBusyId(confirm.id);
    try {
      if (confirm.kind === 'member') {
        await teamAPI.removeMember(confirm.id);
        setMembers((current) => current.filter((member) => member.id !== confirm.id));
        dispatch(addToast({ message: 'Member removed', type: 'success' }));
      } else {
        await teamAPI.revokeInvite(confirm.id);
        setInvites((current) => current.filter((invite) => invite.id !== confirm.id));
        if (createdInvite?.id === confirm.id) setCreatedInvite(null);
        dispatch(addToast({ message: 'Invite revoked', type: 'success' }));
      }
      setConfirm(null);
    } catch (err) {
      dispatch(addToast({ message: apiErrorMessage(err, 'Could not complete that action.'), type: 'error' }));
    } finally {
      setBusyId('');
    }
  };

  const filteredEvents = useMemo(() => {
    const term = auditSearch.trim().toLowerCase();
    if (!term) return events;
    return events.filter((event) =>
      [auditActionLabel(event.action), event.actor_email, event.target_name, event.action]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [events, auditSearch]);

  const tabs: { key: TabKey; label: string; icon: typeof Users; count?: number }[] = [
    { key: 'members', label: 'Members', icon: Users, count: members.length },
    ...(isAdmin
      ? ([
          { key: 'invites', label: 'Invites', icon: Mail, count: invites.length },
          { key: 'activity', label: 'Activity', icon: Activity },
        ] as const)
      : []),
  ];

  return (
    <div className="list-page team-page">
      <div className="list-panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Team</p>
            <h2>People &amp; access</h2>
            <p className="lede">Invite teammates and keep roles and permissions tidy.</p>
          </div>
          {isAdmin && (
            <Button variant="primary" onClick={() => setTab('invites')}>
              <UserPlus size={15} aria-hidden="true" />
              Invite someone
            </Button>
          )}
        </div>

        {loadError && <ErrorState compact title="Could not load the team" description={loadError} onRetry={() => void loadAll()} />}

        {!loadError && (
          <>
            {isAdmin && (
              <div className="team-tabs" role="tablist" aria-label="Team sections">
                {tabs.map(({ key, label, icon: Icon, count }) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    className={tab === key ? 'team-tab team-tab--active' : 'team-tab'}
                    onClick={() => setTab(key)}
                  >
                    <Icon size={15} aria-hidden="true" />
                    {label}
                    {typeof count === 'number' && <span className="team-tab__count">{count}</span>}
                  </button>
                ))}
              </div>
            )}

            {!isAdmin && (
              <p className="team-note">
                You are viewing the directory. Ask an admin if you need a different role or a new invite.
              </p>
            )}

            {tab === 'members' && (
              <div className="team-section" role="tabpanel" aria-label="Members">
                {loading && <div className="team-skeleton" aria-hidden="true" />}
                {!loading && members.length === 0 && (
                  <div className="team-empty">
                    <Users size={22} aria-hidden="true" />
                    <p>No members yet</p>
                    <span>Invite a teammate to start collaborating.</span>
                  </div>
                )}
                {!loading && members.length > 0 && (
                  <div className="team-table">
                    <div className="team-row team-row--head">
                      <span>Person</span>
                      <span>Role</span>
                      <span>Last active</span>
                      <span className="team-row__actions">Actions</span>
                    </div>
                    {members.map((member) => {
                      const self = member.id === user?.id;
                      return (
                        <div className="team-row" key={member.id}>
                          <div className="team-person">
                            <span className="team-avatar" aria-hidden="true">
                              {initials(member.display_name, member.email)}
                            </span>
                            <span className="team-person__text">
                              <span className="team-person__name">
                                {memberName(member)}
                                {self && <span className="team-self">You</span>}
                              </span>
                              <span className="team-person__email">{member.email}</span>
                            </span>
                          </div>

                          <div className="team-role">
                            {isAdmin ? (
                              <Select
                                aria-label={`Role for ${member.email}`}
                                value={member.role}
                                disabled={busyId === member.id}
                                onChange={(event) => void handleRoleChange(member, event.target.value as TeamRole)}
                              >
                                {(Object.keys(ROLE_LABEL) as TeamRole[]).map((role) => (
                                  <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                                ))}
                              </Select>
                            ) : (
                              <span className={`role-pill role-pill--${member.role}`}>{ROLE_LABEL[member.role]}</span>
                            )}
                            <span className="team-role__hint">{ROLE_HINT[member.role]}</span>
                          </div>

                          <div className="team-activity-cell">
                            <span>{member.last_login_at ? relativeTime(member.last_login_at) : 'Not yet signed in'}</span>
                            <span className="team-activity-cell__meta">Joined {relativeTime(member.created_at)}</span>
                          </div>

                          <div className="team-row__actions">
                            {isAdmin && !self && (
                              <IconButton
                                label={`Remove ${member.email}`}
                                size="sm"
                                disabled={busyId === member.id}
                                onClick={() => setConfirm({ kind: 'member', id: member.id, label: member.email })}
                              >
                                <Trash2 size={15} aria-hidden="true" />
                              </IconButton>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {isAdmin && tab === 'invites' && (
              <div className="team-section" role="tabpanel" aria-label="Invites">
                <form className="invite-form" onSubmit={handleCreateInvite}>
                  <div className="invite-form__fields">
                    <Field label="Email address" required>
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="teammate@example.com"
                        autoComplete="off"
                        required
                      />
                    </Field>
                    <Field label="Role" required>
                      <Select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as TeamRole)}>
                        {(Object.keys(ROLE_LABEL) as TeamRole[]).map((role) => (
                          <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <p className="invite-form__hint">{ROLE_HINT[inviteRole]}</p>
                  <Button type="submit" variant="primary" loading={inviting} disabled={!inviteEmail.trim()}>
                    <UserPlus size={15} aria-hidden="true" />
                    Create invite link
                  </Button>
                </form>

                {createdInvite && (
                  <div className="invite-created" role="status">
                    <div className="invite-created__head">
                      <span>Invite ready for {createdInvite.email}</span>
                      <span className="invite-created__expiry">Expires {relativeTime(createdInvite.expires_at)}</span>
                    </div>
                    <div className="invite-created__link">
                      <Input
                        readOnly
                        value={createdInvite.url}
                        aria-label="New invite link"
                        onFocus={(event) => event.target.select()}
                      />
                      <Button variant="secondary" onClick={() => void copyLink(createdInvite.url)}>
                        <Copy size={14} aria-hidden="true" />
                        Copy link
                      </Button>
                    </div>
                    <p>Links are single-use. Share this one with {createdInvite.email} however you like.</p>
                  </div>
                )}

                <div className="invite-list">
                  <h3>Pending invites</h3>
                  {loading && <div className="team-skeleton" aria-hidden="true" />}
                  {!loading && invites.length === 0 && (
                    <div className="team-empty">
                      <Mail size={22} aria-hidden="true" />
                      <p>No pending invites</p>
                      <span>Create a link above and send it to a teammate.</span>
                    </div>
                  )}
                  {!loading && invites.map((invite) => (
                    <div className="invite-row" key={invite.id}>
                      <div className="invite-row__main">
                        <span className="invite-row__email">{invite.email}</span>
                        <span className="invite-row__meta">
                          {ROLE_LABEL[invite.role]}
                          {invite.invited_by_email ? ` · invited by ${invite.invited_by_email}` : ''}
                        </span>
                      </div>
                      <span className={invite.expired ? 'invite-badge invite-badge--expired' : 'invite-badge'}>
                        {invite.expired ? 'Expired' : `Expires ${relativeTime(invite.expires_at)}`}
                      </span>
                      <div className="invite-row__actions">
                        <IconButton
                          label={`Copy invite link for ${invite.email}`}
                          size="sm"
                          disabled={!invite.url || invite.expired}
                          onClick={() => void copyLink(invite.url)}
                        >
                          <Copy size={15} aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          label={`Revoke invite for ${invite.email}`}
                          size="sm"
                          disabled={busyId === invite.id}
                          onClick={() => setConfirm({ kind: 'invite', id: invite.id, label: invite.email })}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </IconButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isAdmin && tab === 'activity' && (
              <div className="team-section" role="tabpanel" aria-label="Activity">
                <div className="activity-toolbar">
                  <Field label="Filter activity">
                    <Input
                      value={auditSearch}
                      onChange={(event) => setAuditSearch(event.target.value)}
                      placeholder="Search by person or action"
                      aria-label="Filter activity"
                    />
                  </Field>
                  <span className="activity-count">{filteredEvents.length} events</span>
                </div>

                {loading && <div className="team-skeleton" aria-hidden="true" />}
                {!loading && filteredEvents.length === 0 && (
                  <div className="team-empty">
                    <Activity size={22} aria-hidden="true" />
                    <p>No activity yet</p>
                    <span>Invites, role changes, and sharing show up here.</span>
                  </div>
                )}
                {!loading && filteredEvents.length > 0 && (
                  <ul className="activity-list">
                    {filteredEvents.map((event) => {
                      const Icon = actionIcon(event.action);
                      return (
                        <li className="activity-row" key={event.id}>
                          <span className={`activity-icon activity-icon--${event.action.split('.')[0]}`} aria-hidden="true">
                            <Icon size={15} />
                          </span>
                          <span className="activity-text">
                            <span className="activity-title">
                              {auditActionLabel(event.action)}
                              {event.target_name && <strong>{event.target_name}</strong>}
                            </span>
                            <span className="activity-meta">
                              {event.actor_email || 'System'} · {relativeTime(event.created_at)}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === 'member' ? 'Remove this member?' : 'Revoke this invite?'}
        description={
          confirm?.kind === 'member'
            ? `${confirm?.label} will lose access immediately. Their dashboards and queries stay with the organization.`
            : `${confirm?.label} will no longer be able to use this link.`
        }
        confirmLabel={confirm?.kind === 'member' ? 'Remove member' : 'Revoke invite'}
        destructive
        loading={Boolean(confirm && busyId === confirm.id)}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
};

export default TeamPage;
