import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { showAlreadyClaimedToast } from '../notifications/AlreadyClaimedToast'
import './ActiveRequestsTab.css'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ActiveRequestsTab({ profile, onRespond }) {
  const [requests,    setRequests]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [responding,  setResponding]  = useState(null)
  const [justDonated, setJustDonated] = useState(null) // requestId that this session just confirmed

  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const canDonate = !profile?.last_donated || new Date(profile.last_donated) < threeMonthsAgo

  useEffect(() => {
    if (!profile) return
    fetchRequests()

    // Real-time: update list when requests change (e.g. another donor claims one)
    const channel = supabase
      .channel('active_requests_tab_m4')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'blood_requests',
      }, (payload) => {
        const updated = payload.new
        // If a request just got fulfilled by someone else, show notification and remove from list
        if (updated.status === 'fulfilled' && updated.donor_id) {
          setRequests(prev => {
            const wasInList = prev.some(r => r.id === updated.id)
            if (wasInList && responding !== updated.id) {
              // Another donor grabbed it
              showAlreadyClaimedToast(updated.blood_group)
            }
            return prev.filter(r => r.id !== updated.id)
          })
        }
        // If cancelled, remove silently
        if (updated.status === 'cancelled') {
          setRequests(prev => prev.filter(r => r.id !== updated.id))
        }
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'blood_requests',
      }, () => fetchRequests()) // New request came in
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile])

  async function fetchRequests() {
    if (!profile) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('blood_requests')
        .select(`*, hospitals (hospital_name, address, city, phone)`)
        .eq('blood_group', profile.blood_group)
        .eq('pincode', profile.pincode)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch (err) {
      toast.error('Failed to load blood requests')
    } finally {
      setLoading(false)
    }
  }

  async function handleReady(request) {
    if (!canDonate) {
      toast.error('You are not eligible to donate yet (3-month cooling period)')
      return
    }
    if (!profile.is_available) {
      toast.error('Please mark yourself as available first in My Profile')
      return
    }

    setResponding(request.id)
    try {
      // Atomic update — only succeeds if status is still 'pending'
      const { data: updated, error } = await supabase
        .from('blood_requests')
        .update({ status: 'fulfilled', donor_id: profile.id })
        .eq('id', request.id)
        .eq('status', 'pending')  // ← race-condition guard
        .select()
        .single()

      if (error || !updated) {
        // Race condition: someone else got it first
        showAlreadyClaimedToast(request.blood_group)
        fetchRequests()
        return
      }

      // Log to donation_history
      await supabase.from('donation_history').insert({
        donor_id:    profile.id,
        hospital_id: request.hospital_id,
        request_id:  request.id,
        donated_on:  new Date().toISOString().split('T')[0],
        blood_group: request.blood_group,
        units:       request.units_needed || 1,
      })

      // Update donor's last_donated
      await supabase
        .from('donors')
        .update({ last_donated: new Date().toISOString().split('T')[0] })
        .eq('id', profile.id)

      setJustDonated(request.id)
      toast.success('🎉 Thank you! The hospital has been notified. Please visit them to donate.', { duration: 6000 })
      onRespond()
      fetchRequests()

    } catch (err) {
      toast.error('Something went wrong. Please try again.')
      fetchRequests()
    } finally {
      setResponding(null)
    }
  }

  if (!profile?.is_available || !canDonate) {
    return (
      <div className="requests-tab fade-up">
        <div className="no-requests-notice card">
          <div className="nrn-icon">{!profile?.is_available ? '⏸️' : '⏳'}</div>
          <h3>{!profile?.is_available ? 'You are marked as unavailable' : 'Cooling Period Active'}</h3>
          <p>
            {!profile?.is_available
              ? 'Go to My Profile and toggle your availability to receive blood donation requests.'
              : 'You need to wait 3 months after your last donation before you can donate again.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="requests-tab fade-up">
      <div className="section-header">
        <h2>Active Blood Requests Near You</h2>
        <button className="btn btn-ghost btn-sm" onClick={fetchRequests}>🔄 Refresh</button>
      </div>

      <div className="requests-info-bar">
        <span>📍 Showing requests for <strong>{profile?.blood_group}</strong> in pincode <strong>{profile?.pincode}</strong></span>
        <span className="realtime-badge">🟢 Live</span>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : requests.length === 0 ? (
        <div className="empty-requests card">
          <div className="empty-icon">🕊️</div>
          <h3>No Active Requests</h3>
          <p>
            There are currently no blood requests matching your blood group in your area.
            We'll call you and send a notification when a hospital needs you!
          </p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map(req => (
            <div key={req.id} className={`request-card card ${justDonated === req.id ? 'just-donated' : ''}`}>
              <div className="rc-top">
                <div className="rc-blood-badge">{req.blood_group}</div>
                <div className="rc-info">
                  <div className="rc-hospital">🏥 {req.hospitals?.hospital_name}</div>
                  <div className="rc-address">📍 {req.hospitals?.address}, {req.hospitals?.city}</div>
                  <div className="rc-phone">📞 {req.hospitals?.phone}</div>
                </div>
                <div className="rc-meta">
                  <span className="badge badge-red">🚨 Urgent</span>
                  <span className="rc-time">{timeAgo(req.created_at)}</span>
                  <span className="rc-units">Units: {req.units_needed || 1}</span>
                </div>
              </div>

              {req.notes && <div className="rc-notes">📝 {req.notes}</div>}

              <div className="rc-actions">
                <button
                  className="btn btn-primary ready-btn pulse-red"
                  onClick={() => handleReady(req)}
                  disabled={!!responding}
                >
                  {responding === req.id ? '⏳ Confirming…' : '💉 I\'m Ready to Donate'}
                </button>
                <span className="rc-disclaimer">
                  Clicking confirms you'll visit this hospital to donate blood.
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
