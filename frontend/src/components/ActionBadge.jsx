const ACTION_CONFIG = {
  0: { label: "Monitor",            color: "bg-blue-500/20   text-blue-400   border border-blue-500/30"   },
  1: { label: "Treat",              color: "bg-teal-500/20   text-teal-400   border border-teal-500/30"   },
  2: { label: "Escalate",           color: "bg-orange-500/20 text-orange-400 border border-orange-500/30" },
  3: { label: "Emergency Response", color: "bg-red-500/20    text-red-400    border border-red-500/30"    },
}

export default function ActionBadge({ action }) {
  const cfg = ACTION_CONFIG[action] ?? ACTION_CONFIG[0]
  return <span className={`badge ${cfg.color}`}>A{action} · {cfg.label}</span>
}
