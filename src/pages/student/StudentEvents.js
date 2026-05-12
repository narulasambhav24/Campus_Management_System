import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { eventAPI } from '../../utils/api';
import { getSocket, SOCKET_EVENTS } from '../../utils/socket';
import './StudentEvents.css';

const NAV_ITEMS = [
  { path: '/student', label: 'Dashboard', icon: '🏠', end: true },
  { path: '/student/submit', label: 'Submit Request', icon: '➕' },
  { path: '/student/requests', label: 'My Requests', icon: '📋' },
  { path: '/student/events', label: 'Events', icon: '📅' },
  { path: '/student/policies', label: 'Policies', icon: '📚' },
  { path: '/student/profile', label: 'Profile', icon: '👤' },
];

const CATEGORY_OPTIONS = ['', 'academic', 'club', 'placement', 'admin'];

const INITIAL_REGISTRATION_FORM = {
  rollNumber: '',
  department: '',
  year: '',
  phone: '',
};

const isRegistrationClosed = (eventItem) =>
  Boolean(eventItem.registrationDeadline && new Date(eventItem.registrationDeadline).getTime() < Date.now());

const getRegisterButtonLabel = (eventItem, registeringId) => {
  if (eventItem.isRegistered) {
    return 'Registered';
  }

  if (registeringId === eventItem._id) {
    return 'Registering...';
  }

  if (isRegistrationClosed(eventItem)) {
    return 'Deadline Passed';
  }

  if (eventItem.seatsAvailable <= 0) {
    return 'Seats Full';
  }

  return 'Register';
};

export default function StudentEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [registeringId, setRegisteringId] = useState('');
  const [selectedPosterEvent, setSelectedPosterEvent] = useState(null);
  const [registrationEvent, setRegistrationEvent] = useState(null);
  const [registrationForm, setRegistrationForm] = useState(INITIAL_REGISTRATION_FORM);

  const sortEventsByRelevance = (eventList) => {
    const now = Date.now();

    return [...eventList].sort((a, b) => {
      const aTime = new Date(a.startAt).getTime();
      const bTime = new Date(b.startAt).getTime();
      const aUpcoming = aTime >= now;
      const bUpcoming = bTime >= now;

      if (aUpcoming !== bUpcoming) {
        return aUpcoming ? -1 : 1;
      }

      return aUpcoming ? aTime - bTime : bTime - aTime;
    });
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await eventAPI.getEvents({ category, search });
      const sortedEvents = sortEventsByRelevance(data);
      setEvents(sortedEvents);
      setError('');
      return sortedEvents;
    } catch (requestError) {
      setError(requestError.message || 'Failed to load events');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [category, search]);

  useEffect(() => {
    const intervalId = setInterval(fetchEvents, 15000);
    return () => clearInterval(intervalId);
  }, [category, search]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      return undefined;
    }

    socket.on(SOCKET_EVENTS.EVENT_CREATED, fetchEvents);
    socket.on(SOCKET_EVENTS.EVENT_UPDATED, fetchEvents);
    socket.on(SOCKET_EVENTS.EVENT_DELETED, fetchEvents);

    return () => {
      socket.off(SOCKET_EVENTS.EVENT_CREATED, fetchEvents);
      socket.off(SOCKET_EVENTS.EVENT_UPDATED, fetchEvents);
      socket.off(SOCKET_EVENTS.EVENT_DELETED, fetchEvents);
    };
  }, [category, search]);

  const openRegistrationModal = (eventItem) => {
    if (isRegistrationClosed(eventItem)) {
      setError('Registration deadline has passed for this event.');
      return;
    }

    if (eventItem.seatsAvailable <= 0) {
      setError('Event capacity has been reached.');
      return;
    }

    setError('');
    setRegistrationForm(INITIAL_REGISTRATION_FORM);
    setRegistrationEvent(eventItem);
  };

  const closeRegistrationModal = () => {
    setRegistrationEvent(null);
    setRegistrationForm(INITIAL_REGISTRATION_FORM);
  };

  const handleRegister = async (submitEvent) => {
    submitEvent.preventDefault();

    if (!registrationEvent) {
      return;
    }

    setRegisteringId(registrationEvent._id);
    try {
      const refreshedEvents = await eventAPI
        .registerForEvent(registrationEvent._id, registrationForm)
        .then(fetchEvents);

      setError('');

      if (selectedPosterEvent?._id === registrationEvent._id) {
        const latest = refreshedEvents.find((eventItem) => eventItem._id === registrationEvent._id);
        if (latest) {
          setSelectedPosterEvent(latest);
        }
      }

      closeRegistrationModal();
    } catch (requestError) {
      setError(requestError.message || 'Failed to register for event');
    } finally {
      setRegisteringId('');
    }
  };

  const openPosterOverlay = (eventItem) => {
    if (eventItem.poster?.url) {
      setSelectedPosterEvent(eventItem);
    }
  };

  const closePosterOverlay = () => {
    setSelectedPosterEvent(null);
  };

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="page-header">
        <h1 className="page-title">Campus Events</h1>
        <p className="page-subtitle">Upcoming events appear first. Register for academic, club, placement, and administrative events.</p>
      </div>

      {error && <div className="alert alert-error">Error: {error}</div>}

      <div className="card event-filter-card">
        <input
          className="form-input"
          placeholder="Search by title or location..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="form-select" value={category} onChange={(event) => setCategory(event.target.value)}>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option || 'all'} value={option}>
              {option ? option[0].toUpperCase() + option.slice(1) : 'All categories'}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card">
          <div className="empty-state">
            <div className="spinner" style={{ marginBottom: 16 }} />
            <h3>Loading events...</h3>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No upcoming events found</h3>
          </div>
        </div>
      ) : (
        <div className="event-grid">
          {events.map((eventItem) => (
            <div
              key={eventItem._id}
              className={`card event-card ${eventItem.poster?.url ? 'event-card-clickable' : ''}`}
              onClick={() => openPosterOverlay(eventItem)}
              role={eventItem.poster?.url ? 'button' : undefined}
              tabIndex={eventItem.poster?.url ? 0 : undefined}
              onKeyDown={(keyboardEvent) => {
                if (keyboardEvent.key === 'Enter') {
                  openPosterOverlay(eventItem);
                }
              }}
            >
              {eventItem.poster?.url && (
                <img
                  src={eventItem.poster.url}
                  alt={`${eventItem.title} poster`}
                  className="event-poster-image"
                />
              )}
              <div className="event-card-header">
                <div className="event-category">{eventItem.category}</div>
                <div className="event-status">{eventItem.status}</div>
              </div>
              <h3 className="event-title">{eventItem.title}</h3>
              <p className="event-description">{eventItem.description}</p>
              <div className="event-meta">Location: {eventItem.location}</div>
              <div className="event-meta">Starts: {new Date(eventItem.startAt).toLocaleString('en-GB')}</div>
              <div className="event-meta">
                Registered: {eventItem.attendeeCount}/{eventItem.capacity}
              </div>
              <div className={`event-meta ${isRegistrationClosed(eventItem) ? 'event-meta-closed' : ''}`}>
                Deadline: {eventItem.registrationDeadline
                  ? new Date(eventItem.registrationDeadline).toLocaleString('en-GB')
                  : 'No deadline set'}
              </div>
              <div className="event-meta">
                Seats left: {eventItem.seatsAvailable}
              </div>
              <div className="event-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    openRegistrationModal(eventItem);
                  }}
                  disabled={
                    eventItem.isRegistered ||
                    registeringId === eventItem._id ||
                    eventItem.seatsAvailable <= 0 ||
                    isRegistrationClosed(eventItem)
                  }
                >
                  {getRegisterButtonLabel(eventItem, registeringId)}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {registrationEvent && (
        <div className="event-register-overlay" onClick={closeRegistrationModal}>
          <form className="event-register-modal" onSubmit={handleRegister} onClick={(clickEvent) => clickEvent.stopPropagation()}>
            <button className="event-register-close" type="button" onClick={closeRegistrationModal}>X</button>
            <div className="event-register-kicker">Event Registration</div>
            <h2>{registrationEvent.title}</h2>
            <p>Confirm your student details before registering. Name and email are taken from your login session.</p>

            <div className="event-register-grid">
              <label>
                Name
                <input className="form-input" value={user?.name || ''} readOnly />
              </label>
              <label>
                Email
                <input className="form-input" value={user?.email || ''} readOnly />
              </label>
              <label>
                Roll number
                <input
                  className="form-input"
                  value={registrationForm.rollNumber}
                  onChange={(event) => setRegistrationForm((previous) => ({ ...previous, rollNumber: event.target.value }))}
                  placeholder="Example: CSE-2024-041"
                  required
                />
              </label>
              <label>
                Department
                <input
                  className="form-input"
                  value={registrationForm.department}
                  onChange={(event) => setRegistrationForm((previous) => ({ ...previous, department: event.target.value }))}
                  placeholder="Example: Computer Science"
                  required
                />
              </label>
              <label>
                Year
                <select
                  className="form-select"
                  value={registrationForm.year}
                  onChange={(event) => setRegistrationForm((previous) => ({ ...previous, year: event.target.value }))}
                  required
                >
                  <option value="">Select year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                  <option value="5">5th Year</option>
                </select>
              </label>
              <label>
                Phone
                <input
                  className="form-input"
                  value={registrationForm.phone}
                  onChange={(event) => setRegistrationForm((previous) => ({ ...previous, phone: event.target.value }))}
                  placeholder="10-digit mobile number"
                  required
                />
              </label>
            </div>

            <div className="event-register-actions">
              <button className="btn btn-ghost" type="button" onClick={closeRegistrationModal}>
                Cancel
              </button>
              <button className="btn btn-primary" type="submit" disabled={registeringId === registrationEvent._id}>
                {registeringId === registrationEvent._id ? 'Registering...' : 'Submit Registration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedPosterEvent && (
        <div className="event-poster-overlay" onClick={closePosterOverlay}>
          <button className="event-poster-close" onClick={closePosterOverlay}>X</button>
          <div className="event-poster-viewer" onClick={(clickEvent) => clickEvent.stopPropagation()}>
            <img
              src={selectedPosterEvent.poster.url}
              alt={`${selectedPosterEvent.title} poster`}
              className="event-poster-full"
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
