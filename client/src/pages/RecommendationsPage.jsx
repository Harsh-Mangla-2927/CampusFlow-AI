import React, { useState, useEffect } from 'react';
import { intelligenceAPI } from '../services/api';
import { LoadingState, ErrorState, EmptyState } from '../components/SharedComponents';
import { RefreshCw, Target, AlertTriangle, Zap, Info } from 'lucide-react';

const PRIORITY_ICON = { HIGH: AlertTriangle, MEDIUM: Zap, LOW: Target };

function RecommendationsPage() {
  const [recs, setRecs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await intelligenceAPI.getRecommendations();
      setRecs(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState message="Generating recommendations…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const high   = recs.filter(r => r.priority === 'HIGH');
  const medium = recs.filter(r => r.priority === 'MEDIUM');
  const low    = recs.filter(r => r.priority === 'LOW');

  const RecGroup = ({ title, items, priorityClass, num }) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 'var(--s10)' }}>
        {/* Section heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)', marginBottom: 'var(--s5)', paddingBottom: 'var(--s4)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, color: 'var(--fg-faint)', letterSpacing: '-0.02em' }}>{num}</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--fg-primary)', lineHeight: 1 }}>
              {title}
            </div>
          </div>
          <span className={`badge ${priorityClass}`} style={{ marginLeft: 'auto' }}>{items.length} items</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)' }}>
          {items.map((rec, i) => {
            const PIcon = PRIORITY_ICON[rec.priority] || Zap;
            return (
              <div key={i} className="rec-card" style={{
                borderLeft: `3px solid ${rec.priority === 'HIGH' ? 'var(--danger)' : rec.priority === 'MEDIUM' ? 'var(--warning)' : 'var(--success)'}`,
                borderRadius: 0,
              }}>
                <div className="rec-icon" style={{
                  color: rec.priority === 'HIGH' ? 'var(--danger)' : rec.priority === 'MEDIUM' ? 'var(--warning)' : 'var(--success)',
                  borderColor: 'transparent',
                  background: 'transparent',
                }}>
                  <PIcon size={16} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div className="rec-content">
                  <div className="rec-title" style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    {rec.title}
                  </div>
                  <div className="rec-detail" style={{ marginTop: 4, marginBottom: 'var(--s2)' }}>{rec.detail}</div>
                  <span className="badge badge-neutral" style={{ fontSize: 10 }}>{rec.type?.replace(/_/g,' ')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 4,
          }}>
            Explainable Advisory System
          </div>
          <h1>Recommendations</h1>
          <p>Prioritized interventions generated from attendance margins, task delays, and exam proximity.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load} id="btn-refresh-recs" style={{ gap: 6 }}>
          <RefreshCw size={12} strokeWidth={2} aria-hidden="true" />
          <span>Refresh Advisory</span>
        </button>
      </div>

      {/* Summary strip */}
      {recs.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--s8)', marginBottom: 'var(--s10)', paddingBottom: 'var(--s8)', borderBottom: '1px solid var(--border)' }}>
          {[
            { label: 'High Priority', value: high.length, color: 'var(--danger)' },
            { label: 'Medium', value: medium.length, color: 'var(--warning)' },
            { label: 'Low', value: low.length, color: 'var(--success)' },
            { label: 'Total', value: recs.length, color: 'var(--fg-primary)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ paddingRight: 'var(--s8)', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color }}>{value}</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {recs.length === 0 ? (
        <EmptyState icon={<Target size={22} strokeWidth={1.5} />} title="No Recommendations" description="Add tasks, subjects, and exams to generate personalized recommendations from your academic data." />
      ) : (
        <>
          <RecGroup title="High Priority Actions" items={high} priorityClass="badge-high" num="01" />
          <RecGroup title="Medium Priority Actions" items={medium} priorityClass="badge-medium" num="02" />
          <RecGroup title="Low Priority Actions" items={low} priorityClass="badge-low" num="03" />
        </>
      )}

      {/* Intelligence transparency note */}
      <div style={{ marginTop: 'var(--s10)', padding: 'var(--s5) var(--s6)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', background: 'var(--bg-elevated)', display: 'flex', gap: 'var(--s4)', alignItems: 'flex-start' }}>
        <Info size={16} strokeWidth={1.5} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
            About These Recommendations
          </div>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.7, margin: 0 }}>
            CampusFlow AI uses transparent rule-based intelligence. Every recommendation is derived directly from your
            attendance percentages, marks trends, upcoming deadlines, and exam proximity data. No black boxes, no fake AI claims.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RecommendationsPage;
