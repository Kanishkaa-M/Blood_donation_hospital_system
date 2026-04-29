import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import './BloodRequestTab.css'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function BloodRequestTab({ hospital, onRequestSent }) {
  const [bloodGroup,   setBloodGroup]   = useState('')
  const [units,        setUnits]        = useState(1)
  const [notes,        setNotes]        = useState('')
  const [sending,      setSending]      = useState(false)
  const [matchCount,   setMatchCount]   = useState(null)
  const [activeReqs,   setActiveReqs]   = useState([])
  const [loadingReqs,  setLoadingReqs]  = useState(true)
  const [cancellingId, setCancellingId] = useState(null)

  useEffect(() => {
    if (!hospital) return
    fetchActiveRequests()

    const channel = supabase
      .channel('blood-request-tab')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'blood_requests',
        filter: `hospital_id=eq.${hospital.id}`,
      }, () => fetchActiveRequests())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [hospital])

  // Preview matching donors when blood group is selected
  useEffect(() => {
    if (!bloodGroup || !hospital) { setMatchCount(null); return }
    previewMatches()
  }, [bloodGroup])

  async function previewMatches() {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const { count } = await supabase
      .from('donors')
      .select('*', { count: 'exact', head: true })
      .eq('blood_group', bloodGroup)
      .eq('pincode', hospital.pincode)
      .eq('is_available', true)
      .or(`last_donated.is.null,last_donated.lt.${threeMonthsAgo.toISOString().split('T')[0]}`)

    setMatchCount(count || 0)
  }

  async function fetchActiveRequests() {
    setLoadingReqs(true)
    const { data, error } = await supabase
      .from('blood_requests')
      .select(`
        *,
        donors (full_name, phone),
        call_logs (id, status, phone)
      `)
      .eq('hospital_id', hospital.id)
      .in('status', ['pending', 'fulfilled'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (!error) setActiveReqs(data || [])
    setLoadingReqs(false)
  }

  async function handleSendRequest() {
    if (!bloodGroup) { toast.error('Please select a blood group'); return }
    if (!hospital)   { toast.error('Hospital profile not found');  return }

    setSending(true)
    try {
      // 1. Create the blood request record
      const { data: requestData, error: reqError } = await supabase
        .from('blood_requests')
        .insert({
          hospital_id:  hospital.id,
          blood_group:  bloodGroup,
          units_needed: units,
          notes:        notes.trim() || null,
          pincode:      hospital.pincode,
          status:       'pending',
        })
        .select()
        .single()

      if (reqError) throw reqError

      // 2. Find all eligible donors
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      const { data: eligibleDonors, error: donorError } = await supabase
        .from('donors')
        .select('id, full_name, phone')
        .eq('blood_group', bloodGroup)
        .eq('pincode', hospital.pincode)
        .eq('is_available', true)
        .or(`last_donated.is.null,last_donated.lt.${threeMonthsAgo.toISOString().split('T')[0]}`)

      if (donorError) throw donorError

      if (!eligibleDonors || eligibleDonors.length === 0) {
        toast('⚠️ Request created but no eligible donors found in this pincode.', { icon: '📋' })
        setBloodGroup(''); setUnits(1); setNotes(''); setMatchCount(null)
        onRequestSent()
        fetchActiveRequests()
        return
      }

      // 3. Call each eligible donor via Twilio Edge Function
      let callsMade = 0
      for (const donor of eligibleDonors) {
        try {
          // Log the call attempt in call_logs first
          const { data: callLog } = await supabase
            .from('call_logs')
            .insert({
              request_id: requestData.id,
              donor_id:   donor.id,
              phone:      donor.phone,
              status:     'initiated',
            })
            .select()
            .single()

          // Trigger the Supabase Edge Function that calls Twilio
          const { error: fnError } = await supabase.functions.invoke('trigger-calls', {
            body: {
              callLogId:    callLog.id,
              donorPhone:   donor.phone,
              donorName:    donor.full_name,
              bloodGroup:   bloodGroup,
              hospitalName: hospital.hospital_name,
              hospitalCity: hospital.city,
            },
          })

          if (!fnError) callsMade++
        } catch (callErr) {
          console.warn(`Call failed for donor ${donor.id}:`, callErr)
        }
      }

      toast.success(
        `🎉 Request sent! Called ${callsMade} of ${eligibleDonors.length} eligible donors.`,
        { duration: 5000 }
      )
      setBloodGroup(''); setUnits(1); setNotes(''); setMatchCount(null)
      onRequestSent()
      fetchActiveRequests()

    } catch (err) {
      toast.error('Failed to send request: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  async function handleCancel(requestId) {
    setCancellingId(requestId)
    try {
      const { error } = await supabase
        .from('blood_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('hospital_id', hospital.id)
      if (error) throw error
      toast.success('Request cancelled')
      fetchActiveRequests()
      onRequestSent()
    } catch (err) {
      toast.error('Could not cancel: ' + err.message)
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="blood-request-tab fade-up">

      {/* ── Request Form ── */}
      <div className="brt-form card">
        <div className="brt-form-header">
          <h2>🩸 Request Blood</h2>
          <p>Select the required blood group and we'll instantly call all matching donors in your area.</p>
        </div>

        <div className="brt-field">
          <label className="brt-label">Blood Group Required *</label>
          <div className="bg-grid">
            {BLOOD_GROUPS.map(bg => (
              <button
                key={bg}
                className={`bg-chip ${bloodGroup === bg ? 'selected' : ''}`}
                onClick={() => setBloodGroup(bg)}
              >
                {bg}
              </button>
            ))}
          </div>
          {matchCount !== null && (
            <div className={`brt-match-preview ${matchCount === 0 ? 'zero' : 'has'}`}>
              {matchCount === 0
                ? '⚠️ No eligible donors found in your pincode for this blood group.'
                : `✅ ${matchCount} eligible donor${matchCount > 1 ? 's' : ''} will be called in pincode ${hospital?.pincode}`
              }
            </div>
          )}
        </div>

        <div className="brt-row">
          <div className="brt-field">
            <label className="brt-label">Units Needed</label>
            <input
              type="number"
              className="brt-input"
              min={1} max={10}
              value={units}
              onChange={e => setUnits(Number(e.target.value))}
            />
          </div>
          <div className="brt-field brt-field-wide">
            <label className="brt-label">Additional Notes (optional)</label>
            <input
              type="text"
              className="brt-input"
              placeholder="e.g. Emergency surgery, ICU requirement..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="brt-submit-area">
          <button
            className="btn btn-primary brt-submit-btn"
            onClick={handleSendRequest}
            disabled={sending || !bloodGroup}
          >
            {sending
              ? '📞 Calling donors…'
              : '🚨 Need Blood — Call Donors Now'}
          </button>
          {sending && (
            <p className="brt-calling-note">Sending voice calls to eligible donors. This may take a few seconds…</p>
          )}
        </div>
      </div>

      {/* ── Active Requests ── */}
      <div className="brt-active-section">
        <div className="section-header">
          <h3>Recent Requests</h3>
          <button className="btn btn-ghost btn-sm" onClick={fetchActiveRequests}>🔄 Refresh</button>
        </div>

        {loadingReqs ? (
          <div className="spinner" />
        ) : activeReqs.length === 0 ? (
          <div className="brt-empty card">
            <p>No requests yet. Use the form above to request blood.</p>
          </div>
        ) : (
          <div className="brt-req-list">
            {activeReqs.map(req => (
              <div key={req.id} className={`brt-req-card card ${req.status}`}>
                <div className="brt-req-top">
                  <div className="brt-req-bg-badge">{req.blood_group}</div>
                  <div className="brt-req-info">
                    <div className="brt-req-meta">
                      <span>📌 Pincode: {req.pincode}</span>
                      <span>💉 Units: {req.units_needed}</span>
                      <span>🕐 {timeAgo(req.created_at)}</span>
                    </div>
                    {req.notes && <p className="brt-req-notes">📝 {req.notes}</p>}
                  </div>
                  <div className="brt-req-status-wrap">
                    <span className={`brt-status-badge status-${req.status}`}>
                      {req.status === 'pending'   && '⏳ Pending'}
                      {req.status === 'fulfilled' && '✅ Donor Found'}
                      {req.status === 'cancelled' && '❌ Cancelled'}
                    </span>
                  </div>
                </div>

                {/* Calls Summary */}
                {req.call_logs && req.call_logs.length > 0 && (
                  <div className="brt-calls-summary">
                    📞 {req.call_logs.length} donor{req.call_logs.length > 1 ? 's' : ''} called &nbsp;·&nbsp;{' '}
                    {req.call_logs.filter(c => c.status === 'completed').length} answered
                  </div>
                )}

                {/* Donor found info */}
                {req.status === 'fulfilled' && req.donors && (
                  <div className="brt-donor-found">
                    🎉 <strong>{req.donors.full_name}</strong> has confirmed to donate &nbsp;·&nbsp; 📞 {req.donors.phone}
                  </div>
                )}

                {/* Cancel button */}
                {req.status === 'pending' && (
                  <div className="brt-req-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleCancel(req.id)}
                      disabled={cancellingId === req.id}
                    >
                      {cancellingId === req.id ? 'Cancelling…' : '✕ Cancel Request'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
