import React, { useEffect, useState } from 'react';
import { KeyRound, Save, UserRound } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { teamAPI } from '../../api/team';
import { addToast } from '../../store/toastSlice';
import { apiErrorMessage } from '../../utils/apiError';
import type { UserSettings } from '../../types';
import Button from '../../ui/Button';
import ErrorState from '../../ui/ErrorState';
import Field, { Input, Select } from '../../ui/Field';
import '../ui/ListPage.css';
import './SettingsPage.css';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Madrid',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const roleLabel = (role?: string) => {
  if (!role) return 'Member';
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await teamAPI.getSettings();
      setSettings(res.data);
      setDisplayName(res.data.display_name ?? '');
      setTimezone(res.data.timezone || 'UTC');
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Could not load your settings.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch from the API, not derived state
    void loadSettings();
  }, []);

  const handleProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      const res = await teamAPI.updateSettings(displayName.trim(), timezone);
      setSettings(res.data);
      dispatch(addToast({ message: 'Profile saved', type: 'success' }));
    } catch (err) {
      dispatch(addToast({ message: apiErrorMessage(err, 'Could not save your profile.'), type: 'error' }));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    if (newPassword.length < 8) {
      setPasswordError('Use at least 8 characters for your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }
    if (savingPassword) return;
    setSavingPassword(true);
    try {
      await teamAPI.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      dispatch(addToast({ message: 'Password updated', type: 'success' }));
    } catch (err) {
      setPasswordError(apiErrorMessage(err, 'Could not change your password.'));
    } finally {
      setSavingPassword(false);
    }
  };

  const namePreview = displayName.trim() || user?.email.split('@')[0] || 'You';

  return (
    <div className="list-page settings-page">
      <div className="list-panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Account</p>
            <h2>Your settings</h2>
            <p className="lede">Choose how you appear to teammates and keep your account secure.</p>
          </div>
        </div>

        {loadError && (
          <ErrorState
            compact
            title="Could not load your settings"
            description={loadError}
            onRetry={() => void loadSettings()}
          />
        )}

        {!loadError && loading && <div className="settings-skeleton" aria-hidden="true" />}

        {!loadError && !loading && (
          <div className="settings-grid">
            <section className="settings-card" aria-labelledby="profile-heading">
              <div className="settings-card__head">
                <span className="settings-icon" aria-hidden="true"><UserRound size={17} /></span>
                <div>
                  <h3 id="profile-heading">Profile</h3>
                  <p>This is what teammates see in the directory and activity feed.</p>
                </div>
              </div>

              <div className="settings-identity">
                <span className="settings-avatar" aria-hidden="true">
                  {namePreview.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong>{namePreview}</strong>
                  <span>{user?.email}</span>
                </div>
                <span className="settings-role">{roleLabel(user?.role)}</span>
              </div>

              <form className="settings-form" onSubmit={handleProfile}>
                <Field label="Display name" hint="Leave blank to use the first part of your email.">
                  <Input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder={user?.email.split('@')[0]}
                    maxLength={120}
                    autoComplete="name"
                  />
                </Field>
                <Field label="Timezone">
                  <Select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                    {TIMEZONES.map((zone) => (
                      <option key={zone} value={zone}>{zone.replace('_', ' ')}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Email">
                  <Input value={user?.email ?? ''} readOnly />
                </Field>
                <div className="settings-actions">
                  <Button type="submit" variant="primary" loading={savingProfile}>
                    <Save size={15} aria-hidden="true" />
                    Save profile
                  </Button>
                  {settings?.updated_at && (
                    <span className="settings-saved">Last saved {new Date(settings.updated_at).toLocaleDateString()}</span>
                  )}
                </div>
              </form>
            </section>

            <section className="settings-card" aria-labelledby="password-heading">
              <div className="settings-card__head">
                <span className="settings-icon" aria-hidden="true"><KeyRound size={17} /></span>
                <div>
                  <h3 id="password-heading">Password</h3>
                  <p>Use at least 8 characters. You stay signed in after changing it.</p>
                </div>
              </div>

              <form className="settings-form" onSubmit={handlePassword}>
                <Field label="Current password" required>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </Field>
                <Field label="New password" required>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </Field>
                <Field label="Confirm new password" required error={passwordError || undefined}>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </Field>
                <div className="settings-actions">
                  <Button type="submit" variant="primary" loading={savingPassword}>
                    Update password
                  </Button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
