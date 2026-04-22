import { useState, useRef } from 'react'
import axios from 'axios'
import StateBadge from '../components/StateBadge'
import ActionBadge from '../components/ActionBadge'
import QValueBar from '../components/QValueBar'

const API = "https://redesigned-funicular-46prpqg6xg53j79p-8000.app.github.dev"

const STATE_COLORS = {
  0: "border-green-500/40",
  1: "border-yellow-500/40",
  2: "border-orange-500/40",
  3: "border-red-500/40",
  4: "border-purple-500/40",
}

const STATE_BG = {
  0: "bg-green-500/10",
  1: "bg-yellow-500/10",
  2: "bg-orange-500/10",
  3: "bg-red-500/10",
  4: "bg-purple-500/10",
}

export default function Phase1() {
  const [mode, setMode]                 = useState('manual')
  const [nlpText, setNlpText]           = useState('')
  const [vitals, setVitals]             = useState({ hr:75, bp_sys:120, bp_dia:80, temp:37.0, spo2:98, age:50, conditions:0 })
  const [currentState, setCurrentState] = useState(null)
  const [result, setResult]             = useState(null)
  const [history, setHistory]           = useState([])
  const [loading, setLoading]           = useState(false)
  const [parsing, setParsing]           = useState(false)
  const [episodeRunning, setEpisodeRunning] = useState(false)
  const [episodeSteps, setEpisodeSteps]     = useState([])
  const [episodeDone, setEpisodeDone]       = useState(false)
  const [llmLoading, setLlmLoading]         = useState(false)
  const [lastExplanation, setLastExplanation] = useState(null)
  const stopRef = useRef(false)

  async function parseNLP() {
    if (!nlpText.trim()) return
    setParsing(true)
    try {
      const res = await axios.post(`${API}/api/parse-patient`, { text: nlpText })
      setVitals(res.data.vitals)
      setCurrentState(res.data.state)
      setLastExplanation(null)
    } catch(e) { alert("Parse error: " + e.message) }
    finally { setParsing(false) }
  }

  async function getState() {
    setLoading(true)
    try {
      const res = await axios.post(`${API}/api/vitals-to-state`, vitals)
      setCurrentState(res.data.state)
      setLastExplanation(null)
    } catch(e) { alert(e.message) }
    finally { setLoading(false) }
  }

  async function runStep() {
    if (currentState === null) return
    setLoading(true)
    setEpisodeSteps([])
    setEpisodeDone(false)
    try {
      const res = await axios.post(`${API}/api/triage-step`, { state: currentState, use_llm: true })
      setResult(res.data)
      setCurrentState(res.data.next_state)
      setHistory(h => [...h.slice(-9), res.data])
      setLastExplanation(res.data.explanation)
    } catch(e) { alert("Step error: " + e.message) }
    finally { setLoading(false) }
  }

  async function runEpisode() {
    if (currentState === null) return
    const startStates = [currentState]
    setEpisodeRunning(true)
    setEpisodeDone(false)
    setEpisodeSteps([])
    setResult(null)
    setLastExplanation(null)
    stopRef.current = false
    let state = currentState

    for (let i = 0; i < 20; i++) {
      if (stopRef.current) break
      try {
        const res = await axios.post(`${API}/api/triage-step`, { state, use_llm: false })
        const step = { ...res.data, stepNum: i + 1 }
        setEpisodeSteps(prev => [...prev, step])
        setCurrentState(res.data.next_state)
        state = res.data.next_state
        if (state === 0) break
        await new Promise(r => setTimeout(r, 600))
      } catch(e) {
        alert("Episode error: " + e.message)
        break
      }
    }

    // After episode completes, get LLM explanation for the final step
    setEpisodeRunning(false)
    setEpisodeDone(true)
  }

  // Get LLM explanation for any step on demand
  async function explainStep(step) {
    setLlmLoading(true)
    try {
      const res = await axios.post(`${API}/api/triage-step`, { state: step.state, use_llm: true })
      setLastExplanation(res.data.explanation)
    } catch(e) { alert(e.message) }
    finally { setLlmLoading(false) }
  }

  function stopEpisode() { stopRef.current = true }

  const maxQ = result ? Math.max(...Object.values(result.q_values).filter(v => v !== null).map(Math.abs)) : 1
  const totalEpisodeReward = episodeSteps.reduce((s, r) => s + r.reward, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Phase 1 — Single Triage Agent</h1>
          <p className="text-gray-400 text-sm mt-1">DQN agent learns optimal patient actions via reinforcement learning</p>
        </div>
        {currentState !== null && (
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">Current State:</span>
            <StateBadge state={currentState} size="lg" />
          </div>
        )}
      </div>

      {/* Input Panel */}
      <div className="card">
        <div className="flex gap-2 mb-5">
          {['manual','nlp'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${mode===m ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
              {m === 'manual' ? 'Manual Vitals' : 'Natural Language (LLM)'}
            </button>
          ))}
        </div>

        {mode === 'nlp' ? (
          <div className="space-y-3">
            <textarea className="input h-24 resize-none"
              placeholder="e.g. Patient in bed 4, 67 year old diabetic, heart rate 130, blood pressure 180/110, declining over last hour..."
              value={nlpText} onChange={e => setNlpText(e.target.value)} />
            <button onClick={parseNLP} disabled={parsing || !nlpText.trim()} className="btn-primary">
              {parsing ? "Parsing with Claude..." : "Parse with Claude →"}
            </button>
            {/* Show parsed vitals */}
            {currentState !== null && vitals && mode === 'nlp' && (
              <div className="bg-gray-800/50 rounded-xl p-3 grid grid-cols-4 gap-2 text-xs">
                {Object.entries(vitals).map(([k,v]) => (
                  <div key={k}>
                    <span className="text-gray-500">{k}: </span>
                    <span className="text-white font-mono">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {key:'hr',label:'Heart Rate (bpm)',step:1},
              {key:'bp_sys',label:'BP Systolic (mmHg)',step:1},
              {key:'bp_dia',label:'BP Diastolic (mmHg)',step:1},
              {key:'temp',label:'Temperature (°C)',step:0.1},
              {key:'spo2',label:'SpO2 (%)',step:1},
              {key:'age',label:'Age (years)',step:1},
              {key:'conditions',label:'Conditions (#)',step:1},
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                <input type="number" step={f.step} className="input" value={vitals[f.key]}
                  onChange={e => setVitals(v => ({...v, [f.key]: parseFloat(e.target.value)}))} />
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-5">
          {mode === 'manual' && (
            <button onClick={getState} disabled={loading || episodeRunning} className="btn-secondary">
              Map to State
            </button>
          )}
          <button onClick={runStep} disabled={loading || episodeRunning || currentState === null} className="btn-primary">
            {loading ? "Running..." : "▶ Run Step"}
          </button>
          {!episodeRunning ? (
            <button onClick={runEpisode} disabled={loading || currentState === null}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed">
              ⚡ Run Full Episode
            </button>
          ) : (
            <button onClick={stopEpisode}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all">
              ⏹ Stop
            </button>
          )}
          <button onClick={() => {
            setResult(null); setCurrentState(null); setHistory([])
            setEpisodeSteps([]); setEpisodeDone(false); setLastExplanation(null)
          }} className="btn-secondary ml-auto">Reset</button>
        </div>
      </div>

      {/* ── LLM EXPLANATION — always visible when available ── */}
      {lastExplanation && (
        <div className="card border border-blue-500/30 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <h3 className="font-semibold text-blue-300">Claude's Clinical Explanation</h3>
          </div>
          <p className="text-gray-200 text-sm leading-relaxed">{lastExplanation}</p>
        </div>
      )}

      {/* Single Step Result */}
      {result && !episodeSteps.length && (
        <div className={`card border-2 ${STATE_COLORS[result.next_state]}`}>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Transition + Reward */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-300">State Transition</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <StateBadge state={result.state} />
                <span className="text-gray-500 text-lg">→</span>
                <ActionBadge action={result.action} />
                <span className="text-gray-500 text-lg">→</span>
                <StateBadge state={result.next_state} />
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Reward</p>
                  <p className={`font-mono font-bold text-2xl ${result.reward >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {result.reward > 0 ? '+' : ''}{result.reward.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Epsilon (exploration)</p>
                  <p className="font-mono text-blue-400 text-lg">{result.epsilon}</p>
                </div>
              </div>
            </div>

            {/* Q-Values */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-300">Q-Values — Why this action?</h3>
              <p className="text-xs text-gray-500">Higher = agent prefers this action from current state</p>
              {Object.entries(result.q_values).map(([label, val]) => (
                <QValueBar key={label} label={label} value={val} max={maxQ} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Episode Timeline */}
      {episodeSteps.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-200 text-lg">Episode Timeline</h3>
              <p className="text-gray-500 text-sm mt-0.5">
                {episodeRunning
                  ? `Running... step ${episodeSteps.length}`
                  : `Completed in ${episodeSteps.length} steps`}
                {episodeDone && episodeSteps[episodeSteps.length-1]?.next_state === 0 &&
                  <span className="ml-2 text-green-400 font-semibold">✓ Patient reached Healthy</span>}
              </p>
            </div>
            {episodeDone && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Total Reward</p>
                <p className={`text-2xl font-bold font-mono ${totalEpisodeReward >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalEpisodeReward > 0 ? '+' : ''}{totalEpisodeReward.toFixed(1)}
                </p>
              </div>
            )}
          </div>

          {/* Visual flow */}
          <div className="flex items-center gap-1 flex-wrap mb-6">
            {episodeSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`rounded-lg px-2 py-1 text-xs font-bold border ${STATE_COLORS[step.state]} ${STATE_BG[step.state]}`}>
                  S{step.state}
                </div>
                <div className="text-gray-600 text-xs">→{step.action_label.split(' ')[0]}→</div>
                {i === episodeSteps.length - 1 && (
                  <div className={`rounded-lg px-2 py-1 text-xs font-bold border ${STATE_COLORS[step.next_state]} ${STATE_BG[step.next_state]}`}>
                    S{step.next_state}
                  </div>
                )}
              </div>
            ))}
            {episodeRunning && (
              <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin ml-2" />
            )}
          </div>

          {/* Step table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left border-b border-gray-800">
                  <th className="pb-2 pr-4">Step</th>
                  <th className="pb-2 pr-4">From</th>
                  <th className="pb-2 pr-4">Action</th>
                  <th className="pb-2 pr-4">To</th>
                  <th className="pb-2 pr-4">Reward</th>
                  <th className="pb-2 pr-4">Cumulative</th>
                  <th className="pb-2">Explain</th>
                </tr>
              </thead>
              <tbody>
                {episodeSteps.map((s, i) => {
                  const cumulative = episodeSteps.slice(0, i+1).reduce((acc, r) => acc + r.reward, 0)
                  return (
                    <tr key={i} className={`border-b border-gray-800/50 ${s.next_state === 0 ? 'bg-green-500/5' : ''}`}>
                      <td className="py-2 pr-4 text-gray-500 font-mono">{s.stepNum}</td>
                      <td className="py-2 pr-4"><StateBadge state={s.state} /></td>
                      <td className="py-2 pr-4"><ActionBadge action={s.action} /></td>
                      <td className="py-2 pr-4"><StateBadge state={s.next_state} /></td>
                      <td className={`py-2 pr-4 font-mono font-bold ${s.reward >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {s.reward > 0 ? '+' : ''}{s.reward.toFixed(1)}
                      </td>
                      <td className={`py-2 pr-4 font-mono text-sm ${cumulative >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                        {cumulative > 0 ? '+' : ''}{cumulative.toFixed(1)}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => explainStep(s)}
                          disabled={llmLoading}
                          className="text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-lg transition-all disabled:opacity-40">
                          {llmLoading ? '...' : '🤖 Ask Claude'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step History */}
      {history.length > 0 && !episodeSteps.length && (
        <div className="card">
          <h3 className="font-semibold text-gray-300 mb-4">Step History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left border-b border-gray-800">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">State</th>
                  <th className="pb-2 pr-4">Action</th>
                  <th className="pb-2 pr-4">Next State</th>
                  <th className="pb-2">Reward</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="py-2 pr-4 text-gray-500">{i+1}</td>
                    <td className="py-2 pr-4"><StateBadge state={h.state} /></td>
                    <td className="py-2 pr-4"><ActionBadge action={h.action} /></td>
                    <td className="py-2 pr-4"><StateBadge state={h.next_state} /></td>
                    <td className={`py-2 font-mono font-bold ${h.reward >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {h.reward > 0 ? '+' : ''}{h.reward.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
