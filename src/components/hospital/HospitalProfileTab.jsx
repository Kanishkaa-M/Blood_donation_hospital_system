import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import './HospitalProfileTab.css'

const FIELDS = [
  { key: 'hospital_name',  label: 'Hospital Name',    type: 'text' },
  { key: 'reg_number',     label: 'Reg. Number',      type: 'text' },
  { key: 'contact_person', label: 'Contact Person',   type: 'text' },
  { key: 'phone',          label: 'Phone',            type: 'tel'  },
  { key: 'address',        label: 'Address',          type: 'text' },
  { key: 'pincode',        label: 'Pincode',          type: 'text' },
  { key: 'city',           label: 'City',             type: 'text' },
  { key: 'state',          label: 'State',            type: 'text' },
]

export default function HospitalProfileTab({ profile, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({ ...profile })
  const [saving, setSaving]   = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('hospitals')
        .update({
          hospital_name:  form.hospital_name,
          reg_number:     form.reg_number,
          contact_person: form.contact_person,
          phone:          form.phone,
          address:        form.address,
          pincode:        form.pincode,
          city:           form.city,
          state:          form.state,
        })
        .eq('id', profile.id)
      if (error) throw error
      toast.success('Profile updated!')
      setEditing(false)
      onUpdate()
    } catch (err) {
      toast.error('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="hprofile fade-up">
      <div className="hprofile-card card">
        <div className="hprofile-top">
          <div className="hprofile-badge-wrap">
            <div className="hprofile-icon">🏥</div>
            <div>
              <h2 className="hprofile-title">{profile?.hospital_name}</h2>
              <span className={`hprofile-verified ${profile?.is_verified ? 'yes' : 'no'}`}>
                {profile?.is_verified ? '✅ Verified' : '⏳ Pending Verification'}
              </span>
            </div>
          </div>
          {!editing && (
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>✏️ Edit</button>
          )}
        </div>

        <div className="hprofile-grid">
          {FIELDS.map(f => (
            <div key={f.key} className="hprofile-field">
              <label className="hprofile-label">{f.label}</label>
              {editing ? (
                <input
                  className="hprofile-input"
                  type={f.type}
                  name={f.key}
                  value={form[f.key] || ''}
                  onChange={handleChange}
                />
              ) : (
                <p className="hprofile-value">{profile?.[f.key] || '—'}</p>
              )}
            </div>
          ))}
        </div>

        {editing && (
          <div className="hprofile-actions">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Saving…' : '💾 Save Changes'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setEditing(false); setForm({ ...profile }) }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
