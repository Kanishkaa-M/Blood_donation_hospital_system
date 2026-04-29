// DonorFoundModal.jsx
// Shown to the hospital in real-time when a donor clicks "I'm Ready to Donate".
// Uses Supabase Realtime to listen for blood_requests status changing to 'fulfilled'.

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import './DonorFoundModal.css'

export default function DonorFoundModal({ hospital }) {
  const [event, setEvent] = useState(null) // { donorName, donorPhone, bloodGroup, requestId }

  useEffect(() => {
    if (!hospital) return

    const channel = supabase
      .channel(`donor-found-hospital-${hospital.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'blood_requests',
        filter: `hospital_id=eq.${hospital.id}`,
      }, async (payload) => {
        const req = payload.new
        if (req.status !== 'fulfilled' || !req.donor_id) return

        // Fetch donor details
        const { data: donor } = await supabase
          .from('donors')
          .select('full_name, phone, blood_group, city')
          .eq('id', req.donor_id)
          .single()

        if (donor) {
          setEvent({
            donorName:  donor.full_name,
            donorPhone: donor.phone,
            bloodGroup: req.blood_group,
            city:       donor.city,
            requestId:  req.id,
            units:      req.units_needed,
          })

          // Browser notification for hospital
          if (Notification.permission === 'granted') {
            new Notification('✅ BloodLink — Donor Found!', {
              body: `${donor.full_name} has confirmed to donate ${req.blood_group} blood.`,
              icon: '/favicon.ico',
            })
          }
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [hospital])

  if (!event) return null

  return (
    <div className="dfm-overlay" onClick={() => setEvent(null)}>
      <div className="dfm-modal" onClick={e => e.stopPropagation()}>
        <div className="dfm-confetti">
          {['🎉','🩸','❤️','✅','🎊'].map((e, i) => (
            <span key={i} className={`dfm-emoji dfm-emoji-${i}`}>{e}</span>
          ))}
        </div>

        <div className="dfm-icon">✅</div>
        <h2 className="dfm-title">Donor Found!</h2>
        <p className="dfm-subtitle">A donor has confirmed to donate blood for your request.</p>

        <div className="dfm-donor-card">
          <div className="dfm-bg-badge">{event.bloodGroup}</div>
          <div className="dfm-donor-info">
            <div className="dfm-donor-name">👤 {event.donorName}</div>
            <div className="dfm-donor-phone">📞 {event.donorPhone}</div>
            <div className="dfm-donor-city">📍 {event.city}</div>
            <div className="dfm-donor-units">💉 {event.units} unit{event.units > 1 ? 's' : ''} needed</div>
          </div>
        </div>

        <p className="dfm-instruction">
          Please contact the donor to confirm their visit. They are on their way!
        </p>

        <button className="btn btn-primary dfm-close-btn" onClick={() => setEvent(null)}>
          Got It 👍
        </button>
      </div>
    </div>
  )
}
