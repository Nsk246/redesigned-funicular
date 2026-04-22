export default function QValueBar({ label, value, max }) {
  // value is null for illegal actions
  if (value === null) {
    return (
      <div className="flex items-center gap-3 text-sm opacity-30">
        <span className="text-gray-500 w-36 truncate">{label}</span>
        <div className="flex-1 bg-gray-800 rounded-full h-2" />
        <span className="w-16 text-right font-mono text-xs text-gray-600">illegal</span>
      </div>
    )
  }
  const pct   = max !== 0 ? Math.max(0, (value / (Math.abs(max) * 1.2)) * 100) : 0
  const color = value > 0 ? "bg-green-500" : value < 0 ? "bg-red-500" : "bg-gray-600"
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-400 w-36 truncate">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-500`}
             style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`w-16 text-right font-mono text-xs ${value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : "text-gray-400"}`}>
        {value.toFixed(2)}
      </span>
    </div>
  )
}
