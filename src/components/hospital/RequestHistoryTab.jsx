import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import './RequestHistoryTab.css'

function formatDate(str) {
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function RequestHistoryTab({ hospital }) {
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (hospital) fetchHistory()
  }, [hospital])

  async function fetchHistory() {
    setLoading(true)
    const { data, error } = await supabase
      .from('blood_requests')
      .select(`
        *,
        donors (full_name, phone, blood_group),
        call_logs (id, status, phone, created_at)
      `)
      .eq('hospital_id', hospital.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (!error) setHistory(data || [])
    setLoading(false)
  }

  // Stats
  const total     = history.length
  const fulfilled = history.filter(r => r.status === 'fulfilled').length
  const totalCalls = history.reduce((a, r) => a + (r.call_logs?.length || 0), 0)

  if (loading) return <div className="spinner" style={{ margin: '60px auto' }} />

  return (
    <div className="req-history fade-up">
      {/* Stats Row */}
      <div className="rh-stats">
        <div className="rh-stat card">
          <span className="rh-stat-num">{total}</span>
          <span className="rh-stat-label">Total Requests</span>
        </div>
        <div className="rh-stat card">
          <span className="rh-stat-num" style={{ color: '#28a745' }}>{fulfilled}</span>
          <span className="rh-stat-label">Fulfilled</span>
        </div>
        <div className="rh-stat card">
          <span className="rh-stat-num" style={{ color: '#1a6eb5' }}>{totalCalls}</span>
          <span className="rh-stat-label">Calls Made</span>
        </div>
        <div className="rh-stat card">
          <span className="rh-stat-num" style={{ color: 'var(--red)' }}>
            {total > 0 ? Math.round((fulfilled / total) * 100) : 0}%
          </span>
          <span className="rh-stat-label">Success Rate</span>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="rh-empty card">
          <p>No requests made yet. Go to "Need Blood" to make your first request.</p>
        </div>
      ) : (
        <div className="rh-list">
          {history.map(req => (
            <div key={req.id} className={`rh-card card ${req.status}`}>
              <div className="rh-card-top" onClick={() => setExpanded(expanded === req.id ? null : req.id)}>
                <div className="rh-bg-badge">{req.blood_group}</div>
                <div className="rh-main">
                  <div className="rh-card-meta">
                    <span>📅 {formatDate(req.created_at)}</span>
                    <span>💉 {req.units_needed} unit{req.units_needed > 1 ? 's' : ''}</span>
                    <span>📞 {req.call_logs?.length || 0} call{req.call_logs?.length !== 1 ? 's' : ''}</span>
                  </div>
                  {req.notes && <p className="rh-notes">📝 {req.notes}</p>}
                </div>
                <div className="rh-right">
                  <span className={`rh-status-badge status-${req.status}`}>
                    {req.status === 'pending'   && '⏳ Pending'}
                    {req.status === 'fulfilled' && '✅ Fulfilled'}
                    {req.status === 'cancelled' && '❌ Cancelled'}
                  </span>
                  <span className="rh-expand">{expanded === req.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === req.id && (
                <div className="rh-detail">
                  {req.status === 'fulfilled' && req.donors && (
                    <div className="rh-donor-info">
                      <strong>Donor:</strong> {req.donors.full_name} &nbsp;·&nbsp; 📞 {req.donors.phone}
                    </div>
                  )}
                  {req.call_logs && req.call_logs.length > 0 && (
                    <div className="rh-calls">
                      <p className="rh-calls-title">Call Log:</p>
                      {req.call_logs.map(cl => (
                        <div key={cl.id} className="rh-call-row">
                          <span className={`call-status-dot status-${cl.status}`} />
                          <span className="rh-call-phone">{cl.phone}</span>
                          <span className="rh-call-status">{cl.status}</span>
                          <span className="rh-call-time">{formatDate(cl.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
