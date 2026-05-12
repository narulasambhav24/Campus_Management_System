import React, { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { requestAPI } from '../../utils/api';
import './SubmitRequest.css';

const NAV_ITEMS = [
  { path: '/student', label: 'Dashboard', icon: '🏠', end: true },
  { path: '/student/submit', label: 'Submit Request', icon: '➕' },
  { path: '/student/requests', label: 'My Requests', icon: '📋' },
  { path: '/student/events', label: 'Events', icon: '📅' },
  { path: '/student/policies', label: 'Policies', icon: '📚' },
  { path: '/student/profile', label: 'Profile', icon: '👤' },
];

const CATEGORIES = [
  { value: '', label: 'Select a category...' },
  { value: 'IT', label: 'IT Support' },
  { value: 'Hostel', label: 'Hostel & Accommodation' },
  { value: 'Academic', label: 'Academic Affairs' },
  { value: 'Administration', label: 'Administration' },
];

export default function SubmitRequest() {
  const { user } = useAuth();
  const [form, setForm] = useState({ category: '', title: '', description: '' });
  const [attachments, setAttachments] = useState([]);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [warning, setWarning] = useState('');
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const validationErrors = {};
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    if (!form.category) validationErrors.category = 'Please select a category';
    if (!form.title.trim()) validationErrors.title = 'Title is required';
    else if (form.title.trim().length < 5) validationErrors.title = 'Title must be at least 5 characters';
    if (!form.description.trim()) validationErrors.description = 'Description is required';
    else if (form.description.trim().length < 20) validationErrors.description = 'Description must be at least 20 characters';
    if (attachments.length > 5) validationErrors.attachments = 'You can upload up to 5 files';
    if (attachments.some((file) => file.size > 5 * 1024 * 1024)) {
      validationErrors.attachments = 'Each file must be 5MB or less';
    }
    if (attachments.some((file) => !allowedTypes.includes(file.type))) {
      validationErrors.attachments = 'Only JPG, PNG, WEBP, and PDF files are allowed';
    }
    return validationErrors;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
    setApiError('');
    setWarning('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await requestAPI.createRequest(
        user.email,
        user.name,
        form.category,
        form.title.trim(),
        form.description.trim()
      );

      const createdRequestId = response?.request?.id;

      if (createdRequestId && attachments.length > 0) {
        try {
          await requestAPI.uploadAttachments(createdRequestId, attachments);
        } catch (attachmentError) {
          setWarning(
            `Request submitted, but attachment upload failed: ${attachmentError.message || 'Please try uploading again later.'}`
          );
        }
      }

      setSuccess(true);
      setForm({ category: '', title: '', description: '' });
      setAttachments([]);
      setApiError('');
      setTimeout(() => setSuccess(false), 4000);
    } catch (requestError) {
      setApiError(requestError.message || 'Failed to submit request. Please try again.');
    }
    setLoading(false);
  };

  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <div className="page-header">
        <h1 className="page-title">Submit a Request</h1>
        <p className="page-subtitle">Describe your issue and our team will get back to you shortly</p>
      </div>

      <div className="submit-layout">
        <div className="submit-form-wrap animate-fade-up">
          {success && (
            <div className="alert alert-success">
              ✅ Your request has been submitted successfully! You can track it in "My Requests".
            </div>
          )}

          {apiError && (
            <div className="alert alert-error">
              ❌ {apiError}
            </div>
          )}

          {warning && (
            <div className="alert" style={{ background: '#fff7e6', color: '#7a4b00', border: '1px solid #ffd591' }}>
              ⚠️ {warning}
            </div>
          )}

          <form className="card submit-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                name="category"
                className={`form-select ${errors.category ? 'input-error' : ''}`}
                value={form.category}
                onChange={handleChange}
              >
                {CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
              {errors.category && <span className="form-error">{errors.category}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Request Title *</label>
              <input
                className={`form-input ${errors.title ? 'input-error' : ''}`}
                type="text"
                name="title"
                placeholder="Brief description of your issue"
                value={form.title}
                onChange={handleChange}
                maxLength={100}
              />
              {errors.title && <span className="form-error">{errors.title}</span>}
              <span className="char-count">{form.title.length}/100</span>
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                className={`form-textarea ${errors.description ? 'input-error' : ''}`}
                name="description"
                placeholder="Provide as much detail as possible to help us resolve your issue quickly..."
                value={form.description}
                onChange={handleChange}
                rows={6}
                maxLength={1000}
              />
              {errors.description && <span className="form-error">{errors.description}</span>}
              <span className="char-count">{form.description.length}/1000</span>
            </div>

            <div className="form-group">
              <label className="form-label">Attachments (optional)</label>
              <input
                className={`form-input ${errors.attachments ? 'input-error' : ''}`}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => {
                  setAttachments(Array.from(event.target.files || []));
                  setErrors((previous) => ({ ...previous, attachments: '' }));
                }}
              />
              {errors.attachments && <span className="form-error">{errors.attachments}</span>}
              <span className="char-count">{attachments.length}/5 files</span>
            </div>

            <div className="submit-form-footer">
              <button type="submit" className="btn btn-primary btn-submit" disabled={loading}>
                {loading ? <><span className="btn-spinner" /> Submitting...</> : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>

        <div className="submit-help animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="card help-card">
            <h3 className="help-title">Tips for a good request</h3>
            <ul className="help-list">
              <li>Be specific about your location or course</li>
              <li>Include dates and times when relevant</li>
              <li>Describe what you have already tried</li>
              <li>Add screenshots or references if helpful</li>
            </ul>
          </div>

          <div className="card help-card">
            <h3 className="help-title">Categories</h3>
            <ul className="category-guide">
              <li><span>IT</span> Computers, Wi-Fi, portals</li>
              <li><span>Hostel</span> Rooms, maintenance, security</li>
              <li><span>Academic</span> Grades, schedules, exams</li>
              <li><span>Admin</span> Documents, fees, ID cards</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
