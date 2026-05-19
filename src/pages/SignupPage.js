import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDefaultRoute } from '../utils/auth';
import './AuthPage.css';

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Name is required';
    if (!form.email.trim()) nextErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = 'Enter a valid email';
    if (!form.password) nextErrors.password = 'Password is required';
    else if (form.password.length < 6) nextErrors.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirm) nextErrors.confirm = 'Passwords do not match';
    return nextErrors;
  };

  const handleChange = (event) => {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
    setErrors((previous) => ({ ...previous, [event.target.name]: '' }));
    setApiError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const newUser = await signup(form.name, form.email, form.password);
      navigate(getDefaultRoute(newUser), { replace: true });
    } catch (error) {
      setApiError(error.message || 'Signup failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-content">
          <Link to="/" className="auth-logo">
            <span>🎓</span>
            <span>UniHelp</span>
          </Link>
          <blockquote className="auth-quote">
            "Your one-stop solution for every campus service request."
          </blockquote>
          <div className="auth-decorative">
            <div className="deco-circle c1" />
            <div className="deco-circle c2" />
            <div className="deco-circle c3" />
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container animate-fade-up">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Create student account</h1>
            <p className="auth-form-sub">New accounts are created as student accounts.</p>
          </div>

          {apiError && <div className="alert alert-error">{apiError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className={`form-input ${errors.name ? 'input-error' : ''}`}
                type="text"
                name="name"
                placeholder="Jane Smith"
                value={form.name}
                onChange={handleChange}
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                type="email"
                name="email"
                placeholder="your@email.edu"
                value={form.email}
                onChange={handleChange}
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                type="password"
                name="password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={handleChange}
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                className={`form-input ${errors.confirm ? 'input-error' : ''}`}
                type="password"
                name="confirm"
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={handleChange}
              />
              {errors.confirm && <span className="form-error">{errors.confirm}</span>}
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : 'Create Student Account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
