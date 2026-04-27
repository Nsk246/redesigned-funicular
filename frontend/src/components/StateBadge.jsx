const S = {
  0: { label:'Healthy',   cls:'badge-s0', icon:<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#4ade80"/></svg> },
  1: { label:'At Risk',   cls:'badge-s1', icon:<svg width="8" height="8" viewBox="0 0 8 8"><polygon points="4,0 8,8 0,8" fill="#a5b4fc"/></svg> },
  2: { label:'Unstable',  cls:'badge-s2', icon:<svg width="8" height="8" viewBox="0 0 8 8"><line x1="0" y1="4" x2="8" y2="4" stroke="#60a5fa" strokeWidth="2.5"/><line x1="4" y1="0" x2="4" y2="8" stroke="#60a5fa" strokeWidth="2.5"/></svg> },
  3: { label:'Critical',  cls:'badge-s3', icon:<svg width="8" height="8" viewBox="0 0 8 8"><rect width="8" height="8" rx="1.5" fill="#fb7185"/></svg> },
  4: { label:'Emergency', cls:'badge-s4', icon:<svg width="8" height="8" viewBox="0 0 8 8"><path d="M4,0 L8,4 L4,8 L0,4 Z" fill="#c084fc"/></svg> },
}

export default function StateBadge({ state }) {
  const s = S[state] ?? S[0]
  return (
    <span className={s.cls}>
      {s.icon} S{state} · {s.label}
    </span>
  )
}
