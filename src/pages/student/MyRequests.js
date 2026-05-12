import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PriorityBadge, StatusBadge } from '../../components/common/RequestCard';
import { useAuth } from '../../context/AuthContext';
import { requestAPI } from '../../utils/api';
import { getSocket, SOCKET_EVENTS } from '../../utils/socket';
import './MyRequests.css';

const NAV_ITEMS = [
  { path: '/student', label: 'Dashboard', icon: '🏠', end: true },
  { path: '/student/submit', label: 'Submit Request', icon: '➕' },
  { path: '/student/requests', label: 'My Requests', icon: '📋' },
  { path: '/student/events', label: 'Events', icon: '📅' },
  { path: '/student/policies', label: 'Policies', icon: '📚' },
  { path: '/student/profile', label: 'Profile', icon: '👤' },
];

const STATUS_FILTERS = ['All', 'Pending', 'In Progress', 'Resolved'];
const CATEGORY_FILTERS = ['All', 'IT', 'Hostel', 'Academic', 'Administration'];

const getSlaText = (request) => {
  if (request.status === 'Resolved') {
    return 'Resolved';
  }
  if (request.sla?.isBreached) {
    return 'Breached';
  }
  return 'On Track';
};

export default function MyRequests() {
  const { user } = useAuth();
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');

  const refreshRequests = async () => {
    try {
      const data = await requestAPI.getUserRequests(user?.email);
      setMyRequests(data);
      setError(null);
    } catch (requestError) {
      setError(requestError.message || 'Failed to load requests');
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      if (user?.email) {
        await refreshRequests();
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

    socket.on(SOCKET_EVENTS.REQUEST_CREATED, refreshRequests);
    socket.on(SOCKET_EVENTS.REQUEST_UPDATED, refreshRequests);

    return () => {
      socket.off(SOCKET_EVENTS.REQUEST_CREATED, refreshRequests);
      socket.off(SOCKET_EVENTS.REQUEST_UPDATED, refreshRequests);
    };
  }, [user?.email]);

  const filtered = myRequests.filter((request) => {
    const matchStatus = statusFilter === 'All' || request.status === statusFilter;
    const matchCategory = categoryFilter === 'All' || request.category === categoryFilter;
    const query = search.toLowerCase();
    const matchSearch =
      !query ||
      request.title.toLowerCase().includes(query) ||
      request.id.toLowerCase().includes(query);

    return matchStatus && matchCategory && matchSearch;
  });

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="page-header">
        <h1 className="page-title">My Requests</h1>
        <p className="page-subtitle">Track status, SLA timeline, and assignment updates.</p>
      </div>

      <div className="card filters-bar animate-fade-up">
        <input
          className="search-input"
          type="text"
          placeholder="Search by title or request ID..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="filter-group">
          <span className="filter-label">Status:</span>
          <div className="filter-chips">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">Category:</span>
          <div className="filter-chips">
            {CATEGORY_FILTERS.map((category) => (
              <button
                key={category}
                className={`filter-chip ${categoryFilter === category ? 'active' : ''}`}
                onClick={() => setCategoryFilter(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card animate-fade-up" style={{ animationDelay: '0.1s', overflow: 'hidden' }}>
        <div className="table-header-row">
          <span className="table-count">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</span>
          <Link to="/student/submit" className="btn btn-primary btn-sm">+ New Request</Link>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="spinner" style={{ marginBottom: 16 }} />
            <h3>Loading requests...</h3>
          </div>
        ) : error ? (
          <div className="alert alert-error" style={{ margin: 16 }}>
            ❌ {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <h3>No requests found</h3>
            <p>
              {myRequests.length === 0
                ? 'You have not submitted any requests yet.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Category</th>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>SLA</th>
                  <th>Due By</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((request) => (
                  <tr key={request.id}>
                    <td><span className="req-id-cell">{request.id}</span></td>
                    <td><span className="category-chip">{request.category}</span></td>
                    <td>
                      <div className="req-title">{request.title}</div>
                      <div className="req-desc-preview">{request.description.slice(0, 60)}...</div>
                    </td>
                    <td><PriorityBadge priority={request.priority} /></td>
                    <td>{request.assignedToName || 'Unassigned'}</td>
                    <td><StatusBadge status={request.status} /></td>
                    <td>
                      <span className={request.sla?.isBreached ? 'badge badge-pending' : 'badge badge-resolved'}>
                        {getSlaText(request)}
                      </span>
                    </td>
                    <td>
                      {request.dueAt
                        ? new Date(request.dueAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td>
                      <Link to={`/student/requests/${request.id}`} className="btn btn-ghost btn-sm">View</Link>
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
