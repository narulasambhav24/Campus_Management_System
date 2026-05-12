import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const features = [
  { icon: '📋', title: 'Submit Requests', desc: 'Easily raise issues across IT, Hostel, Academic, and Administration categories.' },
  { icon: '📡', title: 'Track Progress', desc: 'Monitor real-time status updates on every request you have submitted.' },
  { icon: '⚡', title: 'Fast Resolution', desc: 'Admin teams review and update requests efficiently through a centralised dashboard.' },
];

const serviceCategories = [
  { icon: '💻', title: 'IT Support', desc: 'Wi-Fi issues, lab systems, login and portal access.' },
  { icon: '🏠', title: 'Hostel', desc: 'Room maintenance, electrical/plumbing, safety concerns.' },
  { icon: '📘', title: 'Academic', desc: 'Timetable clashes, grade review, classroom resources.' },
  { icon: '🏛️', title: 'Administration', desc: 'Certificates, fee receipts, document processing support.' },
];

const workflowSteps = [
  { step: '1', title: 'Create Request', desc: 'Select a category, add details, and submit in under a minute.' },
  { step: '2', title: 'Get Updates', desc: 'Track request status with clear progress stages and timestamps.' },
  { step: '3', title: 'Close with Feedback', desc: 'Mark as resolved and help improve service quality with feedback.' },
];

const quickActions = [
  { title: 'New Service Ticket', desc: 'Start a new complaint or help request.' },
  { title: 'Track Existing Ticket', desc: 'View pending and resolved requests in one place.' },
  { title: 'Student Profile', desc: 'Keep your details updated for faster verification.' },
];

export default function LandingPage() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <span className="logo-icon">🎓</span>
            <span className="logo-text">UniHelp</span>
          </div>
          <div className="landing-nav-links">
            <Link to="/login" className="btn btn-ghost">Log In</Link>
            <Link to="/signup" className="btn btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-bg-shapes">
          <div className="shape shape-1" />
          <div className="shape shape-2" />
          <div className="shape shape-3" />
        </div>
        <div className="hero-content animate-fade-up">
          <div className="hero-tag">Campus Service Portal</div>
          <h1 className="hero-title">
            UniHelp –
            <br />
            <span className="hero-title-accent">Campus Solutions</span>
          </h1>
          <p className="hero-desc">
            A unified platform for students to raise, track, and resolve campus service requests —
            from IT support to hostel maintenance, all in one place.
          </p>
          <div className="hero-cta">
            <Link to="/signup" className="btn btn-gold hero-btn-main">Start Now →</Link>
            <Link to="/login" className="btn btn-outline">Sign In</Link>
          </div>
          <div className="hero-stats">
            <div className="stat"><span className="stat-num">500+</span><span className="stat-label">Students Served</span></div>
            <div className="stat-divider" />
            <div className="stat"><span className="stat-num">98%</span><span className="stat-label">Resolution Rate</span></div>
            <div className="stat-divider" />
            <div className="stat"><span className="stat-num">24h</span><span className="stat-label">Avg. Response Time</span></div>
          </div>
        </div>
        <div className="hero-visual animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <div className="dashboard-preview">
            <div className="preview-header">
              <div className="preview-dots"><span /><span /><span /></div>
              <span className="preview-title-bar">Student Dashboard</span>
            </div>
            <div className="preview-body">
              <div className="preview-cards">
                <div className="preview-card blue">
                  <div className="preview-card-num">12</div>
                  <div className="preview-card-label">Total</div>
                </div>
                <div className="preview-card amber">
                  <div className="preview-card-num">4</div>
                  <div className="preview-card-label">Pending</div>
                </div>
                <div className="preview-card green">
                  <div className="preview-card-num">8</div>
                  <div className="preview-card-label">Resolved</div>
                </div>
              </div>
              <div className="preview-rows">
                {['IT Issue – Wi-Fi outage', 'Hostel – Broken lock', 'Academic – Grade review'].map((title, index) => (
                  <div className="preview-row" key={index}>
                    <span className="preview-row-text">{title}</span>
                    <span className={`preview-pill ${index === 0 ? 'pill-green' : index === 1 ? 'pill-amber' : 'pill-blue'}`}>
                      {index === 0 ? 'Resolved' : index === 1 ? 'Pending' : 'In Progress'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-inner">
          <div className="section-eyebrow">Why UniHelp?</div>
          <h2 className="section-title">Everything you need, nothing you don't</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div className="feature-card animate-fade-up" key={index} style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="categories">
        <div className="categories-inner">
          <div className="section-eyebrow">Service Areas</div>
          <h2 className="section-title">Built for real campus needs</h2>
          <p className="section-subtitle">
            One platform for the most common student support workflows.
          </p>
          <div className="categories-grid">
            {serviceCategories.map((item, index) => (
              <article className="category-card animate-fade-up" key={item.title} style={{ animationDelay: `${index * 0.08}s` }}>
                <div className="category-icon">{item.icon}</div>
                <h3 className="category-title">{item.title}</h3>
                <p className="category-desc">{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="workflow">
        <div className="workflow-inner">
          <div>
            <div className="section-eyebrow">How it works</div>
            <h2 className="section-title workflow-title">Simple process, faster resolutions</h2>
          </div>
          <div className="workflow-steps">
            {workflowSteps.map((item, index) => (
              <div className="workflow-step" key={item.step}>
                <div className="workflow-step-number">{item.step}</div>
                <div>
                  <h3 className="workflow-step-title">{item.title}</h3>
                  <p className="workflow-step-desc">{item.desc}</p>
                </div>
                {index !== workflowSteps.length - 1 ? <div className="workflow-step-line" /> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="quick-start">
        <div className="quick-start-inner">
          <div className="quick-start-card">
            <h3 className="quick-start-title">Quick start for students</h3>
            <p className="quick-start-desc">
              Join now and access all major support actions directly from your dashboard.
            </p>
            <div className="quick-actions-list">
              {quickActions.map((action) => (
                <div className="quick-action" key={action.title}>
                  <div>
                    <h4 className="quick-action-title">{action.title}</h4>
                    <p className="quick-action-desc">{action.desc}</p>
                  </div>
                  <span className="quick-action-arrow">→</span>
                </div>
              ))}
            </div>
            <div className="quick-start-cta">
              <Link to="/signup" className="btn btn-gold">Create Student Account</Link>
              <Link to="/login" className="btn btn-outline">Open Dashboard</Link>
            </div>
          </div>

          <div className="help-card">
            <h3 className="help-card-title">Need help deciding where to post?</h3>
            <p className="help-card-desc">Use the category descriptions while creating a request and our routing system sends it to the right team.</p>
            <ul className="help-list">
              <li>Clear categories with guided request creation.</li>
              <li>Transparent updates from submission to resolution.</li>
              <li>Central history of all your support interactions.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="cta-banner">
        <div className="cta-inner">
          <h2 className="cta-title">Ready to get started?</h2>
          <p className="cta-desc">Join thousands of students already using UniHelp to resolve campus issues faster.</p>
          <Link to="/signup" className="btn btn-gold">Create Free Account</Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <span className="logo-icon">🎓</span>
            <span>UniHelp</span>
          </div>
          <p className="footer-copy">© 2024 UniHelp – Campus Solutions. A student service portal.</p>
        </div>
      </footer>
    </div>
  );
}
