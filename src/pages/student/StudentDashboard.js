import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import RequestCard, { PriorityBadge } from '../../components/common/RequestCard';
import { useAuth } from '../../context/AuthContext';
import { requestAPI } from '../../utils/api';
import { getSocket, SOCKET_EVENTS } from '../../utils/socket';
import './StudentDashboard.css';

const NAV_ITEMS = [
  { path: '/student', label: 'Dashboard', icon: '🏠', end: true },
  { path: '/student/submit', label: 'Submit Request', icon: '➕' },
  { path: '/student/requests', label: 'My Requests', icon: '📋' },
  { path: '/student/events', label: 'Events', icon: '📅' },
  { path: '/student/policies', label: 'Policies', icon: '📚' },
  { path: '/student/profile', label: 'Profile', icon: '👤' },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshDashboard = async () => {
    try {
      const data = await requestAPI.getStudentDashboard();
      setDashboard(data);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Failed to load your dashboard.');
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      if (user?.email) {
        await refreshDashboard();
      }
      setLoading(false);
    };

    bootstrap();
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) {
      return undefined;
    }

    const socket = getSocket();
    if (!socket) {
      return undefined;
    }

    socket.on(SOCKET_EVENTS.REQUEST_CREATED, refreshDashboard);
    socket.on(SOCKET_EVENTS.REQUEST_UPDATED, refreshDashboard);
    socket.on(SOCKET_EVENTS.DASHBOARD_REFRESH, refreshDashboard);

    return () => {
      socket.off(SOCKET_EVENTS.REQUEST_CREATED, refreshDashboard);
      socket.off(SOCKET_EVENTS.REQUEST_UPDATED, refreshDashboard);
      socket.off(SOCKET_EVENTS.DASHBOARD_REFRESH, refreshDashboard);
    };
  }, [user?.email]);

  const stats = dashboard?.stats || {
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    assigned: 0,
    highPriority: 0,
    overdue: 0,
  };
  const recentRequests = dashboard?.recentRequests || [];
  const categoryBreakdown = dashboard?.categoryBreakdown || [];
  const priorityBreakdown = dashboard?.priorityBreakdown || [];
  const recentActivity = dashboard?.recentActivity || [];

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Here is an overview of your service requests</p>
      </div>

      {error && (
        <div className="alert alert-error animate-fade-up" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card stat-total animate-fade-up">
          <div className="stat-card-icon">📊</div>
          <div className="stat-card-body">
            <div className="stat-card-num">{stats.total}</div>
            <div className="stat-card-label">Total Requests</div>
          </div>
        </div>
        <div className="stat-card stat-pending animate-fade-up" style={{ animationDelay: '0.08s' }}>
          <div className="stat-card-icon">⏳</div>
          <div className="stat-card-body">
            <div className="stat-card-num">{stats.pending}</div>
            <div className="stat-card-label">Pending</div>
          </div>
        </div>
        <div className="stat-card stat-progress animate-fade-up" style={{ animationDelay: '0.12s' }}>
          <div className="stat-card-icon">⚙️</div>
          <div className="stat-card-body">
            <div className="stat-card-num">{stats.inProgress}</div>
            <div className="stat-card-label">In Progress</div>
          </div>
        </div>
        <div className="stat-card stat-resolved animate-fade-up" style={{ animationDelay: '0.16s' }}>
          <div className="stat-card-icon">✅</div>
          <div className="stat-card-body">
            <div className="stat-card-num">{stats.resolved}</div>
            <div className="stat-card-label">Resolved</div>
          </div>
        </div>
      </div>

      <div className="quick-actions animate-fade-up" style={{ animationDelay: '0.2s' }}>
        <Link to="/student/submit" className="quick-action-btn primary-action">
          <span className="qa-icon">➕</span>
          <div>
            <div className="qa-title">Submit New Request</div>
            <div className="qa-sub">IT, Hostel, Academic, Admin</div>
          </div>
        </Link>
        <Link to="/student/events" className="quick-action-btn">
          <span className="qa-icon">📅</span>
          <div>
            <div className="qa-title">Upcoming Events</div>
            <div className="qa-sub">Register for campus activities</div>
          </div>
        </Link>
      </div>

      <div className="stats-grid animate-fade-up" style={{ animationDelay: '0.22s' }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2 className="section-heading">Category Breakdown</h2>
          </div>
          {categoryBreakdown.map((item) => (
            <div key={item.category} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span>{item.category}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2 className="section-heading">Priority Overview</h2>
          </div>
          {priorityBreakdown.map((item) => (
            <div key={item.priority} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <PriorityBadge priority={item.priority} />
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2 className="section-heading">Follow-up Snapshot</h2>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Assigned Requests</span>
              <strong>{stats.assigned}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>High Priority</span>
              <strong>{stats.highPriority}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Overdue (SLA)</span>
              <strong>{stats.overdue}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="recent-activity-grid animate-fade-up" style={{ animationDelay: '0.23s' }}>
        <div className="card recent-activity-card" style={{ padding: 20 }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2 className="section-heading">Recent Activity</h2>
          </div>
          <div className="recent-activity-list">
            {recentActivity.length === 0 ? (
              <div className="req-desc-preview">No recent updates yet.</div>
            ) : (
              recentActivity.map((item, index) => (
                <div key={`${item.requestId}-${index}`} style={{ marginBottom: 12 }}>
                  <div className="req-title">{item.requestId} • {item.type}</div>
                  <div className="req-desc-preview">{item.message}</div>
                  <div className="req-desc-preview">
                    {item.actorName || 'System'} • {new Date(item.createdAt).toLocaleString('en-GB')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: '0.24s' }}>
        <div className="section-header">
          <h2 className="section-heading">Recent Requests</h2>
          <Link to="/student/requests" className="btn btn-ghost btn-sm">View all →</Link>
        </div>

        {loading ? (
          <div className="card">
            <div className="empty-state">
              <div className="spinner" style={{ marginBottom: 16 }} />
              <h3>Loading requests...</h3>
            </div>
          </div>
        ) : recentRequests.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="icon">📭</div>
              <h3>No requests yet</h3>
              <p>Submit your first service request to get started</p>
              <Link to="/student/submit" className="btn btn-primary" style={{ marginTop: 16 }}>Submit Request</Link>
            </div>
          </div>
        ) : (
          <div className="requests-grid">
            {recentRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
