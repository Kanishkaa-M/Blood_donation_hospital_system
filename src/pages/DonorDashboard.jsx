import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import ProfileTab from '../components/donor/ProfileTab'
import ActiveRequestsTab from '../components/donor/ActiveRequestsTab'
import HistoryTab from '../components/donor/HistoryTab'
import './DonorDashboard.css'

const TABS = [
  { id: 'profile',   label: 'My Profile',      icon: '👤' },
  { id: 'requests',  label: 'Blood Requests',   icon: '🚨' },
  { id: 'history',   label: 'Donation History', icon: '📋' },
]

export default function DonorDashboard() {
  const { userProfile, refetchProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [requestCount, setRequestCount] = useState(0)

  useEffect(() => {
    if (!userProfile) return
    fetchRequestCount()

    const channel = supabase
      .channel('blood_requests_donor')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'blood_requests', filter: `status=eq.pending`,
      }, () => fetchRequestCount())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userProfile])

  async function fetchRequestCount() {
    if (!userProfile) return
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const canDonate = !userProfile.last_donated || new Date(userProfile.last_donated) < threeMonthsAgo
    if (!canDonate || !userProfile.is_available) { setRequestCount(0); return }

    const { count } = await supabase
      .from('blood_requests')
      .select('*', { count: 'exact', head: true })
      .eq('blood_group', userProfile.blood_group)
      .eq('pincode', userProfile.pincode)
      .eq('status', 'pending')

    setRequestCount(count || 0)
  }

  const canDonate = () => {
    if (!userProfile?.last_donated) return true
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    return new Date(userProfile.last_donated) < threeMonthsAgo
  }

  const getDonorStatus = () => {
    if (!userProfile?.is_available) return { label: 'Unavailable', color: 'badge-gray', emoji: '⏸️' }
    if (!canDonate()) return { label: 'Cooling Off (< 3 months)', color: 'badge-yellow', emoji: '⏳' }
    return { label: 'Available to Donate', color: 'badge-green', emoji: '✅' }
  }

  const status = getDonorStatus()

  return (
    <div className="donor-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-header-inner page-wrapper">
          <div className="dh-left">
            <div className="dh-avatar">{userProfile?.blood_group || '?'}</div>
            <div>
              <h1 className="dh-name">{userProfile?.full_name || 'Loading…'}</h1>
              <div className="dh-meta">
                <span className={`badge ${status.color}`}>{status.emoji} {status.label}</span>
                <span className="dh-loc">📍 {userProfile?.city}, {userProfile?.pincode}</span>
              </div>
            </div>
          </div>
          <div className="dh-right">
            <div className="dh-stat">
              <span className="dh-stat-val">{userProfile?.blood_group}</span>
              <span className="dh-stat-label">Blood Group</span>
            </div>
            <div className="dh-stat">
              <span className="dh-stat-val">{requestCount}</span>
              <span className="dh-stat-label">Active Requests</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <div className="tabs-inner page-wrapper">
          {TABS.map(tab => (
            <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}>
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
              {tab.id === 'requests' && requestCount > 0 && (
                <span className="tab-badge">{requestCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-content page-wrapper">
        {activeTab === 'profile'  && <ProfileTab profile={userProfile} onUpdate={refetchProfile} />}
        {activeTab === 'requests' && <ActiveRequestsTab profile={userProfile} onRespond={() => { refetchProfile(); fetchRequestCount() }} />}
        {activeTab === 'history'  && <HistoryTab profile={userProfile} />}
      </div>
    </div>
  )
}
