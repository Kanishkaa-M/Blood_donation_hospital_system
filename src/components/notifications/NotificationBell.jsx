// NotificationBell.jsx
// Real-time notification bell shown in the Navbar for donors.
// Listens for blood_requests matching the donor's blood group + pincode via Supabase Realtime.

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import './NotificationBell.css'

export default function NotificationBell() {
  const { userProfile, role } = useAuth()
  const [notifications, setNotifications]   = useState([])
  const [unreadCount,   setUnreadCount]     = useState(0)
  const [open,          setOpen]            = useState(false)
  const panelRef = useRef(null)

  // Only show for donors
  if (role !== 'donor') return null

  useEffect(() => {
    if (!userProfile) return
    loadNotifications()

    // Subscribe to new blood requests matching this donor
    const channel = supabase
      .channel(`notifications-donor-${userProfile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'blood_requests',
      }, (payload) => {
        const req = payload.new
        if (
          req.blood_group === userProfile.blood_group &&
          req.pincode     === userProfile.pincode &&
          req.status      === 'pending'
        ) {
          const note = buildNotification(req)
          setNotifications(prev => [note, ...prev].slice(0, 20))
          setUnreadCount(c => c + 1)

          // Browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification('🩸 BloodLink — Blood Needed!', {
              body: `${req.blood_group} blood needed near you. Open BloodLink to respond.`,
              icon: '/favicon.ico',
            })
          }
        }
      })
      // Also listen for request status changes (fulfilled → show "Donor Found" to donor)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'blood_requests',
      }, (payload) => {
        const req = payload.new
        if (req.status === 'fulfilled') {
          setNotifications(prev =>
            prev.map(n =>
              n.requestId === req.id
                ? { ...n, subtitle: '✅ Donor has been found for this request.' }
                : n
            )
          )
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userProfile])

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function loadNotifications() {
    if (!userProfile) return
    const { data } = await supabase
      .from('blood_requests')
      .select('*, hospitals(hospital_name, city)')
      .eq('blood_group', userProfile.blood_group)
      .eq('pincode', userProfile.pincode)
      .order('created_at', { ascending: false })
      .limit(15)

    if (data) {
      setNotifications(data.map(buildNotification))
      setUnreadCount(data.filter(r => r.status === 'pending').length)
    }
  }

  function buildNotification(req) {
    return {
      id:        req.id + '-notif',
      requestId: req.id,
      title:     `🩸 ${req.blood_group} blood needed`,
      subtitle:  req.status === 'fulfilled'
        ? '✅ Donor has been found.'
        : req.status === 'cancelled'
          ? '❌ Request cancelled.'
          : `Near you in pincode ${req.pincode}`,
      time:      req.created_at,
      status:    req.status,
      hospital:  req.hospitals?.hospital_name || 'A hospital',
    }
  }

  function handleOpen() {
    setOpen(o => !o)
    if (!open) setUnreadCount(0)
  }

  async function requestBrowserPermission() {
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  function timeAgo(str) {
    const diff = Date.now() - new Date(str).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'Just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div className="notif-bell-wrap" ref={panelRef}>
      <button
        className={`notif-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={handleOpen}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span className="notif-panel-title">Notifications</span>
            <button
              className="notif-browser-perm"
              onClick={requestBrowserPermission}
              title="Enable desktop notifications"
            >
              🔔 Enable alerts
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="notif-empty">
              <span>🕊️</span>
              <p>No notifications yet.<br />We'll alert you when blood is needed near you.</p>
            </div>
          ) : (
            <ul className="notif-list">
              {notifications.map(n => (
                <li key={n.id} className={`notif-item notif-${n.status}`}>
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-hosp">🏥 {n.hospital}</div>
                  <div className="notif-item-sub">{n.subtitle}</div>
                  <div className="notif-item-time">{timeAgo(n.time)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
