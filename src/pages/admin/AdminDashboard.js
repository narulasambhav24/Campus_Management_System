import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PriorityBadge, StatusBadge } from '../../components/common/RequestCard';
import { authAPI, requestAPI } from '../../utils/api';
import { getSocket, SOCKET_EVENTS } from '../../utils/socket';
import './AdminDashboard.css';

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: '🏠', end: true },
  { path: '/admin/events', label: 'Events', icon: '📅' },
  { path: '/admin/policies', label: 'Policies', icon: '📚' },
];

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Resolved'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];
const STATUS_FILTERS = ['All', 'Pending', 'In Progress', 'Resolved'];
const CATEGORY_FILTERS = ['All', 'IT', 'Hostel', 'Academic', 'Administration'];

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [admins, setAdmins] = useState([]);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [updatingId, setUpdatingId] = useState(null);
  const [escalationMessage, setEscalationMessage] = useState('');

  const fetchData = async () => {
    const [dashboardData, users] = await Promise.all([
      requestAPI.getAdminDashboard(),
      authAPI.getAllUsers(),
    ]);
    setDashboard(dashboardData);
    setRequests(dashboardData.allRequests || []);
    setAdmins(users.filter((user) => user.role === 'admin'));
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await fetchData();
        setError(null);
      } catch (requestError) {
        setError(requestError.message || 'Failed to load requests');
      }
      setLoading(false);
    };

    bootstrap();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      return undefined;
    }

    const refreshAdminData = async () => {
      try {
        await fetchData();
        setError(null);
      } catch (requestError) {
        setError(requestError.message || 'Failed to refresh dashboard');
      }
    };

    socket.on(SOCKET_EVENTS.REQUEST_CREATED, refreshAdminData);
    socket.on(SOCKET_EVENTS.REQUEST_UPDATED, refreshAdminData);
    socket.on(SOCKET_EVENTS.DASHBOARD_REFRESH, refreshAdminData);

    return () => {
      socket.off(SOCKET_EVENTS.REQUEST_CREATED, refreshAdminData);
      socket.off(SOCKET_EVENTS.REQUEST_UPDATED, refreshAdminData);
      socket.off(SOCKET_EVENTS.DASHBOARD_REFRESH, refreshAdminData);
    };
  }, []);

  const stats = dashboard?.stats || {
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    unassigned: 0,
    highPriority: 0,
    overdue: 0,
    escalated: 0,
  };

  const filtered = useMemo(
    () =>
      requests.filter((request) => {
        const matchStatus = statusFilter === 'All' || request.status === statusFilter;
        const matchCategory = categoryFilter === 'All' || request.category === categoryFilter;
        const query = search.toLowerCase();
        const matchSearch =
          !query ||
          request.title.toLowerCase().includes(query) ||
          request.studentName.toLowerCase().includes(query) ||
          request.id.toLowerCase().includes(query);
        return matchStatus && matchCategory && matchSearch;
      }),
    [requests, statusFilter, categoryFilter, search]
  );

  const handleRequestUpdate = async (id, updates) => {
    setUpdatingId(id);
    try {
      await requestAPI.updateRequest(id, updates);
      await fetchData();
      setNoteDrafts((previous) => ({ ...previous, [id]: '' }));
      setError(null);
    } catch (requestError) {
      setError(requestError.message || 'Failed to update request');
    }
    setUpdatingId(null);
  };

  const handleEscalationSweep = async () => {
    try {
      const response = await requestAPI.runSlaEscalationSweep();
      setEscalationMessage(response.message || 'Escalation sweep completed');
      await fetchData();
      setTimeout(() => setEscalationMessage(''), 3500);
    } catch (requestError) {
      setError(requestError.message || 'Escalation sweep failed');
    }
  };

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Manage student requests, SLA timelines, and assignments.</p>
      </div>

      {error && (
        <div className="alert alert-error animate-fade-up" style={{ marginBottom: 16 }}>
          ❌ {error}
        </div>
      )}

      {escalationMessage && (
        <div className="alert alert-success animate-fade-up" style={{ marginBottom: 16 }}>
          ✅ {escalationMessage}
        </div>
      )}

      <div className="admin-stats-grid animate-fade-up">
        <div className="admin-stat-card total">
          <div className="admin-stat-icon">📊</div>
          <div>
            <div className="admin-stat-num">{stats.total}</div>
            <div className="admin-stat-label">All Requests</div>
          </div>
        </div>
        <div className="admin-stat-card pending">
          <div className="admin-stat-icon">⏳</div>
          <div>
            <div className="admin-stat-num">{stats.pending}</div>
            <div className="admin-stat-label">Pending</div>
          </div>
        </div>
        <div className="admin-stat-card progress">
          <div className="admin-stat-icon">⚙️</div>
          <div>
            <div className="admin-stat-num">{stats.inProgress}</div>
            <div className="admin-stat-label">In Progress</div>
          </div>
        </div>
        <div className="admin-stat-card resolved">
          <div className="admin-stat-icon">✅</div>
          <div>
            <div className="admin-stat-num">{stats.resolved}</div>
            <div className="admin-stat-label">Resolved</div>
          </div>
        </div>
      </div>

      <div className="admin-stats-grid animate-fade-up" style={{ animationDelay: '0.06s' }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Unassigned</span>
              <strong>{stats.unassigned}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>High Priority</span>
              <strong>{stats.highPriority}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Overdue (SLA)</span>
              <strong>{stats.overdue}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Escalated</span>
              <strong>{stats.escalated}</strong>
            </div>
            <button className="btn btn-outline btn-sm" onClick={handleEscalationSweep}>
              Run Escalation Sweep
            </button>
          </div>
        </div>
      </div>

      <div className="card admin-filters animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <input
          className="search-input"
          type="text"
          placeholder="Search by student name, title, or request ID..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="filter-row">
          <div className="filter-group">
            <span className="filter-label">Status:</span>
            <div className="filter-chips">
              {STATUS_FILTERS.map((status) => (
                <button key={status} className={`filter-chip ${statusFilter === status ? 'active' : ''}`} onClick={() => setStatusFilter(status)}>
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">Category:</span>
            <div className="filter-chips">
              {CATEGORY_FILTERS.map((category) => (
                <button key={category} className={`filter-chip ${categoryFilter === category ? 'active' : ''}`} onClick={() => setCategoryFilter(category)}>
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card animate-fade-up" style={{ animationDelay: '0.16s', overflow: 'hidden' }}>
        <div className="table-header-row">
          <span className="table-count">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="spinner" style={{ marginBottom: 16 }} />
            <h3>Loading requests...</h3>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <h3>No requests found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Student Name</th>
                  <th>Category</th>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>SLA</th>
                  <th>Due By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((request) => (
                  <tr key={request.id} className={updatingId === request.id ? 'updating' : ''}>
                    <td><span className="req-id-cell">{request.id}</span></td>
                    <td>{request.studentName}</td>
                    <td><span className="category-chip">{request.category}</span></td>
                    <td>
                      <div className="req-title">{request.title}</div>
                      <div className="req-desc-preview">{request.description.slice(0, 50)}...</div>
                    </td>
                    <td>
                      <div style={{ marginBottom: 8 }}><PriorityBadge priority={request.priority} /></div>
                      <select
                        className="status-select"
                        value={request.priority || 'Medium'}
                        onChange={(event) => handleRequestUpdate(request.id, { priority: event.target.value })}
                        disabled={updatingId === request.id}
                      >
                        {PRIORITY_OPTIONS.map((priority) => (
                          <option key={priority} value={priority}>{priority}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="req-desc-preview" style={{ marginBottom: 8 }}>{request.assignedToName || 'Unassigned'}</div>
                      <select
                        className="status-select"
                        value={request.assignedTo || ''}
                        onChange={(event) => handleRequestUpdate(request.id, { assignedTo: event.target.value })}
                        disabled={updatingId === request.id}
                      >
                        <option value="">Unassigned</option>
                        {admins.map((admin) => (
                          <option key={admin._id} value={admin._id}>{admin.name}</option>
                        ))}
                      </select>
                    </td>
                    <td><StatusBadge status={request.status} /></td>
                    <td>
                      <span className={request.sla?.isBreached ? 'badge badge-pending' : 'badge badge-resolved'}>
                        {request.status === 'Resolved' ? 'Resolved' : request.sla?.isBreached ? 'Breached' : 'On Track'}
                      </span>
                    </td>
                    <td>
                      {request.dueAt
                        ? new Date(request.dueAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <select
                          className="status-select"
                          value={request.status}
                          onChange={(event) => handleRequestUpdate(request.id, { status: event.target.value })}
                          disabled={updatingId === request.id}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <textarea
                          className="search-input"
                          rows={2}
                          placeholder="Add internal update note..."
                          value={noteDrafts[request.id] || ''}
                          onChange={(event) => setNoteDrafts((previous) => ({ ...previous, [request.id]: event.target.value }))}
                        />
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleRequestUpdate(request.id, { note: noteDrafts[request.id] })}
                          disabled={updatingId === request.id || !noteDrafts[request.id]?.trim()}
                        >
                          Save Note
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
