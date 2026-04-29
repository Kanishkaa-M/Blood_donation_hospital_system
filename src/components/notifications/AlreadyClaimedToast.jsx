// AlreadyClaimedToast.jsx
// When a donor clicks "I'm Ready" but another donor already claimed it,
// this shows a friendly message instead of a generic error.
// Used inside ActiveRequestsTab — exported as a helper function.

import toast from 'react-hot-toast'

export function showAlreadyClaimedToast(bloodGroup) {
  toast(
    (t) => (
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1.5rem' }}>🫶</span>
        <div>
          <strong style={{ display: 'block', marginBottom: 4 }}>Another hero stepped up!</strong>
          <span style={{ fontSize: '0.87rem', color: '#555' }}>
            A donor has already responded to this {bloodGroup} blood request.
            Stay available — more requests may come in.
          </span>
        </div>
      </div>
    ),
    {
      duration: 5000,
      style: {
        background: '#fff',
        border: '1.5px solid #b7ebc8',
        borderRadius: '12px',
        maxWidth: '340px',
      },
    }
  )
}
