import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function RewardChart({ rewards, title }) {
  const data = rewards.map((r, i) => ({ step: i+1, reward: parseFloat(r.toFixed(1)) }))
  return (
    <div className="card">
      <p className="label" style={{marginBottom:16}}>{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <XAxis dataKey="step" tick={{fontSize:11,fill:'#475569',fontFamily:'Inter'}} />
          <YAxis tick={{fontSize:11,fill:'#475569',fontFamily:'Inter'}} />
          <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2d45',borderRadius:'10px',fontFamily:'Inter',fontSize:'13px'}}
            labelStyle={{color:'#64748b'}} itemStyle={{color:'#00d4ff'}} />
          <ReferenceLine y={0} stroke="#1e2d45" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="reward" stroke="url(#grad)" strokeWidth={2.5} dot={false} />
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00d4ff"/>
              <stop offset="100%" stopColor="#7c3aed"/>
            </linearGradient>
          </defs>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
