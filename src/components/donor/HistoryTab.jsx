import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import './HistoryTab.css'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

function monthsAgo(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30))
  if (months === 0) return 'This month'
  if (months === 1) return '1 month ago'
  return `${months} months ago`
}

export default function HistoryTab({ profile }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, units: 0, hospitals: 0 })

  useEffect(() => {
    if (!profile) return
    fetchHistory()
  }, [profile])

  async function fetchHistory() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('donation_history')
        .select(`
          *,
          hospitals (hospital_name, city)
        `)
        .eq('donor_id', profile.id)
        .order('donated_on', { ascending: false })

      if (error) throw error
      const records = data || []
      setHistory(records)
      setStats({
        total: records.length,
        units: records.reduce((acc, r) => acc + (r.units || 1), 0),
        hospitals: new Set(records.map(r => r.hospital_id).filter(Boolean)).size,
      })
    } catch (err) {
      toast.error('Failed to load donation history')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="history-tab fade-up">
      {/* Stats Row */}
      <div className="stats-row">
        <StatCard icon="💉" value={stats.total} label="Total Donations" color="red" />
        <StatCard icon="🩸" value={stats.units} label="Units Donated" color="red" />
        <StatCard icon="🏥" value={stats.hospitals} label="Hospitals Helped" color="dark" />
        <StatCard
          icon="📅"
          value={profile?.last_donated ? monthsAgo(profile.last_donated) : 'Never'}
          label="Last Donation"
          color="dark"
          small
        />
      </div>

      {/* Lives saved estimate */}
      {stats.total > 0 && (
        <div className="lives-banner card">
          <div className="lives-icon">❤️</div>
          <div>
            <div className="lives-title">
              You've potentially saved up to <strong>{stats.units * 3} lives</strong>
            </div>
            <div className="lives-sub">
              Each unit of blood can save up to 3 lives when separated into components.
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="section-header">
        <h2>Donation Timeline</h2>
        <span className="badge badge-gray">{stats.total} records</span>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : history.length === 0 ? (
        <div className="empty-history card">
          <div className="empty-icon">📋</div>
          <h3>No Donations Yet</h3>
          <p>Your donation history will appear here after you respond to a blood request and complete your donation.</p>
        </div>
      ) : (
        <div className="timeline">
          {history.map((record, i) => (
            <div key={record.id} className="timeline-item">
              <div className="tl-connector">
                <div className="tl-dot"></div>
                {i < history.length - 1 && <div className="tl-line"></div>}
              </div>
              <div className="tl-card card">
                <div className="tl-top">
                  <div className="tl-blood">{record.blood_group}</div>
                  <div className="tl-body">
                    <div className="tl-date">{formatDate(record.donated_on)}</div>
                    <div className="tl-hospital">
                      {record.hospitals
                        ? `🏥 ${record.hospitals.hospital_name}, ${record.hospitals.city}`
                        : '🏥 Hospital'}
                    </div>
                    {record.notes && (
                      <div className="tl-notes">📝 {record.notes}</div>
                    )}
                  </div>
                  <div className="tl-right">
                    <span className="badge badge-green">✓ Donated</span>
                    <span className="tl-units">{record.units || 1} unit{record.units > 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Donor certificate prompt */}
      {stats.total >= 1 && (
        <div className="cert-banner card">
          <div style={{ fontSize: '2rem' }}>🏅</div>
          <div>
            <div className="cert-title">BloodLink Hero</div>
            <div className="cert-sub">
              Thank you for being a life saver! You've donated {stats.total} time{stats.total > 1 ? 's' : ''}.
              Keep going — every drop counts.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, value, label, color, small }) {
  return (
    <div className={`stat-card card stat-${color}`}>
      <div className="sc-icon">{icon}</div>
      <div className={`sc-value ${small ? 'sc-small' : ''}`}>{value}</div>
      <div className="sc-label">{label}</div>
    </div>
  )
}
