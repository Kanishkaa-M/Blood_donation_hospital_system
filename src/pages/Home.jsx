import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Home.css'

const BLOOD_GROUPS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']

export default function Home() {
  const { session, role } = useAuth()

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`drop drop-${i}`}>🩸</div>
          ))}
        </div>

        <div className="hero-content fade-up">
          <span className="hero-eyebrow">Every drop counts</span>
          <h1 className="hero-title">
            Connect Blood<br />
            <em>Donors</em> with<br />
            Hospitals Instantly
          </h1>
          <p className="hero-sub">
            BloodLink bridges the gap between life-saving donors and hospitals
            in need — with real-time matching and instant voice call alerts.
          </p>

          <div className="hero-cta">
            {session ? (
              <Link
                to={role === 'hospital' ? '/hospital' : '/dashboard'}
                className="btn btn-primary btn-lg"
              >
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  I Want to Donate
                </Link>
                <Link to="/register?type=hospital" className="btn btn-outline btn-lg">
                  Register Hospital
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="hero-visual fade-up">
          <div className="blood-card">
            <div className="blood-card-label">Seeking donors for</div>
            <div className="blood-card-type">O+</div>
            <div className="blood-card-hospital">🏥 City General Hospital</div>
            <div className="blood-card-status">
              <span className="status-dot"></span>
              Calling matched donors…
            </div>
          </div>
        </div>
      </section>

      {/* Blood group grid */}
      <section className="groups-section">
        <h2 className="section-title">All Blood Groups Supported</h2>
        <div className="groups-grid">
          {BLOOD_GROUPS.map(g => (
            <div key={g} className="group-chip">{g}</div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="how-section">
        <h2 className="section-title">How BloodLink Works</h2>
        <div className="steps-grid">
          {[
            { step: '01', icon: '📝', title: 'Donors Register', desc: 'Fill your profile with blood group, location pincode, and last donation date.' },
            { step: '02', icon: '🏥', title: 'Hospital Requests', desc: 'A hospital enters the needed blood group and clicks "Need Blood".' },
            { step: '03', icon: '📞', title: 'Instant Voice Call', desc: 'Eligible donors in the same pincode get an automated voice call alert.' },
            { step: '04', icon: '✅', title: 'Donor Responds', desc: 'Donor clicks "I\'m Ready" on the site — hospital gets notified instantly.' },
          ].map(s => (
            <div key={s.step} className="step-card card">
              <div className="step-num">{s.step}</div>
              <div className="step-icon">{s.icon}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <span>🩸 BloodLink</span>
        
      </footer>
    </div>
  )
}
