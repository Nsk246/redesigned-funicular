import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function RewardChart({ rewards, title }) {
  const data = rewards.map((r, i) => ({ step: i + 1, reward: r }))
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-400 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data}>
          <XAxis dataKey="step" tick={{ fontSize: 10, fill: "#6b7280" }} />
          <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
          <Tooltip
            contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
            labelStyle={{ color: "#9ca3af" }}
            itemStyle={{ color: "#60a5fa" }}
          />
          <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="reward" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
