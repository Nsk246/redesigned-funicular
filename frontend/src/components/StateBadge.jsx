const STATE_CONFIG = {
  0: { label: "Healthy",   color: "bg-green-500/20  text-green-400  border border-green-500/30"  },
  1: { label: "At Risk",   color: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
  2: { label: "Unstable",  color: "bg-orange-500/20 text-orange-400 border border-orange-500/30" },
  3: { label: "Critical",  color: "bg-red-500/20    text-red-400    border border-red-500/30"    },
  4: { label: "Emergency", color: "bg-purple-500/20 text-purple-400 border border-purple-500/30" },
}

export default function StateBadge({ state, size = "md" }) {
  const cfg = STATE_CONFIG[state] ?? STATE_CONFIG[0]
  const sz  = size === "lg" ? "px-4 py-1.5 text-sm" : "px-3 py-1 text-xs"
  return (
    <span className={`badge font-bold ${cfg.color} ${sz}`}>
      S{state} · {cfg.label}
    </span>
  )
}
