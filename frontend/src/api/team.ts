import client from './client';
import type {
  AcceptInviteRequest,
  AuditEvent,
  AuthResponse,
  Invite,
  InvitePreview,
  Member,
  TeamRole,
  UserSettings,
} from '../types';

export const teamAPI = {
  listMembers: () => client.get<{ members: Member[] }>('/team/members'),
  updateRole: (id: string, role: TeamRole) =>
    client.put<Member>(`/team/members/${id}/role`, { role }),
  removeMember: (id: string) => client.delete(`/team/members/${id}`),

  listInvites: () => client.get<{ invites: Invite[] }>('/team/invites'),
  createInvite: (email: string, role: TeamRole) =>
    client.post<{ invite: Invite }>('/team/invites', { email, role }),
  revokeInvite: (id: string) => client.delete(`/team/invites/${id}`),

  listAudit: (limit = 100) =>
    client.get<{ events: AuditEvent[] }>('/team/audit', { params: { limit } }),

  getSettings: () => client.get<UserSettings>('/me/settings'),
  updateSettings: (display_name: string, timezone: string) =>
    client.put<UserSettings>('/me/settings', { display_name, timezone }),
  changePassword: (current_password: string, new_password: string) =>
    client.post('/me/password', { current_password, new_password }),

  previewInvite: (token: string) =>
    client.get<InvitePreview>(`/invites/${encodeURIComponent(token)}`),
  acceptInvite: (token: string, data: AcceptInviteRequest) =>
    client.post<AuthResponse>(`/invites/${encodeURIComponent(token)}/accept`, data),
};
