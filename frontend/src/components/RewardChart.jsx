import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function RewardChart({ rewards, title, color = '#60a5fa' }) {
  if (!rewards || rewards.length === 0) {
    return (
      <div className="card" style={{ textAlign:'center', padding:'clamp(20px,2vw,32px)', opacity:0.5 }}>
        <div className="t-label" style={{ marginBottom:8 }}>{title}</div>
        <div style={{ color:'#3a6090', fontSize:'clamp(13px,1.1vw,15px)' }}>
          No data yet — run steps or episodes to populate
        </div>
      </div>
    )
  }

  const data = rewards.map((r, i) => ({ step: i + 1, reward: parseFloat(r.toFixed(1)) }))
  const avg  = (rewards.reduce((a,b) => a+b, 0) / rewards.length).toFixed(1)
  const max  = Math.max(...rewards).toFixed(1)
  const min  = Math.min(...rewards).toFixed(1)

  return (
    <div className="card">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
        <div className="t-label">{title}</div>
        <div style={{ display:'flex', gap:16 }}>
          {[{label:'Avg', val:avg}, {label:'Max', val:max}, {label:'Min', val:min}].map(s => (
            <div key={s.label} style={{ textAlign:'right' }}>
              <div style={{ color:'#3a6090', fontSize:'clamp(10px,0.8vw,11px)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</div>
              <div style={{ color:color, fontFamily:'JetBrains Mono,monospace', fontWeight:700, fontSize:'clamp(13px,1.1vw,15px)' }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top:5, right:5, bottom:0, left:0 }}>
          <XAxis
            dataKey="step"
            tick={{ fontSize:11, fill:'#3a6090', fontFamily:'Inter' }}
            tickLine={false}
            axisLine={{ stroke:'#1e3050' }}
            label={{ value:'Step', position:'insideBottom', offset:-2, fill:'#3a6090', fontSize:11 }}
          />
          <YAxis
            tick={{ fontSize:11, fill:'#3a6090', fontFamily:'Inter' }}
            tickLine={false}
            axisLine={{ stroke:'#1e3050' }}
            width={40}
          />
          <Tooltip
            contentStyle={{ background:'#0f1f3d', border:'1px solid #1e3a6e', borderRadius:8, fontFamily:'Inter', fontSize:12 }}
            labelStyle={{ color:'#5a90c0' }}
            itemStyle={{ color:color }}
            formatter={(val) => [val, 'Reward']}
            labelFormatter={(l) => `Step ${l}`}
          />
          <ReferenceLine y={0} stroke="#1e3050" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="reward"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r:4, fill:color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
