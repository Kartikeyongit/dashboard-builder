/** Human labels for audit actions shared by the team page and home feed. */
export function auditActionLabel(action: string): string {
  switch (action) {
    case 'member.invited':
      return 'Invited a teammate';
    case 'member.invite_revoked':
      return 'Revoked an invite';
    case 'member.joined':
      return 'Joined the team';
    case 'member.role_changed':
      return 'Changed a role';
    case 'member.removed':
      return 'Removed a member';
    case 'settings.updated':
      return 'Updated their profile';
    case 'password.changed':
      return 'Changed their password';
    case 'share.created':
      return 'Created a share link';
    case 'share.revoked':
      return 'Revoked a share link';
    default:
      return action.replace(/[._]/g, ' ');
  }
}
