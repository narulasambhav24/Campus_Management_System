import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PriorityBadge, StatusBadge } from '../../components/common/RequestCard';
import { requestAPI } from '../../utils/api';
import './RequestDetail.css';

const NAV_ITEMS = [
  { path: '/student', label: 'Dashboard', icon: '🏠', end: true },
  { path: '/student/submit', label: 'Submit Request', icon: '➕' },
  { path: '/student/requests', label: 'My Requests', icon: '📋' },
  { path: '/student/events', label: 'Events', icon: '📅' },
  { path: '/student/policies', label: 'Policies', icon: '📚' },
  { path: '/student/profile', label: 'Profile', icon: '👤' },
];

const isImageAttachment = (fileType = '') => fileType.startsWith('image/');

export default function RequestDetail() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRequest = async () => {
      setLoading(true);
      try {
        const data = await requestAPI.getRequestById(id);
        setRequest(data);
        setError('');
      } catch (requestError) {
        setError(requestError.message || 'Failed to load request details.');
      }
      setLoading(false);
    };

    if (id) {
      fetchRequest();
    }
  }, [id]);

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="page-header">
        <h1 className="page-title">Request Details</h1>
        <p className="page-subtitle">Review updates, assignment trail, and SLA timeline.</p>
      </div>

      <div className="request-detail-back">
        <Link to="/student/requests" className="btn btn-ghost btn-sm">← Back to My Requests</Link>
      </div>

      {loading ? (
        <div className="card request-detail-card">
          <div className="empty-state">
            <div className="spinner" style={{ marginBottom: 16 }} />
            <h3>Loading request details...</h3>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-error">❌ {error}</div>
      ) : !request ? (
        <div className="card request-detail-card">
          <div className="empty-state">
            <h3>Request not found</h3>
          </div>
        </div>
      ) : (
        <>
          <div className="card request-detail-card">
            <div className="request-detail-grid">
              <div>
                <div className="request-detail-label">Request ID</div>
                <div className="request-detail-value">{request.id}</div>
              </div>
              <div>
                <div className="request-detail-label">Category</div>
                <div className="request-detail-value">{request.category}</div>
              </div>
              <div>
                <div className="request-detail-label">Priority</div>
                <div className="request-detail-value"><PriorityBadge priority={request.priority} /></div>
              </div>
              <div>
                <div className="request-detail-label">Status</div>
                <div className="request-detail-value"><StatusBadge status={request.status} /></div>
              </div>
              <div>
                <div className="request-detail-label">SLA Due</div>
                <div className="request-detail-value">
                  {request.dueAt ? new Date(request.dueAt).toLocaleString('en-GB') : '—'}
                </div>
              </div>
              <div>
                <div className="request-detail-label">Escalation</div>
                <div className="request-detail-value">
                  {request.escalated ? `Yes (Level ${request.escalationLevel})` : 'No'}
                </div>
              </div>
            </div>
            <div className="request-detail-block">
              <div className="request-detail-label">Title</div>
              <div className="request-detail-value">{request.title}</div>
            </div>
            <div className="request-detail-block">
              <div className="request-detail-label">Description</div>
              <div className="request-detail-value">{request.description}</div>
            </div>
          </div>

          <div className="card request-detail-card">
            <h3 className="section-heading" style={{ marginBottom: 12 }}>Attachments</h3>
            {!request.attachments?.length ? (
              <div className="req-desc-preview">No attachments uploaded for this request.</div>
            ) : (
              <div className="request-attachment-list">
                {request.attachments.map((attachment) => (
                  <a
                    key={attachment.publicId}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="request-attachment-item"
                  >
                    {isImageAttachment(attachment.fileType) ? '🖼️' : '📄'} {attachment.fileName}
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
