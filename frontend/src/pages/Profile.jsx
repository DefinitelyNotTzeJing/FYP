import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

function getDateValue(dateString) {
  if (!dateString) {
    return '';
  }

  return String(dateString).slice(0, 10);
}

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [profileForm, setProfileForm] = useState({
    username: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    address: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });
  const [profileStatus, setProfileStatus] = useState({ type: '', message: '' });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setProfileForm({
      username: user?.username || '',
      phone: user?.profile?.phone || '',
      gender: user?.profile?.gender || '',
      date_of_birth: getDateValue(user?.profile?.date_of_birth),
      address: user?.profile?.address || '',
    });
  }, [user]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileStatus({ type: '', message: '' });

    const result = await updateProfile(profileForm);

    setProfileStatus({
      type: result.success ? 'success' : 'error',
      message: result.message,
    });
    setSavingProfile(false);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordStatus({ type: '', message: '' });

    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      setPasswordStatus({
        type: 'error',
        message: 'New password and confirmation do not match.',
      });
      return;
    }

    setChangingPassword(true);
    const result = await changePassword(passwordForm);

    setPasswordStatus({
      type: result.success ? 'success' : 'error',
      message: result.message,
    });

    if (result.success) {
      setPasswordForm({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      });
    }

    setChangingPassword(false);
  };

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="container profile-hero-content">
          <div>
            <p className="profile-eyebrow">Account Center</p>
            <h1>Manage your profile, delivery details, and password.</h1>
            <p className="profile-subtitle">
              This page is now connected to `/api/user` and `/api/password`.
            </p>
          </div>
          <div className="profile-summary-card">
            <p className="profile-summary-label">Signed in as</p>
            <h2>{user?.displayName || user?.username || 'Reader'}</h2>
            <p>{user?.email}</p>
            <span className="profile-role-badge">
              {user?.isAdmin ? 'Admin account' : 'Reader account'}
            </span>
          </div>
        </div>
      </section>

      <section className="profile-section">
        <div className="container profile-grid">
          <div className="card profile-card">
            <div className="section-title-row">
              <div>
                <h2>Profile Details</h2>
                <p>Update the information stored with your account.</p>
              </div>
            </div>

            {profileStatus.message ? (
              <div className={`alert ${profileStatus.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                {profileStatus.message}
              </div>
            ) : null}

            <form onSubmit={handleProfileSubmit}>
              <div className="profile-form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="username">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    className="form-input"
                    value={profileForm.username}
                    onChange={handleProfileChange}
                    minLength={3}
                    maxLength={50}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="email">
                    Email
                  </label>
                  <input id="email" className="form-input" value={user?.email || ''} disabled />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="phone">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    className="form-input"
                    value={profileForm.phone}
                    onChange={handleProfileChange}
                    placeholder="0123456789"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="gender">
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    className="form-select"
                    value={profileForm.gender}
                    onChange={handleProfileChange}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="date_of_birth">
                    Date of Birth
                  </label>
                  <input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    className="form-input"
                    value={profileForm.date_of_birth}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="form-group profile-address-group">
                  <label className="form-label" htmlFor="address">
                    Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    className="form-textarea"
                    value={profileForm.address}
                    onChange={handleProfileChange}
                    placeholder="Enter your shipping address"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                {savingProfile ? 'Saving profile...' : 'Save Profile'}
              </button>
            </form>
          </div>

          <div className="card profile-card">
            <div className="section-title-row">
              <div>
                <h2>Change Password</h2>
                <p>Use your current password before setting a new one.</p>
              </div>
            </div>

            {passwordStatus.message ? (
              <div className={`alert ${passwordStatus.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                {passwordStatus.message}
              </div>
            ) : null}

            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="current_password">
                  Current Password
                </label>
                <input
                  id="current_password"
                  name="current_password"
                  type="password"
                  className="form-input"
                  value={passwordForm.current_password}
                  onChange={handlePasswordChange}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new_password">
                  New Password
                </label>
                <input
                  id="new_password"
                  name="new_password"
                  type="password"
                  className="form-input"
                  value={passwordForm.new_password}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new_password_confirmation">
                  Confirm New Password
                </label>
                <input
                  id="new_password_confirmation"
                  name="new_password_confirmation"
                  type="password"
                  className="form-input"
                  value={passwordForm.new_password_confirmation}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <button type="submit" className="btn btn-secondary" disabled={changingPassword}>
                {changingPassword ? 'Updating password...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Profile;
