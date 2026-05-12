import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDefaultRoute } from '../utils/auth';
import './AuthPage.css';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '', role: 'student' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = 'Enter a valid email';
    if (!form.password) nextErrors.password = 'Password is required';
    return nextErrors;
  };

  const handleChange = (event) => {
    setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
    setErrors(previous => ({ ...previous, [event.target.name]: '' }));
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
      const loggedInUser = await login(form.email, form.password);
      navigate(getDefaultRoute(loggedInUser), { replace: true });
    } catch (error) {
      setApiError(error.message || 'Login failed. Please try again.');
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
            "Empowering students with fast, transparent campus support."
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
            <h1 className="auth-form-title">Welcome back</h1>
            <p className="auth-form-sub">Sign in to your UniHelp account</p>
          </div>

          {apiError && <div className="alert alert-error">{apiError}</div>}

          <form onSubmit={handleSubmit} noValidate>
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
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Sign in as</label>
              <div className="role-toggle">
                {['student', 'admin'].map(role => (
                  <button
                    key={role}
                    type="button"
                    className={`role-btn ${form.role === role ? 'active' : ''}`}
                    onClick={() => setForm(previous => ({ ...previous, role }))}
                  >
                    {role === 'student' ? '🎓 Student' : '🛠 Admin'}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : 'Sign In'}
            </button>
          </form>

          <div className="auth-demo-hint">
            <strong>Demo accounts:</strong><br />
            Student: demo@student.edu / password123<br />
            Admin: admin@unihelp.edu / admin123
          </div>

          <p className="auth-switch">
            Don't have an account? <Link to="/signup">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
