import { useState, useRef } from 'react'
import axios from 'axios'
import StateBadge from '../components/StateBadge'
import ActionBadge from '../components/ActionBadge'

const API = "https://redesigned-funicular-46prpqg6xg53j79p-8000.app.github.dev"

const WARD_COLORS = {
  0: "border-green-500/40  bg-green-500/5",
  1: "border-blue-500/40   bg-blue-500/5",
  2: "border-yellow-500/40 bg-yellow-500/5",
  3: "border-orange-500/40 bg-orange-500/5",
  4: "border-red-500/40    bg-red-500/5",
}

const WARD_LABELS = ["Calm","Active","Busy","Overloaded","Crisis"]

export default function Phase2() {
  const [patientStates, setPatientStates] = useState([1, 2, 1])
  const [result, setResult]               = useState(null)
  const [history, setHistory]             = useState([])
  const [loading, setLoading]             = useState(false)
  const [episodeRunning, setEpisodeRunning] = useState(false)
  const [episodeSteps, setEpisodeSteps]     = useState([])
  const [episodeDone, setEpisodeDone]       = useState(false)
  const stopRef = useRef(false)

  async function runStep() {
    setLoading(true)
    try {
      const res = await axios.post(`${API}/api/supervisor-step`, {
        patient_states: patientStates, use_llm: true
      })
      setResult(res.data)
      setPatientStates(res.data.triage_agents.map(t => t.next_state))
      setHistory(h => [...h.slice(-7), res.data])
    } catch(e) { alert("Error: " + e.message) }
    finally { setLoading(false) }
  }

  async function runEpisode() {
    const startStates = patientStates.map(s => parseInt(s))
    setEpisodeRunning(true)
    setEpisodeDone(false)
    setEpisodeSteps([])
    stopRef.current = false
    let states = [...startStates]

    for (let i = 0; i < 20; i++) {
      if (stopRef.current) break
      try {
        const res = await axios.post(`${API}/api/supervisor-step`, {
          patient_states: states, use_llm: false
        })
        setEpisodeSteps(prev => [...prev, { ...res.data, stepNum: i + 1 }])
        states = res.data.triage_agents.map(t => t.next_state)
        setPatientStates(states)
        if (states.every(s => s === 0)) break
        await new Promise(r => setTimeout(r, 700))
      } catch(e) {
        alert("Episode error: " + e.message)
        break
      }
    }

    setEpisodeRunning(false)
    setEpisodeDone(true)
  }

  function stopEpisode() { stopRef.current = true }

  const wardState      = result?.supervisor?.ward_state ?? null
  const totalSupReward = episodeSteps.reduce((s,r) => s + r.supervisor.reward, 0)
  const totalOverrides = episodeSteps.filter(r => r.supervisor.override_target !== null).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Phase 2 — Multi-Agent System</h1>
          <p className="text-gray-400 text-sm mt-1">Supervisor Agent coordinates 3 Triage Agents across the ward</p>
        </div>
        {wardState !== null && (
          <span className={`badge border px-4 py-2 text-sm font-bold ${WARD_COLORS[wardState]}`}>
            Ward: {WARD_LABELS[wardState]}
          </span>
        )}
      </div>

      {/* Patient inputs */}
      <div className="card">
        <h3 className="font-semibold text-gray-300 mb-4">Set Patient States</h3>
        <div className="grid grid-cols-3 gap-4">
          {patientStates.map((s, i) => (
            <div key={i} className="space-y-2">
              <label className="text-sm text-gray-400">Patient {i+1}</label>
              <select className="input" value={s}
                onChange={e => setPatientStates(ps => ps.map((v,j) => j===i ? parseInt(e.target.value) : v))}>
                {[0,1,2,3,4].map(v => (
                  <option key={v} value={v}>S{v} — {["Healthy","At Risk","Unstable","Critical","Emergency"][v]}</option>
                ))}
              </select>
              <StateBadge state={s} size="lg" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-5">
          <button onClick={runStep} disabled={loading || episodeRunning} className="btn-primary">
            {loading ? "Running..." : "▶ Run Step"}
          </button>
          {!episodeRunning ? (
            <button onClick={runEpisode} disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 disabled:opacity-40">
              ⚡ Run Full Episode
            </button>
          ) : (
            <button onClick={stopEpisode}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all">
              ⏹ Stop
            </button>
          )}
          <button onClick={() => {
            setResult(null); setHistory([])
            setPatientStates([1,2,1])
            setEpisodeSteps([]); setEpisodeDone(false)
          }} className="btn-secondary ml-auto">Reset</button>
        </div>
      </div>

      {/* Single step result */}
      {result && !episodeSteps.length && (
        <>
          <div className={`card border-2 ${WARD_COLORS[result.supervisor.next_ward_state]}`}>
            <h3 className="font-semibold text-gray-300 mb-4">Supervisor Decision</h3>
            <div className="grid md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Ward Before</p>
                <span className={`badge border px-3 py-1 ${WARD_COLORS[result.supervisor.ward_state]}`}>
                  W{result.supervisor.ward_state} · {result.supervisor.ward_state_label}
                </span>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Action</p>
                <span className="badge bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  B{result.supervisor.action} · {result.supervisor.action_label}
                </span>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Ward After</p>
                <span className={`badge border px-3 py-1 ${WARD_COLORS[result.supervisor.next_ward_state]}`}>
                  W{result.supervisor.next_ward_state} · {result.supervisor.next_ward_state_label}
                </span>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Reward</p>
                <span className={`font-mono font-bold text-lg ${result.supervisor.reward >= 0 ? 'text-green-400':'text-red-400'}`}>
                  {result.supervisor.reward > 0 ? '+' : ''}{result.supervisor.reward.toFixed(1)}
                </span>
              </div>
            </div>
            {result.supervisor.override_target !== null && (
              <div className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 text-sm text-purple-300">
                ⚡ Override issued — Patient {result.supervisor.override_target + 1} action forced up one level
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {result.triage_agents.map((t, i) => (
              <div key={i} className={`card border ${result.supervisor.override_target === i ? 'border-purple-500/60' : 'border-gray-800'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Patient {i+1}</h4>
                  {result.supervisor.override_target === i && (
                    <span className="badge bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs">⚡ Overridden</span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    ['Before', <StateBadge state={t.state} />],
                    ['Action', <ActionBadge action={t.action} />],
                    ['After',  <StateBadge state={t.next_state} />],
                    ['Reward', <span className={`font-mono font-bold ${t.reward >= 0 ? 'text-green-400':'text-red-400'}`}>{t.reward > 0?'+':''}{t.reward.toFixed(1)}</span>]
                  ].map(([label, el]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-gray-500 w-16">{label}</span>{el}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {result.ward_report && (
            <div className="card border border-blue-500/30 bg-blue-500/5">
              <h3 className="font-semibold text-gray-300 mb-3">Ward Report (Claude)</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{result.ward_report}</p>
            </div>
          )}
        </>
      )}

      {/* Episode timeline */}
      {episodeSteps.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-200 text-lg">Episode Timeline</h3>
              <p className="text-gray-500 text-sm mt-0.5">
                {episodeRunning ? `Running... step ${episodeSteps.length}` : `Completed in ${episodeSteps.length} steps`}
                {episodeDone && episodeSteps[episodeSteps.length-1]?.triage_agents.every(t => t.next_state === 0) &&
                  <span className="ml-2 text-green-400 font-semibold">✓ Ward stabilized</span>}
              </p>
            </div>
            {episodeDone && (
              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-xs text-gray-500">Supervisor Reward</p>
                  <p className={`text-2xl font-bold font-mono ${totalSupReward >= 0 ? 'text-green-400':'text-red-400'}`}>
                    {totalSupReward > 0?'+':''}{totalSupReward.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Overrides</p>
                  <p className="text-2xl font-bold font-mono text-purple-400">{totalOverrides}</p>
                </div>
              </div>
            )}
          </div>

          {/* Ward flow */}
          <div className="flex items-center gap-1 flex-wrap mb-6">
            {episodeSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`rounded-lg px-2 py-1 text-xs font-bold border ${WARD_COLORS[step.supervisor.ward_state]}`}>
                  W{step.supervisor.ward_state}
                  {step.supervisor.override_target !== null && <span className="ml-1 text-purple-400">⚡</span>}
                </div>
                <span className="text-gray-600 text-xs">→</span>
                {i === episodeSteps.length - 1 && (
                  <div className={`rounded-lg px-2 py-1 text-xs font-bold border ${WARD_COLORS[step.supervisor.next_ward_state]}`}>
                    W{step.supervisor.next_ward_state}
                  </div>
                )}
              </div>
            ))}
            {episodeRunning && (
              <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin ml-2" />
            )}
          </div>

          {/* Episode table with triage actions visible */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 text-left border-b border-gray-800">
                  <th className="pb-2 pr-3">Step</th>
                  <th className="pb-2 pr-3">Ward</th>
                  <th className="pb-2 pr-3">Sup. Action</th>
                  <th className="pb-2 pr-3 text-blue-300">P1 State</th>
                  <th className="pb-2 pr-3 text-blue-300">P1 Action</th>
                  <th className="pb-2 pr-3 text-teal-300">P2 State</th>
                  <th className="pb-2 pr-3 text-teal-300">P2 Action</th>
                  <th className="pb-2 pr-3 text-purple-300">P3 State</th>
                  <th className="pb-2 pr-3 text-purple-300">P3 Action</th>
                  <th className="pb-2 pr-3">Override</th>
                  <th className="pb-2 pr-3">Reward</th>
                  <th className="pb-2">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {episodeSteps.map((s, i) => {
                  const cumulative = episodeSteps.slice(0,i+1).reduce((acc,r) => acc+r.supervisor.reward, 0)
                  const sup = s.supervisor
                  return (
                    <tr key={i} className={`border-b border-gray-800/50 ${sup.override_target !== null ? 'bg-purple-500/5' : ''}`}>
                      <td className="py-2 pr-3 text-gray-500 font-mono">{s.stepNum}</td>
                      <td className="py-2 pr-3">
                        <span className={`badge border text-xs ${WARD_COLORS[sup.ward_state]}`}>
                          W{sup.ward_state} {sup.ward_state_label}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-blue-400 whitespace-nowrap">{sup.action_label}</td>
                      {s.triage_agents.map((t, j) => (
                        <>
                          <td key={`st-${j}`} className="py-2 pr-2">
                            <div className="flex items-center gap-1">
                              <StateBadge state={t.state} />
                              <span className="text-gray-600">→</span>
                              <StateBadge state={t.next_state} />
                            </div>
                          </td>
                          <td key={`ac-${j}`} className="py-2 pr-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
                              t.overridden
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-gray-800 text-gray-300'
                            }`}>
                              {t.action_label}
                              {t.overridden && ' ⚡'}
                            </span>
                          </td>
                        </>
                      ))}
                      <td className="py-2 pr-3">
                        {sup.override_target !== null
                          ? <span className="badge bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              P{sup.override_target+1}
                            </span>
                          : <span className="text-gray-600">—</span>}
                      </td>
                      <td className={`py-2 pr-3 font-mono font-bold ${sup.reward >= 0 ? 'text-green-400':'text-red-400'}`}>
                        {sup.reward > 0?'+':''}{sup.reward.toFixed(1)}
                      </td>
                      <td className={`py-2 font-mono ${cumulative >= 0 ? 'text-blue-400':'text-orange-400'}`}>
                        {cumulative > 0?'+':''}{cumulative.toFixed(1)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
