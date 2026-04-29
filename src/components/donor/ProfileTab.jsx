import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import './ProfileTab.css'
import './../../pages/Auth.css'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function calculateAge(dob) {
  if (!dob) return '—'
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

function formatDate(dateStr) {
  if (!dateStr) return 'Never donated'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function nextEligibleDate(lastDonated) {
  if (!lastDonated) return null
  const d = new Date(lastDonated)
  d.setMonth(d.getMonth() + 3)
  return d
}

export default function ProfileTab({ profile, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [form, setForm] = useState({
    full_name:    profile?.full_name    || '',
    phone:        profile?.phone        || '',
    pincode:      profile?.pincode      || '',
    city:         profile?.city         || '',
    state:        profile?.state        || '',
    blood_group:  profile?.blood_group  || '',
    last_donated: profile?.last_donated || '',
    gender:       profile?.gender       || '',
    dob:          profile?.dob          || '',
  })

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('donors')
        .update(form)
        .eq('id', profile.id)

      if (error) throw error
      toast.success('Profile updated!')
      setEditing(false)
      onUpdate()
    } catch (err) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function toggleAvailability() {
    setToggling(true)
    try {
      const { error } = await supabase
        .from('donors')
        .update({ is_available: !profile.is_available })
        .eq('id', profile.id)

      if (error) throw error
      toast.success(profile.is_available ? 'You are now marked unavailable' : 'You are now available!')
      onUpdate()
    } catch (err) {
      toast.error('Failed to update availability')
    } finally {
      setToggling(false)
    }
  }

  const eligible = nextEligibleDate(profile?.last_donated)
  const canDonate = !profile?.last_donated || new Date(profile.last_donated) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const daysUntilEligible = eligible ? Math.max(0, Math.ceil((eligible - Date.now()) / (1000 * 60 * 60 * 24))) : 0

  return (
    <div className="profile-tab fade-up">
      {/* Availability Banner */}
      <div className={`availability-banner ${profile?.is_available ? 'avail-on' : 'avail-off'}`}>
        <div className="avail-left">
          <div className="avail-indicator">
            <span className={`avail-dot ${profile?.is_available ? 'dot-green' : 'dot-gray'}`}></span>
            <span className="avail-title">
              {profile?.is_available ? 'You are currently available to donate' : 'You are currently unavailable'}
            </span>
          </div>
          <p className="avail-sub">
            {profile?.is_available
              ? canDonate
                ? 'Hospitals in your area can call you when they need your blood group.'
                : `You can donate again in ${daysUntilEligible} days (3-month cooling period).`
              : 'Toggle on to receive blood donation call alerts from nearby hospitals.'}
          </p>
        </div>
        <button
          className={`btn ${profile?.is_available ? 'btn-ghost' : 'btn-primary'}`}
          onClick={toggleAvailability}
          disabled={toggling}
        >
          {toggling ? 'Updating…' : profile?.is_available ? '⏸ Mark Unavailable' : '✅ Mark Available'}
        </button>
      </div>

      {/* Eligibility Tracker */}
      {profile?.last_donated && (
        <div className={`eligibility-card card ${canDonate ? 'elig-ready' : 'elig-wait'}`}>
          <div className="elig-icon">{canDonate ? '🟢' : '⏳'}</div>
          <div className="elig-body">
            <div className="elig-title">
              {canDonate ? 'You are eligible to donate!' : `Eligible to donate in ${daysUntilEligible} days`}
            </div>
            <div className="elig-dates">
              Last donated: <strong>{formatDate(profile.last_donated)}</strong>
              {!canDonate && (
                <> · Eligible from: <strong>{eligible?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></>
              )}
            </div>
            {!canDonate && (
              <div className="elig-bar-wrap">
                <div className="elig-bar">
                  <div
                    className="elig-bar-fill"
                    style={{ width: `${Math.min(100, ((90 - daysUntilEligible) / 90) * 100)}%` }}
                  />
                </div>
                <span className="elig-bar-label">{90 - daysUntilEligible}/90 days</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="profile-card card">
        <div className="section-header">
          <h2>Personal Information</h2>
          {!editing ? (
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
              ✏️ Edit Profile
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : '✓ Save Changes'}
              </button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="profile-grid">
            <InfoRow icon="👤" label="Full Name"     value={profile?.full_name} />
            <InfoRow icon="🎂" label="Age"           value={`${calculateAge(profile?.dob)} years`} />
            <InfoRow icon="⚧"  label="Gender"        value={profile?.gender} capitalize />
            <InfoRow icon="🩸" label="Blood Group"   value={profile?.blood_group} highlight />
            <InfoRow icon="📱" label="Phone"         value={profile?.phone} />
            <InfoRow icon="📍" label="Pincode"       value={profile?.pincode} />
            <InfoRow icon="🌆" label="City"          value={profile?.city} />
            <InfoRow icon="🗺️" label="State"         value={profile?.state} />
            <InfoRow icon="💉" label="Last Donated"  value={formatDate(profile?.last_donated)} />
          </div>
        ) : (
          <div className="edit-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" name="full_name" value={form.full_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" name="phone" value={form.phone} onChange={handleChange} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input className="form-input" type="date" name="dob" value={form.dob} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-select" name="gender" value={form.gender} onChange={handleChange}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select className="form-select" name="blood_group" value={form.blood_group} onChange={handleChange}>
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Pincode</label>
                <input className="form-input" name="pincode" value={form.pincode} onChange={handleChange} maxLength={6} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" name="city" value={form.city} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" name="state" value={form.state} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Last Blood Donated Date</label>
              <input className="form-input" type="date" name="last_donated" value={form.last_donated} onChange={handleChange} />
            </div>
          </div>
        )}
      </div>

      {/* Donor Tips */}
      <div className="tips-grid">
        {[
          { icon: '💧', title: 'Stay Hydrated', tip: 'Drink at least 2 extra glasses of water before donating.' },
          { icon: '🍎', title: 'Eat Well', tip: 'Have a healthy, iron-rich meal before your donation.' },
          { icon: '😴', title: 'Rest Well', tip: 'Get a good night s sleep before donation day.' },
          { icon: '⏰', title: '3-Month Rule', tip: 'Wait at least 90 days between whole blood donations.' },
        ].map(t => (
          <div key={t.title} className="tip-card card">
            <div className="tip-icon">{t.icon}</div>
            <div className="tip-title">{t.title}</div>
            <div className="tip-text">{t.tip}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, highlight, capitalize }) {
  return (
    <div className="info-row">
      <span className="info-icon">{icon}</span>
      <span className="info-label">{label}</span>
      <span className={`info-value ${highlight ? 'info-highlight' : ''} ${capitalize ? 'info-cap' : ''}`}>
        {value || '—'}
      </span>
    </div>
  )
}
