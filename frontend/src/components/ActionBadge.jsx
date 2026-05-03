const A = {
  0: { label:'Monitor'   },
  1: { label:'Treat'     },
  2: { label:'Escalate'  },
  3: { label:'Emergency Response' },
}
const B = {
  0: { label:'Standby'    },
  1: { label:'Reallocate' },
  2: { label:'Override'   },
  3: { label:'Backup'     },
}

export function ActionBadge({ action, overridden = false }) {
  const cfg = A[action] ?? A[0]
  return (
    <span className="badge-action" style={overridden ? { borderColor:'rgba(192,132,252,0.5)', color:'#c084fc', background:'rgba(192,132,252,0.1)' } : {}}>
      A{action} · {cfg.label}{overridden ? ' ⚡' : ''}
    </span>
  )
}

export function WardActionBadge({ action }) {
  const cfg = B[action] ?? B[0]
  return <span className="badge-action">B{action} · {cfg.label}</span>
}

export default ActionBadge
