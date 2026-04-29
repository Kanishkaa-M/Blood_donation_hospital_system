import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import NotificationBell from './notifications/NotificationBell'
import './Navbar.css'

export default function Navbar() {
  const { session, role, userProfile, hospitalProfile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    toast.success('Signed out successfully')
    navigate('/')
  }

  const displayName = role === 'donor'
    ? userProfile?.full_name?.split(' ')[0]
    : hospitalProfile?.hospital_name?.split(' ')[0]

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-drop">🩸</span>
        <span className="navbar-name">BloodLink</span>
      </Link>

      <div className="navbar-right">
        {session ? (
          <>
            <span className="navbar-greeting">
              {role === 'hospital' ? '🏥' : '👤'} {displayName}
            </span>
            {/* Notification bell — only renders for donors (handled inside component) */}
            <NotificationBell />
            <Link
              to={role === 'hospital' ? '/hospital' : '/dashboard'}
              className="btn btn-ghost btn-sm"
            >
              Dashboard
            </Link>
            <button onClick={handleSignOut} className="btn btn-outline btn-sm">
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
          </>
        )}
      </div>
    </nav>
  )
}
