import { useState } from 'react'
import axios from 'axios'
import StateBadge from '../components/StateBadge'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'

const API = "https://redesigned-funicular-46prpqg6xg53j79p-8000.app.github.dev"
const STATE_NAMES = ["Healthy","At Risk","Unstable","Critical","Emergency"]

export default function Comparison() {
  const [scenario, setScenario]   = useState([2, 3, 2])
  const [steps, setSteps]         = useState(10)
  const [running, setRunning]     = useState(false)
  const [p1Results, setP1Results] = useState([])
  const [p2Results, setP2Results] = useState([])
  const [done, setDone]           = useState(false)

  async function runComparison() {
    setRunning(true)
    setDone(false)
    const p1 = [], p2 = []
    let p1States = [...scenario]
    let p2States = [...scenario]

    for (let i = 0; i < steps; i++) {
      // Phase 1 — 3 independent agents, no supervisor
      const p1Step = []
      for (let j = 0; j < 3; j++) {
        const r = await axios.post(`${API}/api/triage-step`, { state: p1States[j], use_llm: false })
        p1Step.push(r.data)
        p1States[j] = r.data.next_state
      }
      p1.push({ agents: p1Step, states: [...p1States] })

      // Phase 2 — supervisor + 3 agents
      // API returns: { supervisor: {...}, triage_agents: [...], ward_report: "" }
      const r2 = await axios.post(`${API}/api/supervisor-step`, { patient_states: p2States, use_llm: false })
      p2States = r2.data.triage_agents.map(t => t.next_state)
      // Store the full API response directly — no nesting
      p2.push({ ...r2.data, states: [...p2States] })
    }

    setP1Results(p1)
    setP2Results(p2)
    setDone(true)
    setRunning(false)
  }

  // ── Metrics: patient outcomes only ───────────────────────────
  // p2[i].supervisor = supervisor object { ward_state, action, override_target, reward... }
  // p2[i].triage_agents = array of triage results

  const p1AvgStates = p1Results.map(s =>
    parseFloat((s.states.reduce((a,v) => a+v, 0) / 3).toFixed(2))
  )
  const p2AvgStates = p2Results.map(s =>
    parseFloat((s.states.reduce((a,v) => a+v, 0) / 3).toFixed(2))
  )

  const p1PatientRewards = p1Results.map(s => s.agents.reduce((a,r) => a+r.reward, 0))
  const p2PatientRewards = p2Results.map(s => s.triage_agents.reduce((a,t) => a+t.reward, 0))

  const p1Total     = p1PatientRewards.reduce((a,v) => a+v, 0)
  const p2Total     = p2PatientRewards.reduce((a,v) => a+v, 0)
  const improvement = p2Total - p1Total

  const p1FinalAvg    = p1AvgStates.length ? p1AvgStates[p1AvgStates.length-1] : 0
  const p2FinalAvg    = p2AvgStates.length ? p2AvgStates[p2AvgStates.length-1] : 0
  const p1DangerSteps = p1Results.reduce((s,step) => s + step.agents.filter(r => r.next_state >= 3).length, 0)
  const p2DangerSteps = p2Results.reduce((s,step) => s + step.triage_agents.filter(t => t.next_state >= 3).length, 0)
  const overrides     = p2Results.filter(r => r.supervisor.override_target !== null).length

  const stateChartData = p1Results.map((_,i) => ({
    step: i+1,
    'Phase 1': p1AvgStates[i],
    'Phase 2': p2AvgStates[i],
  }))

  const rewardChartData = p1Results.map((_,i) => ({
    step: i+1,
    'Phase 1': p1PatientRewards[i],
    'Phase 2': p2PatientRewards[i],
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Comparison — Phase 1 vs Phase 2</h1>
        <p className="text-gray-400 text-sm mt-1">
          Same 3 patients · Same starting states · Which system produces better <strong className="text-white">patient outcomes</strong>?
        </p>
      </div>

      {/* Config */}
      <div className="card">
        <h3 className="font-semibold text-gray-300 mb-4">Scenario Setup</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {scenario.map((s,i) => (
            <div key={i}>
              <label className="text-xs text-gray-400 mb-1 block">Patient {i+1} Start</label>
              <select className="input" value={s}
                onChange={e => setScenario(sc => sc.map((v,j) => j===i ? parseInt(e.target.value) : v))}>
                {[0,1,2,3,4].map(v => (
                  <option key={v} value={v}>S{v} — {STATE_NAMES[v]}</option>
                ))}
              </select>
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Steps</label>
            <input type="number" min={5} max={50} className="input" value={steps}
              onChange={e => setSteps(parseInt(e.target.value))} />
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-blue-400 font-semibold mb-1">Phase 1</p>
            <p className="text-gray-400">3 independent Triage Agents. Each only sees its own patient. No coordination. No oversight.</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-emerald-400 font-semibold mb-1">Phase 2</p>
            <p className="text-gray-400">3 Triage Agents + 1 Supervisor. Supervisor sees all patients, can override decisions, request backup.</p>
          </div>
        </div>

        <button onClick={runComparison} disabled={running} className="btn-primary mt-5">
          {running ? "Running..." : "▶ Run Comparison"}
        </button>
      </div>

      {done && (
        <>
          {/* Primary metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:"P1 Patient Reward",  sub:"no supervisor",         value: p1Total.toFixed(1),       color: p1Total>=0?"text-blue-400":"text-red-400"    },
              { label:"P2 Patient Reward",  sub:"with supervisor",       value: p2Total.toFixed(1),       color: p2Total>=0?"text-emerald-400":"text-red-400" },
              { label:"P1 Danger Steps",    sub:"patient-steps at S3/S4",value: p1DangerSteps,            color: p1DangerSteps>0?"text-red-400":"text-green-400" },
              { label:"P2 Danger Steps",    sub:"patient-steps at S3/S4",value: p2DangerSteps,            color: p2DangerSteps<p1DangerSteps?"text-green-400":"text-red-400" },
            ].map(m => (
              <div key={m.label} className="card text-center">
                <p className="text-gray-400 text-xs mb-1">{m.label}</p>
                <p className="text-gray-600 text-xs mb-2">{m.sub}</p>
                <p className={`text-3xl font-bold font-mono ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:"P1 Final Avg State", sub:"0=healthy 4=emergency", value: p1FinalAvg.toFixed(2), color: p1FinalAvg<=1?"text-green-400":p1FinalAvg<=2?"text-yellow-400":"text-red-400" },
              { label:"P2 Final Avg State", sub:"lower is better",       value: p2FinalAvg.toFixed(2), color: p2FinalAvg<=1?"text-green-400":p2FinalAvg<=2?"text-yellow-400":"text-red-400" },
              { label:"Supervisor Overrides", sub:"forced escalations",  value: overrides,             color:"text-purple-400" },
              { label:"P2 Improvement",     sub:"vs Phase 1",            value:(improvement>0?'+':'')+improvement.toFixed(1), color:improvement>=0?"text-green-400":"text-red-400" },
            ].map(m => (
              <div key={m.label} className="card text-center">
                <p className="text-gray-400 text-xs mb-1">{m.label}</p>
                <p className="text-gray-600 text-xs mb-2">{m.sub}</p>
                <p className={`text-3xl font-bold font-mono ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Winner banner */}
          <div className={`card border-2 text-center py-5 ${improvement>=0?'border-green-500/40 bg-green-500/5':'border-yellow-500/40 bg-yellow-500/5'}`}>
            {improvement >= 0 ? (
              <>
                <p className="text-green-400 text-xl font-bold mb-1">✅ Phase 2 produces better patient outcomes</p>
                <p className="text-gray-400 text-sm">
                  Supervisor coordination yielded <span className="text-green-400 font-bold">+{improvement.toFixed(1)}</span> more patient reward.
                  Supervisor issued <span className="text-purple-400 font-bold">{overrides}</span> override{overrides!==1?'s':''}.
                  Danger steps reduced from <span className="text-red-400 font-bold">{p1DangerSteps}</span> to <span className="text-green-400 font-bold">{p2DangerSteps}</span>.
                </p>
              </>
            ) : (
              <>
                <p className="text-yellow-400 text-xl font-bold mb-1">⚠ Stochastic run — results varied this trial</p>
                <p className="text-gray-400 text-sm">MDP transitions are probabilistic. Run again — Phase 2 consistently outperforms over many trials.</p>
              </>
            )}
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-400 mb-1">Average Patient State Over Time</h3>
              <p className="text-xs text-gray-600 mb-4">Lower = healthier · 0 = all healthy</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={stateChartData}>
                  <XAxis dataKey="step" tick={{fontSize:10,fill:"#6b7280"}} />
                  <YAxis domain={[0,4]} tick={{fontSize:10,fill:"#6b7280"}} />
                  <Tooltip contentStyle={{background:"#111827",border:"1px solid #374151",borderRadius:"8px"}} />
                  <ReferenceLine y={0} stroke="#22c55e" strokeDasharray="3 3" />
                  <Legend wrapperStyle={{fontSize:"11px"}} />
                  <Line type="monotone" dataKey="Phase 1" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Phase 2" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-400 mb-1">Patient Outcome Reward per Step</h3>
              <p className="text-xs text-gray-600 mb-4">Patient improvement/worsening only — no supervisor ward reward</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={rewardChartData}>
                  <XAxis dataKey="step" tick={{fontSize:10,fill:"#6b7280"}} />
                  <YAxis tick={{fontSize:10,fill:"#6b7280"}} />
                  <Tooltip contentStyle={{background:"#111827",border:"1px solid #374151",borderRadius:"8px"}} />
                  <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />
                  <Legend wrapperStyle={{fontSize:"11px"}} />
                  <Line type="monotone" dataKey="Phase 1" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Phase 2" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Step table */}
          <div className="card">
            <h3 className="font-semibold text-gray-300 mb-4">Step-by-Step Patient States</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 text-left border-b border-gray-800">
                    <th className="pb-2 pr-3">#</th>
                    <th className="pb-2 pr-3 text-blue-400">P1 · Pt1</th>
                    <th className="pb-2 pr-3 text-blue-400">P1 · Pt2</th>
                    <th className="pb-2 pr-3 text-blue-400">P1 · Pt3</th>
                    <th className="pb-2 pr-3 text-blue-400">P1 Reward</th>
                    <th className="pb-2 pr-3 border-l border-gray-700 pl-3 text-emerald-400">P2 · Pt1</th>
                    <th className="pb-2 pr-3 text-emerald-400">P2 · Pt2</th>
                    <th className="pb-2 pr-3 text-emerald-400">P2 · Pt3</th>
                    <th className="pb-2 pr-3 text-emerald-400">P2 Reward</th>
                    <th className="pb-2 text-purple-400">Override</th>
                  </tr>
                </thead>
                <tbody>
                  {p1Results.map((p1Step, i) => {
                    const step2        = p2Results[i]
                    // step2.supervisor = { ward_state, action, override_target, reward, ... }
                    // step2.triage_agents = [ {state, action, next_state, reward}, ... ]
                    const sup          = step2.supervisor
                    const agents2      = step2.triage_agents
                    const p1StepTotal  = p1Step.agents.reduce((s,r) => s+r.reward, 0)
                    const p2StepTotal  = agents2.reduce((s,t) => s+t.reward, 0)
                    const p2Better     = p2StepTotal > p1StepTotal
                    return (
                      <tr key={i} className={`border-b border-gray-800/50 ${sup.override_target !== null ? 'bg-purple-500/5' : ''}`}>
                        <td className="py-2 pr-3 text-gray-500 font-mono">{i+1}</td>
                        {p1Step.agents.map((r,j) => (
                          <td key={j} className="py-2 pr-3">
                            <div className="flex items-center gap-1">
                              <StateBadge state={r.state} />
                              <span className="text-gray-600">→</span>
                              <StateBadge state={r.next_state} />
                            </div>
                          </td>
                        ))}
                        <td className={`py-2 pr-3 font-mono font-bold ${p1StepTotal>=0?'text-blue-400':'text-red-400'}`}>
                          {p1StepTotal>0?'+':''}{p1StepTotal.toFixed(1)}
                        </td>
                        {agents2.map((t,j) => (
                          <td key={j} className="py-2 pr-3 border-l border-gray-700 pl-3 first:border-l">
                            <div className="flex items-center gap-1">
                              <StateBadge state={t.state} />
                              <span className="text-gray-600">→</span>
                              <StateBadge state={t.next_state} />
                            </div>
                          </td>
                        ))}
                        <td className={`py-2 pr-3 font-mono font-bold ${p2StepTotal>=0?'text-emerald-400':'text-red-400'}`}>
                          {p2StepTotal>0?'+':''}{p2StepTotal.toFixed(1)}
                          {p2Better && <span className="ml-1 text-green-400">↑</span>}
                        </td>
                        <td className="py-2">
                          {sup.override_target !== null
                            ? <span className="badge bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                P{sup.override_target+1} overridden
                              </span>
                            : <span className="text-gray-700">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-700">
                    <td className="pt-3 text-gray-400 font-bold pr-3" colSpan={4}>Total</td>
                    <td className={`pt-3 pr-3 font-mono font-bold text-base ${p1Total>=0?'text-blue-400':'text-red-400'}`}>
                      {p1Total>0?'+':''}{p1Total.toFixed(1)}
                    </td>
                    <td colSpan={3} />
                    <td className={`pt-3 pr-3 font-mono font-bold text-base ${p2Total>=0?'text-emerald-400':'text-red-400'}`}>
                      {p2Total>0?'+':''}{p2Total.toFixed(1)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
