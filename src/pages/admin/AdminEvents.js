import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { eventAPI } from '../../utils/api';
import { getSocket, SOCKET_EVENTS } from '../../utils/socket';
import './AdminEvents.css';

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: '🏠', end: true },
  { path: '/admin/events', label: 'Events', icon: '📅' },
  { path: '/admin/policies', label: 'Policies', icon: '📚' },
];

const INITIAL_FORM = {
  title: '',
  description: '',
  category: 'academic',
  location: '',
  startAt: '',
  endAt: '',
  registrationDeadline: '',
  capacity: 100,
  targetAudience: 'all',
  status: 'Published',
};

const toDateTimeLocal = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const parseDateInput = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingEventId, setEditingEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [posterFiles, setPosterFiles] = useState({});
  const [uploadingPosterFor, setUploadingPosterFor] = useState('');
  const [registrationLogs, setRegistrationLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await eventAPI.getEvents();
      setEvents(data);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrationLogs = async () => {
    setLogsLoading(true);
    try {
      const logs = await eventAPI.getRegistrationLogs();
      setRegistrationLogs(logs);
    } catch (requestError) {
      setError(requestError.message || 'Failed to load registration logs');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchRegistrationLogs();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      return undefined;
    }

    const refreshAdminEvents = () => {
      fetchEvents();
      fetchRegistrationLogs();
    };

    socket.on(SOCKET_EVENTS.EVENT_CREATED, refreshAdminEvents);
    socket.on(SOCKET_EVENTS.EVENT_UPDATED, refreshAdminEvents);
    socket.on(SOCKET_EVENTS.EVENT_DELETED, refreshAdminEvents);

    return () => {
      socket.off(SOCKET_EVENTS.EVENT_CREATED, refreshAdminEvents);
      socket.off(SOCKET_EVENTS.EVENT_UPDATED, refreshAdminEvents);
      socket.off(SOCKET_EVENTS.EVENT_DELETED, refreshAdminEvents);
    };
  }, []);

  const resetForm = () => {
    setEditingEventId('');
    setForm(INITIAL_FORM);
  };

  const buildPayload = () => {
    const payload = {
      ...form,
      startAt: parseDateInput(form.startAt),
      endAt: parseDateInput(form.endAt),
      registrationDeadline: parseDateInput(form.registrationDeadline),
      capacity: Number(form.capacity),
    };

    if (!payload.startAt) {
      throw new Error('Please provide a valid start date and time');
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = buildPayload();

      if (editingEventId) {
        await eventAPI.updateEvent(editingEventId, payload);
      } else {
        await eventAPI.createEvent(payload);
      }

      resetForm();
      await fetchEvents();
      await fetchRegistrationLogs();
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (eventItem) => {
    setEditingEventId(eventItem._id);
    setForm({
      title: eventItem.title || '',
      description: eventItem.description || '',
      category: eventItem.category || 'academic',
      location: eventItem.location || '',
      startAt: toDateTimeLocal(eventItem.startAt),
      endAt: toDateTimeLocal(eventItem.endAt),
      registrationDeadline: toDateTimeLocal(eventItem.registrationDeadline),
      capacity: eventItem.capacity || 100,
      targetAudience: eventItem.targetAudience || 'all',
      status: eventItem.status || 'Published',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (eventItem) => {
    const confirmed = window.confirm(`Delete event "${eventItem.title}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setDeletingId(eventItem._id);
    try {
      await eventAPI.deleteEvent(eventItem._id);
      if (editingEventId === eventItem._id) {
        resetForm();
      }
      await fetchEvents();
      await fetchRegistrationLogs();
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Failed to delete event');
    } finally {
      setDeletingId('');
    }
  };

  const handlePosterUpload = async (eventId) => {
    const selectedFile = posterFiles[eventId];
    if (!selectedFile) {
      setError('Please select a poster image before uploading.');
      return;
    }

    setUploadingPosterFor(eventId);
    try {
      await eventAPI.uploadEventPoster(eventId, selectedFile);
      setPosterFiles((previous) => ({ ...previous, [eventId]: null }));
      await fetchEvents();
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Failed to upload poster');
    } finally {
      setUploadingPosterFor('');
    }
  };

  const handleExport = async (eventItem) => {
    try {
      const blob = await eventAPI.exportAttendance(eventItem._id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${eventItem.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-attendance.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message || 'Failed to export attendance');
    }
  };

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="page-header">
        <h1 className="page-title">Event Management</h1>
        <p className="page-subtitle">Create, edit, delete, and manage campus events.</p>
      </div>

      {error && <div className="alert alert-error">❌ {error}</div>}

      <form className="card admin-event-form" onSubmit={handleSubmit}>
        <div className="admin-event-form-heading">
          {editingEventId ? 'Modify Event' : 'Create Event'}
        </div>
        <div className="admin-event-grid">
          <input
            className="form-input"
            placeholder="Event title"
            value={form.title}
            onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
            required
          />
          <select
            className="form-select"
            value={form.category}
            onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))}
          >
            <option value="academic">Academic</option>
            <option value="club">Club</option>
            <option value="placement">Placement</option>
            <option value="admin">Admin</option>
          </select>
          <input
            className="form-input"
            placeholder="Location"
            value={form.location}
            onChange={(event) => setForm((previous) => ({ ...previous, location: event.target.value }))}
            required
          />
          <label className="admin-event-field">
            Start date and time
            <input
              className="form-input"
              type="datetime-local"
              value={form.startAt}
              onChange={(event) => setForm((previous) => ({ ...previous, startAt: event.target.value }))}
              required
            />
          </label>
          <label className="admin-event-field">
            End date and time
            <input
              className="form-input"
              type="datetime-local"
              value={form.endAt}
              onChange={(event) => setForm((previous) => ({ ...previous, endAt: event.target.value }))}
            />
          </label>
          <label className="admin-event-field">
            Registration closes at
            <input
              className="form-input"
              type="datetime-local"
              value={form.registrationDeadline}
              onChange={(event) => setForm((previous) => ({ ...previous, registrationDeadline: event.target.value }))}
            />
          </label>
          <label className="admin-event-field">
            Seats / capacity
            <input
              className="form-input"
              type="number"
              min={1}
              value={form.capacity}
              onChange={(event) => setForm((previous) => ({ ...previous, capacity: Number(event.target.value) }))}
            />
          </label>
          <select
            className="form-select"
            value={form.targetAudience}
            onChange={(event) => setForm((previous) => ({ ...previous, targetAudience: event.target.value }))}
          >
            <option value="all">All users</option>
            <option value="students">Students only</option>
            <option value="admins">Admins only</option>
          </select>
          <select
            className="form-select"
            value={form.status}
            onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))}
          >
            <option value="Published">Published</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <textarea
          className="form-textarea"
          placeholder="Event description"
          value={form.description}
          onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
          rows={4}
          required
        />
        <div className="admin-event-form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingEventId ? 'Update Event' : 'Create Event'}
          </button>
          {editingEventId && (
            <button className="btn btn-ghost" type="button" onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <div className="card">
          <div className="empty-state">
            <div className="spinner" style={{ marginBottom: 16 }} />
            <h3>Loading events...</h3>
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Poster</th>
                <th>Title</th>
                <th>Category</th>
                <th>When</th>
                <th>Deadline</th>
                <th>Registrations</th>
                <th>Poster Upload</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((eventItem) => (
                <tr key={eventItem._id}>
                  <td>
                    {eventItem.poster?.url ? (
                      <img src={eventItem.poster.url} alt={`${eventItem.title} poster`} className="event-poster-thumb" />
                    ) : (
                      <span className="event-poster-empty">No Poster</span>
                    )}
                  </td>
                  <td>
                    <strong>{eventItem.title}</strong>
                    <div style={{ fontSize: '0.82rem', color: '#6b7491' }}>{eventItem.location}</div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{eventItem.category}</td>
                  <td>{new Date(eventItem.startAt).toLocaleString('en-GB')}</td>
                  <td>
                    {eventItem.registrationDeadline
                      ? new Date(eventItem.registrationDeadline).toLocaleString('en-GB')
                      : 'No deadline'}
                  </td>
                  <td>{eventItem.attendeeCount}/{eventItem.capacity}</td>
                  <td>
                    <div className="event-poster-upload">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={(fileEvent) =>
                          setPosterFiles((previous) => ({
                            ...previous,
                            [eventItem._id]: fileEvent.target.files?.[0] || null,
                          }))
                        }
                      />
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handlePosterUpload(eventItem._id)}
                        disabled={!posterFiles[eventItem._id] || uploadingPosterFor === eventItem._id}
                      >
                        {uploadingPosterFor === eventItem._id ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="admin-event-row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(eventItem)}>
                        Edit
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleExport(eventItem)}>
                        Export CSV
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(eventItem)}
                        disabled={deletingId === eventItem._id}
                      >
                        {deletingId === eventItem._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card admin-registration-log-card">
        <div className="admin-log-header">
          <div>
            <h2>Registration Attempt Logs</h2>
            <p>Latest successful and failed student event registration attempts.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchRegistrationLogs} disabled={logsLoading}>
            {logsLoading ? 'Refreshing...' : 'Refresh Logs'}
          </button>
        </div>
        <div className="admin-log-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Event</th>
                <th>Student</th>
                <th>Roll / Dept / Year</th>
                <th>Phone</th>
                <th>Reason</th>
                <th>IP</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {registrationLogs.length === 0 ? (
                <tr>
                  <td colSpan="8">No registration logs yet.</td>
                </tr>
              ) : (
                registrationLogs.slice(0, 20).map((log) => (
                  <tr key={log._id}>
                    <td>
                      <span className={`admin-log-status admin-log-status-${log.status}`}>
                        {log.status}
                      </span>
                    </td>
                    <td>{log.eventTitle || log.eventId}</td>
                    <td>
                      <strong>{log.name || 'Unknown'}</strong>
                      <div className="admin-log-muted">{log.email}</div>
                    </td>
                    <td>
                      {log.rollNumber || '-'}
                      <div className="admin-log-muted">
                        {[log.department, log.year ? `Year ${log.year}` : ''].filter(Boolean).join(' / ')}
                      </div>
                    </td>
                    <td>{log.phone || '-'}</td>
                    <td>{log.reason}</td>
                    <td>{log.ipAddress || '-'}</td>
                    <td>{log.createdAt ? new Date(log.createdAt).toLocaleString('en-GB') : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
