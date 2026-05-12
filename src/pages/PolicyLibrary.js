import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { policyAPI } from '../utils/api';
import './PolicyLibrary.css';

const STUDENT_NAV_ITEMS = [
  { path: '/student', label: 'Dashboard', icon: '\u{1F3E0}', end: true },
  { path: '/student/submit', label: 'Submit Request', icon: '\u2795' },
  { path: '/student/requests', label: 'My Requests', icon: '\u{1F4CB}' },
  { path: '/student/events', label: 'Events', icon: '\u{1F4C5}' },
  { path: '/student/policies', label: 'Policies', icon: '\u{1F4DA}' },
  { path: '/student/profile', label: 'Profile', icon: '\u{1F464}' },
];

const ADMIN_NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: '\u{1F3E0}', end: true },
  { path: '/admin/events', label: 'Events', icon: '\u{1F4C5}' },
  { path: '/admin/policies', label: 'Policies', icon: '\u{1F4DA}' },
];

const CATEGORY_OPTIONS = ['', 'Hostel', 'Exam', 'Fees', 'Grievance', 'General'];
const INITIAL_FORM = {
  policyCode: '',
  title: '',
  category: 'General',
  summary: '',
  content: '',
  tags: '',
  effectiveDate: '',
  isActive: true,
  changeNote: '',
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

const isPdfCircular = (fileType = '', fileName = '') =>
  fileType === 'application/pdf' || String(fileName).toLowerCase().endsWith('.pdf');

export default function PolicyLibrary() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState('');
  const [selectedFiles, setSelectedFiles] = useState({});
  const [circularTitles, setCircularTitles] = useState({});
  const [uploadingCircularFor, setUploadingCircularFor] = useState('');

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? ADMIN_NAV_ITEMS : STUDENT_NAV_ITEMS;

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const data = await policyAPI.getPolicies({
        category,
        search,
        activeOnly: !isAdmin,
      });
      setPolicies(data);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [search, category, isAdmin]);

  const stats = useMemo(() => {
    const activeCount = policies.filter((policy) => policy.isActive).length;
    const inactiveCount = policies.filter((policy) => !policy.isActive).length;
    const circularCount = policies.reduce((count, policy) => count + (policy.circulars?.length || 0), 0);
    return {
      total: policies.length,
      active: activeCount,
      inactive: inactiveCount,
      circulars: circularCount,
    };
  }, [policies]);

  const handleEdit = (policy) => {
    setEditingPolicyId(policy._id);
    setForm({
      policyCode: policy.policyCode,
      title: policy.title,
      category: policy.category,
      summary: policy.summary || '',
      content: policy.content || '',
      tags: (policy.tags || []).join(', '),
      effectiveDate: policy.effectiveDate ? String(policy.effectiveDate).slice(0, 10) : '',
      isActive: policy.isActive,
      changeNote: '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingPolicyId('');
    setForm(INITIAL_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      tags: form.tags,
      effectiveDate: form.effectiveDate,
      isActive: Boolean(form.isActive),
    };

    try {
      if (editingPolicyId) {
        await policyAPI.updatePolicy(editingPolicyId, payload);
      } else {
        await policyAPI.createPolicy(payload);
      }
      resetForm();
      await fetchPolicies();
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const handleCircularUpload = async (policyId) => {
    const file = selectedFiles[policyId];
    if (!file) {
      setError('Select a file before uploading circular.');
      return;
    }

    setUploadingCircularFor(policyId);
    try {
      await policyAPI.uploadCircular(policyId, file, circularTitles[policyId] || '');
      setSelectedFiles((previous) => ({ ...previous, [policyId]: null }));
      setCircularTitles((previous) => ({ ...previous, [policyId]: '' }));
      await fetchPolicies();
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Failed to upload circular');
    } finally {
      setUploadingCircularFor('');
    }
  };

  return (
    <DashboardLayout navItems={navItems}>
      <div className="policy-hero">
        <div>
          <h1 className="page-title">Policy Library</h1>
          <p className="page-subtitle">Campus norms, version tracking, and circular communications in one place.</p>
        </div>
        <div className="policy-hero-badges">
          <div className="policy-hero-badge">Total: {stats.total}</div>
          <div className="policy-hero-badge">Circulars: {stats.circulars}</div>
        </div>
      </div>

      {error && <div className="alert alert-error">❌ {error}</div>}

      <div className="card policy-filter-card">
        <input
          className="form-input"
          placeholder="Search by code, title, summary, tags..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="form-select" value={category} onChange={(event) => setCategory(event.target.value)}>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option || 'all'} value={option}>
              {option || 'All categories'}
            </option>
          ))}
        </select>
      </div>

      {isAdmin && (
        <>
          <div className="policy-metric-row">
            <div className="card policy-metric-card">
              <div className="policy-metric-title">Active Policies</div>
              <div className="policy-metric-value">{stats.active}</div>
            </div>
            <div className="card policy-metric-card">
              <div className="policy-metric-title">Inactive Policies</div>
              <div className="policy-metric-value">{stats.inactive}</div>
            </div>
            <div className="card policy-metric-card">
              <div className="policy-metric-title">Uploaded Circulars</div>
              <div className="policy-metric-value">{stats.circulars}</div>
            </div>
          </div>

          <form className="card policy-form-card" onSubmit={handleSubmit}>
            <div className="policy-form-title">
              {editingPolicyId ? 'Update Policy Version' : 'Create New Policy'}
            </div>

            <div className="policy-form-grid">
              <input
                className="form-input"
                placeholder="Policy code (e.g. HOSTEL-ENTRY-002)"
                value={form.policyCode}
                disabled={Boolean(editingPolicyId)}
                onChange={(event) => setForm((previous) => ({ ...previous, policyCode: event.target.value }))}
                required
              />
              <input
                className="form-input"
                placeholder="Title"
                value={form.title}
                onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
                required
              />
              <select
                className="form-select"
                value={form.category}
                onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))}
              >
                {CATEGORY_OPTIONS.filter(Boolean).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                className="form-input"
                type="date"
                value={form.effectiveDate}
                onChange={(event) => setForm((previous) => ({ ...previous, effectiveDate: event.target.value }))}
                required
              />
              <input
                className="form-input"
                placeholder="Tags (comma separated)"
                value={form.tags}
                onChange={(event) => setForm((previous) => ({ ...previous, tags: event.target.value }))}
              />
            </div>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Summary"
              value={form.summary}
              onChange={(event) => setForm((previous) => ({ ...previous, summary: event.target.value }))}
            />
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Policy content"
              value={form.content}
              onChange={(event) => setForm((previous) => ({ ...previous, content: event.target.value }))}
              required
            />
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Change note (for update)"
              value={form.changeNote}
              onChange={(event) => setForm((previous) => ({ ...previous, changeNote: event.target.value }))}
            />
            <div className="policy-form-actions">
              <label className="policy-active-toggle">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((previous) => ({ ...previous, isActive: event.target.checked }))}
                />
                Active
              </label>
              <div className="policy-form-button-row">
                {editingPolicyId && (
                  <button type="button" className="btn btn-ghost" onClick={resetForm}>
                    Cancel
                  </button>
                )}
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingPolicyId ? 'Update Version' : 'Publish Policy'}
                </button>
              </div>
            </div>
          </form>
        </>
      )}

      {loading ? (
        <div className="card">
          <div className="empty-state">
            <div className="spinner" style={{ marginBottom: 16 }} />
            <h3>Loading policy library...</h3>
          </div>
        </div>
      ) : policies.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No policy documents found</h3>
          </div>
        </div>
      ) : (
        <div className="policy-grid">
          {policies.map((policy) => (
            <div className="card policy-card" key={policy._id}>
              <div className="policy-header">
                <div className="policy-code">{policy.policyCode}</div>
                <div className="policy-version">v{policy.version}</div>
              </div>

              <h3 className="policy-title">{policy.title}</h3>
              <p className="policy-summary">{policy.summary || 'No summary provided'}</p>

              <div className="policy-meta-grid">
                <div className="policy-meta"><strong>Category:</strong> {policy.category}</div>
                <div className="policy-meta"><strong>Effective:</strong> {formatDate(policy.effectiveDate)}</div>
                <div className="policy-meta"><strong>Status:</strong> {policy.isActive ? 'Active' : 'Inactive'}</div>
                <div className="policy-meta"><strong>Tags:</strong> {(policy.tags || []).join(', ') || 'N/A'}</div>
              </div>

              <div className="policy-content">{policy.content}</div>

              <div className="policy-circular-section">
                <div className="policy-circular-header">
                  <div className="policy-circular-title">Circular Uploads</div>
                  <div className="policy-circular-count">{policy.circulars?.length || 0}</div>
                </div>

                {!policy.circulars?.length ? (
                  <div className="policy-circular-empty">No circular uploaded yet.</div>
                ) : (
                  <div className="policy-circular-list">
                    {policy.circulars.map((circular, index) => (
                      <a
                        key={`${policy._id}-circular-${index}`}
                        href={circular.url}
                        target="_blank"
                        rel="noreferrer"
                        className="policy-circular-item"
                      >
                        <span className="policy-circular-icon">{isPdfCircular(circular.fileType, circular.fileName) ? 'PDF' : 'IMG'}</span>
                        <span className="policy-circular-name">
                          {circular.title || circular.fileName}
                          <small>{' '}({formatDate(circular.uploadedAt)})</small>
                        </span>
                      </a>
                    ))}
                  </div>
                )}

                {isAdmin && (
                  <div className="policy-circular-upload-wrap">
                    <input
                      className="form-input"
                      placeholder="Circular title (optional)"
                      value={circularTitles[policy._id] || ''}
                      onChange={(event) =>
                        setCircularTitles((previous) => ({ ...previous, [policy._id]: event.target.value }))
                      }
                    />
                    <div className="policy-circular-upload-row">
                      <input
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          setSelectedFiles((previous) => ({
                            ...previous,
                            [policy._id]: event.target.files?.[0] || null,
                          }))
                        }
                      />
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleCircularUpload(policy._id)}
                        disabled={!selectedFiles[policy._id] || uploadingCircularFor === policy._id}
                      >
                        {uploadingCircularFor === policy._id ? 'Uploading...' : 'Upload Circular'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="policy-card-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(policy)}>
                    Edit / New Version
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
