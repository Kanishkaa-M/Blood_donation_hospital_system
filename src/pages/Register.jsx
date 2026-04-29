import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import './Auth.css'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [type, setType] = useState(searchParams.get('type') === 'hospital' ? 'hospital' : 'donor')
  const [loading, setLoading] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Donor fields
  const [donor, setDonor] = useState({
    full_name: '', dob: '', blood_group: '', phone: '',
    pincode: '', city: '', state: '', last_donated: '', gender: '',
  })

  // Hospital fields
  const [hospital, setHospital] = useState({
    hospital_name: '', reg_number: '', phone: '',
    pincode: '', city: '', state: '', address: '', contact_person: '',
  })

  function handleDonorChange(e) {
    setDonor(d => ({ ...d, [e.target.name]: e.target.value }))
  }
  function handleHospitalChange(e) {
    setHospital(h => ({ ...h, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const profileData = type === 'donor' ? donor : hospital
      await signUp(email, password, type, profileData)
      toast.success('Account created! Please verify your email.')
      navigate(type === 'donor' ? '/dashboard' : '/hospital')
    } catch (err) {
      toast.error(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page auth-page-wide">
      <div className="auth-card card fade-up">
        <div className="auth-logo">🩸</div>
        <h2 className="auth-title">Create Account</h2>

        {/* Type Toggle */}
        <div className="type-toggle">
          <button
            type="button"
            className={`toggle-btn ${type === 'donor' ? 'active' : ''}`}
            onClick={() => setType('donor')}
          >
            👤 I'm a Donor
          </button>
          <button
            type="button"
            className={`toggle-btn ${type === 'hospital' ? 'active' : ''}`}
            onClick={() => setType('hospital')}
          >
            🏥 I'm a Hospital
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Common fields */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Min 6 characters"
                value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
          </div>

          {type === 'donor' ? (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" name="full_name" placeholder="Priya Sharma"
                    value={donor.full_name} onChange={handleDonorChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input className="form-input" type="date" name="dob"
                    value={donor.dob} onChange={handleDonorChange} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select className="form-select" name="blood_group"
                    value={donor.blood_group} onChange={handleDonorChange} required>
                    <option value="">Select blood group</option>
                    {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" name="gender"
                    value={donor.gender} onChange={handleDonorChange} required>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" name="phone" type="tel" placeholder="+91 98765 43210"
                    value={donor.phone} onChange={handleDonorChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input className="form-input" name="pincode" placeholder="600001"
                    value={donor.pincode} onChange={handleDonorChange} required maxLength={6} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" name="city" placeholder="Chennai"
                    value={donor.city} onChange={handleDonorChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-input" name="state" placeholder="Tamil Nadu"
                    value={donor.state} onChange={handleDonorChange} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Last Blood Donated Date (leave blank if never)</label>
                <input className="form-input" type="date" name="last_donated"
                  value={donor.last_donated} onChange={handleDonorChange} />
              </div>
            </>
          ) : (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Hospital Name</label>
                  <input className="form-input" name="hospital_name" placeholder="City General Hospital"
                    value={hospital.hospital_name} onChange={handleHospitalChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Registration Number</label>
                  <input className="form-input" name="reg_number" placeholder="MH/2023/1234"
                    value={hospital.reg_number} onChange={handleHospitalChange} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input className="form-input" name="contact_person" placeholder="Dr. Ramesh Kumar"
                    value={hospital.contact_person} onChange={handleHospitalChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" name="phone" type="tel" placeholder="+91 44 2222 3333"
                    value={hospital.phone} onChange={handleHospitalChange} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Full Address</label>
                <input className="form-input" name="address" placeholder="123, Anna Salai, Chennai"
                  value={hospital.address} onChange={handleHospitalChange} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input className="form-input" name="pincode" placeholder="600002"
                    value={hospital.pincode} onChange={handleHospitalChange} required maxLength={6} />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" name="city" placeholder="Chennai"
                    value={hospital.city} onChange={handleHospitalChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-input" name="state" placeholder="Tamil Nadu"
                    value={hospital.state} onChange={handleHospitalChange} required />
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 12 }} disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account →'}
          </button>
        </form>

        <hr className="divider" />
        <p className="auth-footer">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
