export default function QValueBar({ label, value, max, actionIdx, selected }) {
  if (value === null) return (
    <div style={{ display:'flex', alignItems:'center', gap:10, opacity:0.25 }}>
      <span style={{ color:'#2a4060', fontSize:'clamp(13px,1vw,15px)', fontFamily:'JetBrains Mono,monospace', width:20 }}>A{actionIdx}</span>
      <span style={{ color:'#3a5070', fontSize:'clamp(14px,1.1vw,16px)', width:80, flexShrink:0 }}>{label}</span>
      <div style={{ flex:1, background:'#0a1628', borderRadius:3, height:4 }}/>
      <span style={{ color:'#2a4060', fontSize:'clamp(13px,1vw,15px)', fontFamily:'JetBrains Mono,monospace', width:40, textAlign:'right' }}>—</span>
    </div>
  )
  const pct   = max ? Math.max(0, (Math.abs(value) / (Math.abs(max) * 1.1)) * 100) : 0
  const color = selected ? 'linear-gradient(90deg,#2563eb,#38bdf8)' : value < 0 ? '#7f1d1d' : '#1e3050'
  const tc    = selected ? '#60a5fa' : value < 0 ? '#fb7185' : '#7a9bc0'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ color:'#2a4060', fontSize:'clamp(13px,1vw,15px)', fontFamily:'JetBrains Mono,monospace', width:20, flexShrink:0 }}>A{actionIdx}</span>
      <span style={{ color: selected ? '#ffffff' : '#7a9bc0', fontSize:'clamp(14px,1.1vw,16px)', width:80, flexShrink:0, fontWeight: selected ? 600 : 400 }}>{label}{selected ? ' ✓' : ''}</span>
      <div style={{ flex:1, background:'#0a1628', borderRadius:3, height:5 }}>
        <div style={{ width:`${Math.min(pct,100)}%`, height:'100%', background:color, borderRadius:3, transition:'width 0.5s ease', boxShadow: selected ? '0 0 6px rgba(37,99,235,0.4)' : 'none' }}/>
      </div>
      <span style={{ color:tc, fontSize:'clamp(14px,1.1vw,16px)', fontFamily:'JetBrains Mono,monospace', fontWeight:700, width:46, textAlign:'right' }}>
        {value > 0 ? '+' : ''}{value.toFixed(1)}
      </span>
    </div>
  )
}
