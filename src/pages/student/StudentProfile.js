import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { requestAPI } from '../../utils/api';
import './StudentProfile.css';

const NAV_ITEMS = [
  { path: '/student', label: 'Dashboard', icon: '🏠', end: true },
  { path: '/student/submit', label: 'Submit Request', icon: '➕' },
  { path: '/student/requests', label: 'My Requests', icon: '📋' },
  { path: '/student/events', label: 'Events', icon: '📅' },
  { path: '/student/policies', label: 'Policies', icon: '📚' },
  { path: '/student/profile', label: 'Profile', icon: '👤' },
];

export default function StudentProfile() {
  const { user } = useAuth();
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const data = await requestAPI.getUserRequests(user?.email);
        setMyRequests(data);
        setError('');
      } catch (requestError) {
        setError(requestError.message || 'Failed to load your request statistics.');
      }
      setLoading(false);
    };

    if (user?.email) {
      fetchRequests();
    } else {
      setLoading(false);
    }
  }, [user?.email]);

  const stats = {
    total: myRequests.length,
    pending: myRequests.filter((request) => request.status === 'Pending').length,
    resolved: myRequests.filter((request) => request.status === 'Resolved').length,
  };

  const handleSave = (event) => {
    event.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account information</p>
      </div>

      {error && (
        <div className="alert alert-error animate-fade-up" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="profile-layout animate-fade-up">
        <div className="profile-sidebar">
          <div className="card profile-card">
            <div className="profile-avatar-lg">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="profile-name">{user?.name}</div>
            <div className="profile-email">{user?.email}</div>
            <div className="profile-role-badge">{user?.role === 'admin' ? 'Administrator' : 'Student'}</div>

            <div className="divider" />

            {loading ? (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <div className="spinner" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: '0.85rem', color: '#6b7491' }}>Loading stats...</div>
              </div>
            ) : (
              <div className="profile-stats-row">
                <div className="pstat">
                  <div className="pstat-num">{stats.total}</div>
                  <div className="pstat-label">Requests</div>
                </div>
                <div className="pstat">
                  <div className="pstat-num">{stats.pending}</div>
                  <div className="pstat-label">Pending</div>
                </div>
                <div className="pstat">
                  <div className="pstat-num">{stats.resolved}</div>
                  <div className="pstat-label">Resolved</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="profile-main">
          <div className="card profile-form-card">
            <h2 className="card-section-title">Account Information</h2>
            {saved && <div className="alert alert-success">Changes saved successfully!</div>}
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" type="text" defaultValue={user?.name} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" defaultValue={user?.email} readOnly />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input className="form-input" type="text" defaultValue={user?.role} readOnly style={{ textTransform: 'capitalize' }} />
              </div>
              <div className="profile-form-footer">
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
