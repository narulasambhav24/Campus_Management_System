import React from 'react';
import './RequestCard.css';

const statusConfig = {
  'Pending': { className: 'badge-pending', dot: '🟡' },
  'In Progress': { className: 'badge-progress', dot: '🔵' },
  'Resolved': { className: 'badge-resolved', dot: '🟢' },
};

export function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig['Pending'];
  return (
    <span className={`badge ${cfg.className}`}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority = 'Medium' }) {
  const className =
    priority === 'High' ? 'badge-pending'
      : priority === 'Low' ? 'badge-resolved'
        : 'badge-progress';

  return <span className={`badge ${className}`}>{priority}</span>;
}

export default function RequestCard({ request }) {
  const latestUpdate = request.history?.[request.history.length - 1];

  return (
    <div className="request-card">
      <div className="request-card-top">
        <span className="request-id">{request.id}</span>
        <StatusBadge status={request.status} />
      </div>
      <div className="request-card-top" style={{ marginTop: 8 }}>
        <PriorityBadge priority={request.priority} />
        {request.assignedToName && <span className="request-category">Assigned: {request.assignedToName}</span>}
      </div>
      <h3 className="request-card-title">{request.title}</h3>
      <p className="request-card-desc">{request.description}</p>
      {latestUpdate?.message && (
        <p className="request-card-desc" style={{ marginTop: 8 }}>
          Latest update: {latestUpdate.message}
        </p>
      )}
      <div className="request-card-meta">
        <span className="request-category">{request.category}</span>
        <span className="request-date">{new Date(request.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
