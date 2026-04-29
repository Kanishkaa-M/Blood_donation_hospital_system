import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import HospitalProfileTab from '../components/hospital/HospitalProfileTab'
import BloodRequestTab from '../components/hospital/BloodRequestTab'
import RequestHistoryTab from '../components/hospital/RequestHistoryTab'
import DonorFoundModal from '../components/notifications/DonorFoundModal'
import './HospitalDashboard.css'

export default function HospitalDashboard() {
  const { hospitalProfile, signOut, refetchProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!hospitalProfile) return
    fetchPendingCount()

    const channel = supabase
      .channel('hospital-pending-badge')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'blood_requests',
        filter: `hospital_id=eq.${hospitalProfile.id}`,
      }, () => fetchPendingCount())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [hospitalProfile])

  async function fetchPendingCount() {
    if (!hospitalProfile) return
    const { count } = await supabase
      .from('blood_requests')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalProfile.id)
      .eq('status', 'pending')
    setPendingCount(count || 0)
  }

  const tabs = [
    { id: 'profile', label: '🏥 Hospital Profile' },
    { id: 'request', label: '🩸 Need Blood', badge: pendingCount },
    { id: 'history', label: '📋 Request History' },
  ]

  return (
    <div className="hospital-dashboard">
      {/* Real-time Donor Found popup — appears automatically when a donor responds */}
      <DonorFoundModal hospital={hospitalProfile} />

      <div className="hosp-header">
        <div className="hosp-header-left">
          <div className="hosp-avatar"><span>✚</span></div>
          <div>
            <h1 className="hosp-name">{hospitalProfile?.hospital_name || 'Hospital Dashboard'}</h1>
            <p className="hosp-meta">
              📍 {hospitalProfile?.city}, {hospitalProfile?.state} &nbsp;·&nbsp; 📌 {hospitalProfile?.pincode}
            </p>
          </div>
        </div>
        <button className="btn btn-ghost hosp-signout" onClick={signOut}>Sign Out</button>
      </div>

      <div className="hosp-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`hosp-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.badge > 0 && <span className="hosp-tab-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>

      <div className="hosp-tab-content">
        {activeTab === 'profile'  && <HospitalProfileTab profile={hospitalProfile} onUpdate={refetchProfile} />}
        {activeTab === 'request'  && <BloodRequestTab hospital={hospitalProfile} onRequestSent={fetchPendingCount} />}
        {activeTab === 'history'  && <RequestHistoryTab hospital={hospitalProfile} />}
      </div>
    </div>
  )
}
