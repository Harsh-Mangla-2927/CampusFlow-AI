import React, { useState } from 'react';
import { contactAPI } from '../services/api';
import {
  ArrowLeft,
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export default function ContactPage({ onGoLanding, onGoDashboard, user }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [generalError, setGeneralError] = useState('');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '', general: '' }));
    setGeneralError('');
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errs.name = 'Please provide your full name (at least 2 characters).';
    }
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!formData.subject.trim() || formData.subject.trim().length < 2) {
      errs.subject = 'Please specify a subject (at least 2 characters).';
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      errs.message = 'Please write a message of at least 10 characters.';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    setGeneralError('');
    setSuccessMsg('');

    try {
      const res = await contactAPI.send(formData);
      if (res && res.success) {
        setSuccessMsg(res.message || 'Your inquiry has been sent successfully! Our team will respond shortly.');
        setFormData({
          name: user?.name || '',
          email: user?.email || '',
          subject: '',
          message: '',
        });
      } else {
        setGeneralError(res?.message || 'Failed to submit contact message. Please try again.');
      }
    } catch (err) {
      console.error('Contact submission error:', err);
      if (err.errors) {
        setErrors(err.errors);
      } else if (err.message) {
        setGeneralError(err.message);
      } else {
        setGeneralError('Failed to connect to the contact service. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page-shell">
      {/* Top Navigation Bar */}
      <header className="contact-nav">
        <div className="contact-nav-inner">
          <div className="contact-logo" onClick={onGoLanding} role="button" tabIndex={0}>
            <div className="contact-logo-mark">CF</div>
            <span className="contact-logo-text">CampusFlow AI</span>
          </div>

          <div className="contact-nav-links">
            <button className="btn btn-ghost btn-sm" onClick={onGoLanding}>
              <ArrowLeft size={14} style={{ marginRight: 6 }} />
              Back to Home
            </button>
            {user ? (
              <button className="btn btn-primary btn-sm" onClick={onGoDashboard}>
                Go to Dashboard →
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="contact-container">
        <div className="contact-grid">
          {/* Left Column: Brand Statement & Information */}
          <div className="contact-info-col">
            <div className="contact-pill-tag">
              <Sparkles size={12} style={{ color: 'var(--amber)', marginRight: 6 }} />
              Direct Support & Academic Inquiries
            </div>

            <h1 className="contact-hero-title">
              Let's talk about your <span className="accent-highlight">academic flow.</span>
            </h1>

            <p className="contact-hero-desc">
              Have questions regarding priority engine calculations, university curriculum synchronization,
              statutory attendance thresholds, or platform feedback? Reach out directly to our engineering
              team.
            </p>

            {/* Contained Visual Element */}
            <div className="contact-visual-card">
              <img
                src="/thesis-collab.jpg"
                alt="Students collaborating"
                className="contact-visual-img"
              />
              <div className="contact-visual-overlay">
                <span>CAMPUSFLOW AI ENGINEERING · VERIFIED ACADEMIC SUPPORT</span>
              </div>
            </div>

            <div className="contact-meta-cards">
              <div className="contact-meta-card">
                <div className="contact-meta-icon">
                  <Mail size={18} />
                </div>
                <div>
                  <div className="contact-meta-title">Official Inquiries Channel</div>
                  <div className="contact-meta-text">Submissions routed to developer & support queue</div>
                </div>
              </div>

              <div className="contact-meta-card">
                <div className="contact-meta-icon">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="contact-meta-title">Verified Domain Protection</div>
                  <div className="contact-meta-text">Responses sent directly to your registered university email</div>
                </div>
              </div>

              <div className="contact-meta-card">
                <div className="contact-meta-icon">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <div className="contact-meta-title">Active Support Topics</div>
                  <div className="contact-meta-text">Priority scoring heuristics, Attendly cutoff rules, study plan cadences</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Form */}
          <div className="contact-form-col">
            <div className="contact-form-card">
              <div className="contact-form-header">
                <h2>Send Us a Message</h2>
                <p>Fill out the form below and we'll reply to your university email.</p>
              </div>

              {successMsg && (
                <div className="alert alert-success contact-alert" role="alert">
                  <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Message Delivered!</strong>
                    <div>{successMsg}</div>
                  </div>
                </div>
              )}

              {generalError && (
                <div className="alert alert-danger contact-alert" role="alert">
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <div>{generalError}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="contact-form">
                <div className="form-row">
                  <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
                    <label className="form-label" htmlFor="contact-name">
                      Full Name <span className="required">*</span>
                    </label>
                    <input
                      id="contact-name"
                      className={`form-input ${errors.name ? 'input-error' : ''}`}
                      type="text"
                      placeholder="e.g. Harsh Mangla"
                      value={formData.name}
                      onChange={e => handleChange('name', e.target.value)}
                      disabled={loading}
                      required
                    />
                    {errors.name && <div className="field-error">{errors.name}</div>}
                  </div>

                  <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
                    <label className="form-label" htmlFor="contact-email">
                      University Email <span className="required">*</span>
                    </label>
                    <input
                      id="contact-email"
                      className={`form-input ${errors.email ? 'input-error' : ''}`}
                      type="email"
                      placeholder="you@chitkara.edu.in"
                      value={formData.email}
                      onChange={e => handleChange('email', e.target.value)}
                      disabled={loading}
                      required
                    />
                    {errors.email && <div className="field-error">{errors.email}</div>}
                  </div>
                </div>

                <div className={`form-group ${errors.subject ? 'has-error' : ''}`}>
                  <label className="form-label" htmlFor="contact-subject">
                    Subject / Topic <span className="required">*</span>
                  </label>
                  <input
                    id="contact-subject"
                    className={`form-input ${errors.subject ? 'input-error' : ''}`}
                    type="text"
                    placeholder="e.g. Question about Study Planner algorithm"
                    value={formData.subject}
                    onChange={e => handleChange('subject', e.target.value)}
                    disabled={loading}
                    required
                  />
                  {errors.subject && <div className="field-error">{errors.subject}</div>}
                </div>

                <div className={`form-group ${errors.message ? 'has-error' : ''}`}>
                  <label className="form-label" htmlFor="contact-message">
                    Your Message <span className="required">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    className={`form-textarea ${errors.message ? 'input-error' : ''}`}
                    rows={5}
                    placeholder="Describe your inquiry, issue, or feedback in detail..."
                    value={formData.message}
                    onChange={e => handleChange('message', e.target.value)}
                    disabled={loading}
                    required
                  />
                  {errors.message && <div className="field-error">{errors.message}</div>}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full contact-submit-btn"
                  disabled={loading}
                  id="btn-submit-contact"
                >
                  {loading ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Dispatching message…
                    </>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <Send size={15} style={{ marginLeft: 6 }} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
