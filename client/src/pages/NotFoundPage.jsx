import React from 'react';
import { ArrowLeft, Home, Compass, BookOpen, Layers, MessageSquare } from 'lucide-react';

export default function NotFoundPage({ onGoLanding, onGoDashboard, onNavigate, user }) {
  return (
    <div className="notfound-shell">
      <div className="notfound-glow" aria-hidden="true" />
      
      <div className="notfound-content">
        <div className="notfound-badge">
          <span>Error 404 · Unmapped Route</span>
        </div>

        <h1 className="notfound-code">404</h1>

        <h2 className="notfound-title">Page Not Found</h2>

        <p className="notfound-desc">
          The requested URL path was not found on this academic workspace.
          Please check the address or return to your prioritized study dashboard.
        </p>

        <div className="notfound-actions">
          <button className="btn btn-primary btn-lg" onClick={onGoLanding} id="btn-404-home">
            <Home size={16} style={{ marginRight: 8 }} />
            Back to Home
          </button>

          {user && onGoDashboard ? (
            <button className="btn btn-secondary btn-lg" onClick={onGoDashboard} id="btn-404-dashboard">
              <Compass size={16} style={{ marginRight: 8 }} />
              Open Dashboard
            </button>
          ) : (
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => {
                window.location.href = '/contact';
              }}
              id="btn-404-contact"
            >
              <MessageSquare size={16} style={{ marginRight: 8 }} />
              Contact Support
            </button>
          )}
        </div>

        {user && onNavigate ? (
          <div className="notfound-quicklinks">
            <span className="quicklinks-label">Quick Navigation:</span>
            <div className="quicklinks-row">
              <button onClick={() => onNavigate('tasks')} className="quicklink-btn">
                <Layers size={13} style={{ marginRight: 4 }} /> Tasks
              </button>
              <button onClick={() => onNavigate('records')} className="quicklink-btn">
                <BookOpen size={13} style={{ marginRight: 4 }} /> Academic Records
              </button>
              <button onClick={() => onNavigate('exams')} className="quicklink-btn">
                <Compass size={13} style={{ marginRight: 4 }} /> Exams
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
