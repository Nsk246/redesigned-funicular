import { useState } from 'react'

const TRIAGE_TRANSITIONS = {
  0: { actions: [{ id: 'A0', name: 'Monitor', probs: [0.85, 0.12, 0.03, 0.00, 0.00] }] },
  1: { actions: [
    { id: 'A0', name: 'Monitor',   probs: [0.20, 0.50, 0.25, 0.05, 0.00] },
    { id: 'A1', name: 'Treat',     probs: [0.50, 0.35, 0.12, 0.03, 0.00] },
    { id: 'A2', name: 'Escalate',  probs: [0.60, 0.30, 0.08, 0.02, 0.00] },
  ]},
  2: { actions: [
    { id: 'A0', name: 'Monitor',   probs: [0.05, 0.15, 0.40, 0.30, 0.10] },
    { id: 'A1', name: 'Treat',     probs: [0.15, 0.35, 0.35, 0.12, 0.03] },
    { id: 'A2', name: 'Escalate',  probs: [0.25, 0.40, 0.25, 0.08, 0.02] },
    { id: 'A3', name: 'Emergency', probs: [0.20, 0.30, 0.30, 0.15, 0.05] },
  ]},
  3: { actions: [
    { id: 'A2', name: 'Escalate',  probs: [0.15, 0.30, 0.30, 0.20, 0.05] },
    { id: 'A3', name: 'Emergency', probs: [0.25, 0.35, 0.25, 0.12, 0.03] },
  ]},
  4: { actions: [
    { id: 'A2', name: 'Escalate',  probs: [0.00, 0.00, 0.25, 0.45, 0.30] },
    { id: 'A3', name: 'Emergency', probs: [0.00, 0.00, 0.45, 0.35, 0.20] },
  ]},
}

const SUPERVISOR_TRANSITIONS = {
  0: { actions: [{ id: 'B0', name: 'Standby',    probs: [0.80, 0.15, 0.04, 0.01, 0.00] }] },
  1: { actions: [
    { id: 'B0', name: 'Standby',         probs: [0.30, 0.45, 0.20, 0.05, 0.00] },
    { id: 'B1', name: 'Reallocate Staff', probs: [0.45, 0.40, 0.12, 0.03, 0.00] },
  ]},
  2: { actions: [
    { id: 'B0', name: 'Standby',         probs: [0.05, 0.20, 0.40, 0.25, 0.10] },
    { id: 'B1', name: 'Reallocate Staff', probs: [0.15, 0.35, 0.35, 0.12, 0.03] },
    { id: 'B2', name: 'Override Triage', probs: [0.20, 0.40, 0.28, 0.10, 0.02] },
    { id: 'B3', name: 'Request Backup',  probs: [0.25, 0.40, 0.25, 0.08, 0.02] },
  ]},
  3: { actions: [
    { id: 'B1', name: 'Reallocate Staff', probs: [0.00, 0.15, 0.30, 0.35, 0.20] },
    { id: 'B2', name: 'Override Triage', probs: [0.00, 0.20, 0.35, 0.30, 0.15] },
    { id: 'B3', name: 'Request Backup',  probs: [0.00, 0.35, 0.35, 0.20, 0.10] },
  ]},
  4: { actions: [
    { id: 'B2', name: 'Override Triage', probs: [0.00, 0.00, 0.20, 0.45, 0.35] },
    { id: 'B3', name: 'Request Backup',  probs: [0.00, 0.00, 0.40, 0.40, 0.20] },
  ]},
}

const STATE_COLORS = {
  0: 'bg-green-500/20  text-green-400  border-green-500/30',
  1: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  2: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  3: 'bg-red-500/20    text-red-400    border-red-500/30',
  4: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const STATE_BAR = {
  0: 'bg-green-500',
  1: 'bg-yellow-500',
  2: 'bg-orange-500',
  3: 'bg-red-500',
  4: 'bg-purple-500',
}

const TRIAGE_STATE_LABELS  = ['Healthy','At Risk','Unstable','Critical','Emergency']
const WARD_STATE_LABELS    = ['Calm','Active','Busy','Overloaded','Crisis']

function ProbBar({ prob, state }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 bg-gray-800 rounded-full h-2 flex-shrink-0">
        <div className={`${STATE_BAR[state]} h-2 rounded-full transition-all`}
             style={{ width: `${prob * 100}%` }} />
      </div>
      <span className="font-mono text-xs text-gray-400 w-10">{(prob * 100).toFixed(0)}%</span>
      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATE_COLORS[state]}`}>
        S{state} {TRIAGE_STATE_LABELS[state]}
      </span>
    </div>
  )
}

function WardProbBar({ prob, state }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 bg-gray-800 rounded-full h-2 flex-shrink-0">
        <div className={`${STATE_BAR[state]} h-2 rounded-full transition-all`}
             style={{ width: `${prob * 100}%` }} />
      </div>
      <span className="font-mono text-xs text-gray-400 w-10">{(prob * 100).toFixed(0)}%</span>
      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATE_COLORS[state]}`}>
        W{state} {WARD_STATE_LABELS[state]}
      </span>
    </div>
  )
}

function Section({ id, title, subtitle, children }) {
  return (
    <section id={id} className="space-y-4">
      <div className="border-l-4 border-blue-500 pl-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

export default function About() {
  const [activeTriageState,     setActiveTriageState]     = useState(2)
  const [activeSupervisorState, setActiveSupervisorState] = useState(2)

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">

      {/* Hero */}
      <div className="text-center py-10 space-y-4">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1.5 text-blue-400 text-sm font-semibold mb-2">
          AI Agent Course Project
        </div>
        <h1 className="text-4xl font-bold text-white">Hospital Triage AI</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          A hybrid Reinforcement Learning + LLM multi-agent system for intelligent patient triage and ward management
        </p>
        <div className="flex justify-center gap-3 flex-wrap pt-2">
          {['RL · DQN + Q-Learning','LLM · Claude API','Multi-Agent','FastAPI + React'].map(t => (
            <span key={t} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-full">{t}</span>
          ))}
        </div>
      </div>

      {/* Problem Statement */}
      <Section id="problem" title="Problem Statement" subtitle="What are we solving and why does it matter?">
        <div className="card">
          <p className="text-gray-300 leading-relaxed">
            Hospital triage is the process of prioritizing patients based on the severity of their condition.
            In a busy ward, nurses and doctors must simultaneously monitor multiple patients, detect deterioration
            early, and decide when to escalate care — all under time pressure and resource constraints.
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            Delayed escalation leads to preventable deterioration. Over-escalation wastes critical resources.
            When multiple patients deteriorate simultaneously, coordination breaks down. Our system addresses
            all three problems using AI agents that learn optimal policies through experience.
          </p>
        </div>

        {/* PEAS Framework */}
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              letter: 'P', title: 'Performance', color: 'text-green-400 bg-green-500/10 border-green-500/30',
              items: ['Patient state improvement over time','Correct escalation rate','Unnecessary escalation rate','Cumulative reward per episode','Ward stability score']
            },
            {
              letter: 'E', title: 'Environment', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
              items: ['Hospital ward with multiple patients','Partially observable — vitals only','Stochastic — same action, variable outcome','Dynamic — patient states change over time','Multi-agent — patients interact via ward resources']
            },
            {
              letter: 'A', title: 'Actuators', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
              items: ['Monitor — observe, no action','Treat — administer basic treatment','Escalate — call doctor immediately','Emergency Response — full emergency team','Supervisor: Reallocate staff, Override, Request Backup']
            },
            {
              letter: 'S', title: 'Sensors', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
              items: ['Heart rate, blood pressure, temperature, SpO2','Patient age and pre-existing conditions','Natural language input (via LLM)','Other patients\' states (Supervisor only)','Previous action outcomes (reward signal)']
            },
          ].map(p => (
            <div key={p.letter} className={`card border ${p.color.split(' ')[2]}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg border ${p.color}`}>
                  {p.letter}
                </span>
                <h3 className="font-bold text-white">{p.title}</h3>
              </div>
              <ul className="space-y-1.5">
                {p.items.map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="text-gray-600 mt-0.5">·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Why Only AI */}
      <Section id="why-ai" title="Why Can Only AI Solve This?" subtitle="Why a rule-based system fundamentally fails here">
        <div className="space-y-3">
          {[
            {
              icon: '❌', title: 'Rule-based systems break under combinatorial complexity',
              body: 'A rule like "if HR > 100 and BP > 140, alert nurse" ignores context. The same vitals mean different things for a 25-year-old athlete vs a 70-year-old diabetic post-surgery. The combination of vitals, age, conditions, and trend creates thousands of meaningful configurations — no finite ruleset can handle this.',
              color: 'border-red-500/20 bg-red-500/5'
            },
            {
              icon: '⏳', title: 'Triage requires sequential decision-making over time',
              body: 'A single vital reading means almost nothing. What matters is the trajectory: HR 95 → 100 → 110 over three hours demands different action than HR 110 → 100 → 95. This is exactly the Markov Decision Process framework — each state carries history, and the optimal action depends on the sequence, not just the current moment.',
              color: 'border-yellow-500/20 bg-yellow-500/5'
            },
            {
              icon: '🎲', title: 'Outcomes are inherently probabilistic',
              body: 'Even the correct action does not guarantee improvement. A patient can deteriorate despite perfect care. The RL agent learns to maximize expected reward over probability distributions — it picks the action most likely to lead to improvement, not the action guaranteed to improve. No deterministic rule can model this.',
              color: 'border-orange-500/20 bg-orange-500/5'
            },
            {
              icon: '📈', title: 'The system must adapt — patients are not static',
              body: 'Patient populations change. A rule written for one ICU does not transfer to another. The RL agent continuously updates its Q-values based on observed outcomes. After 2000 training episodes, the agent has learned policies that no human-written ruleset could match.',
              color: 'border-blue-500/20 bg-blue-500/5'
            },
            {
              icon: '🗣️', title: 'Natural language interaction requires intelligence',
              body: 'User will not type structured data. He says: "Patient in bed 4 looks off, heart rate climbing, seems anxious." No rule-based system parses clinical intent from unstructured text. The LLM layer extracts vitals, maps them to states, and generates context-aware personalized explanations — not canned messages.',
              color: 'border-green-500/20 bg-green-500/5'
            },
          ].map(r => (
            <div key={r.title} className={`card border ${r.color}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{r.icon}</span>
                <div>
                  <h3 className="font-bold text-white mb-1">{r.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{r.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="card">
          <h3 className="font-semibold text-gray-300 mb-4">Rule-Based vs AI Agent</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="pb-2 text-left">Requirement</th>
                <th className="pb-2 text-center">Rule-Based</th>
                <th className="pb-2 text-center">RL + LLM Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {[
                ['Handles vital combinations',        '❌ Explodes',          '✅ State space'],
                ['Learns from outcomes',              '❌ Never',             '✅ Q-table updates'],
                ['Adapts over time',                  '❌ Frozen',            '✅ Continuous training'],
                ['Handles probabilistic outcomes',    '❌ Assumes certainty', '✅ Expected reward'],
                ['Natural language I/O',              '❌ Structured only',   '✅ LLM layer'],
                ['Personalized responses',            '❌ Canned messages',   '✅ Context-aware'],
                ['Multi-patient coordination',        '❌ Independent only',  '✅ Supervisor Agent'],
              ].map(([req, no, yes]) => (
                <tr key={req}>
                  <td className="py-2.5 text-gray-300">{req}</td>
                  <td className="py-2.5 text-center text-red-400 text-xs">{no}</td>
                  <td className="py-2.5 text-center text-green-400 text-xs">{yes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* AI Workflow */}
      <Section id="workflow" title="AI Workflow" subtitle="How RL and LLM work together — each doing only what it's good at">
        <div className="card">
          <div className="space-y-0">
            {[
              { icon: '🎙️', label: 'User input',      desc: 'Natural language input — vitals, observations, concerns',             color: 'bg-blue-500'   },
              { icon: '🤖', label: 'LLM (Claude API)',     desc: 'Parses text → extracts vitals → maps to structured state S0–S4',      color: 'bg-purple-500' },
              { icon: '🧠', label: 'RL Agent (DQN)',       desc: 'Receives state → looks up Q(s,a) → selects optimal action',           color: 'bg-orange-500' },
              { icon: '🤖', label: 'LLM (Claude API)',     desc: 'Receives (state, action, next_state) → generates clinical explanation', color: 'bg-purple-500' },
              { icon: '👨‍⚕️', label: 'User reads',      desc: 'Personalized clinical explanation with reasoning and recommendations', color: 'bg-green-500'  },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-xl ${step.color} flex items-center justify-center text-lg flex-shrink-0`}>
                    {step.icon}
                  </div>
                  {i < 4 && <div className="w-0.5 h-6 bg-gray-700 mt-1" />}
                </div>
                <div className="pt-2 pb-4">
                  <p className="font-semibold text-white text-sm">{step.label}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card bg-gray-800/30">
          <h3 className="font-semibold text-gray-300 mb-3">The Key Separation</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
              <p className="text-orange-400 font-bold text-sm mb-2">RL Agent — The Brain</p>
              <p className="text-gray-400 text-sm">Decides WHAT to do. Never speaks. Never sees text. Only knows state numbers and Q-values.</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <p className="text-purple-400 font-bold text-sm mb-2">LLM — The Voice</p>
              <p className="text-gray-400 text-sm">Decides HOW to say it. Never makes medical decisions. Only translates between human language and structured data.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Triage Agent MDP */}
      <Section id="triage-mdp" title="Triage Agent — MDP Design" subtitle="Phase 1 · DQN-based · Manages a single patient">

        {/* States */}
        <div className="card">
          <h3 className="font-semibold text-gray-300 mb-4">States (S0–S4)</h3>
          <div className="space-y-2">
            {[
              { s:0, desc:'All vitals within normal range. No clinical concern.',                                  vitals:'HR 60–100, BP 90–140, Temp 36–38, SpO2 ≥ 95' },
              { s:1, desc:'One vital mildly out of range. Patient flagged for monitoring.',                        vitals:'HR 100–120, BP 140–160, Temp 38–39, SpO2 92–95' },
              { s:2, desc:'Multiple vitals elevated. Patient needs active attention.',                             vitals:'HR 120–140, BP 160–180, Temp 39–40, SpO2 88–92' },
              { s:3, desc:'Dangerous readings. Urgent response required immediately.',                             vitals:'HR > 140, BP > 180, Temp > 40, SpO2 < 88' },
              { s:4, desc:'Life-threatening. Immediate emergency intervention required.',                          vitals:'Extreme values across multiple vitals, rapid deterioration' },
            ].map(({ s, desc, vitals }) => (
              <div key={s} className={`flex items-start gap-4 p-3 rounded-xl border ${STATE_COLORS[s]}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border flex-shrink-0 ${STATE_COLORS[s]}`}>
                  S{s}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{TRIAGE_STATE_LABELS[s]}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
                  <p className="text-gray-600 text-xs mt-1 font-mono">{vitals}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="card">
          <h3 className="font-semibold text-gray-300 mb-4">Actions (A0–A3) + Legal Action Mask</h3>
          <div className="space-y-3">
            {[
              { a:'A0', name:'Monitor',            desc:'Observe and log vitals. No clinical intervention.',                    legal:[0,1,2],   color:'text-blue-400   bg-blue-500/10   border-blue-500/30' },
              { a:'A1', name:'Treat',              desc:'Administer medication or basic treatment protocol.',                   legal:[1,2],     color:'text-teal-400   bg-teal-500/10   border-teal-500/30' },
              { a:'A2', name:'Escalate',           desc:'Call doctor or specialist for immediate assessment.',                  legal:[1,2,3,4], color:'text-orange-400 bg-orange-500/10 border-orange-500/30' },
              { a:'A3', name:'Emergency Response', desc:'Trigger full emergency team response. Highest resource cost.',         legal:[2,3,4],   color:'text-red-400    bg-red-500/10    border-red-500/30' },
            ].map(action => (
              <div key={action.a} className={`p-3 rounded-xl border ${action.color}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`font-black text-sm px-2 py-1 rounded-lg border ${action.color}`}>{action.a}</span>
                    <div>
                      <p className="font-bold text-white text-sm">{action.name}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{action.desc}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500 mb-1">Legal in states</p>
                    <div className="flex gap-1">
                      {[0,1,2,3,4].map(s => (
                        <span key={s} className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold border ${
                          action.legal.includes(s) ? STATE_COLORS[s] : 'text-gray-700 border-gray-700 bg-gray-900'
                        }`}>S{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transition Probabilities — Interactive */}
        <div className="card">
          <h3 className="font-semibold text-gray-300 mb-2">Transition Probabilities P(s' | s, a)</h3>
          <p className="text-gray-500 text-xs mb-4">Select a state to see all legal actions and their outcome distributions. Each row sums to 100%.</p>

          <div className="flex gap-2 mb-5 flex-wrap">
            {[0,1,2,3,4].map(s => (
              <button key={s} onClick={() => setActiveTriageState(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  activeTriageState === s ? STATE_COLORS[s] : 'text-gray-500 border-gray-700 bg-gray-900'
                }`}>
                S{s} · {TRIAGE_STATE_LABELS[s]}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {TRIAGE_TRANSITIONS[activeTriageState].actions.map(action => (
              <div key={action.id} className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-black text-white bg-gray-700 px-2 py-1 rounded-lg">{action.id}</span>
                  <span className="text-sm font-semibold text-white">{action.name}</span>
                  <span className="text-xs text-gray-500 ml-auto">from S{activeTriageState} ({TRIAGE_STATE_LABELS[activeTriageState]})</span>
                </div>
                <div className="space-y-2">
                  {action.probs.map((p, s) => p > 0 && (
                    <ProbBar key={s} prob={p} state={s} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rewards */}
        <div className="card">
          <h3 className="font-semibold text-gray-300 mb-4">Reward Function R(s, a, s')</h3>
          <div className="space-y-3">
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-3 font-mono">Base reward = (current_state - next_state) × 10</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { case:'Patient improves',       formula:'+(steps improved) × 10', example:'S3→S1 = +20', color:'text-green-400' },
                  { case:'Patient stays same',     formula:'0',                       example:'S2→S2 = 0',   color:'text-gray-400'  },
                  { case:'Patient worsens',        formula:'-(steps worsened) × 10', example:'S1→S3 = -20', color:'text-red-400'   },
                ].map(r => (
                  <div key={r.case} className="text-center">
                    <p className="text-gray-500 text-xs mb-1">{r.case}</p>
                    <p className={`font-mono font-bold ${r.color}`}>{r.example}</p>
                    <p className="text-gray-600 text-xs">{r.formula}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {[
                { cond:'S4 → S4 (stuck in emergency)',              mod:'-30',  color:'text-red-400',    bg:'bg-red-500/5    border-red-500/20'    },
                { cond:'S3/S4 + Monitor/Treat (under-action)',      mod:'-20',  color:'text-red-400',    bg:'bg-red-500/5    border-red-500/20'    },
                { cond:'S0/S1 + Emergency Response (over-escalation)', mod:'-15', color:'text-orange-400', bg:'bg-orange-500/5 border-orange-500/20' },
                { cond:'S4 + Emergency → S2 or better (patient saved)', mod:'+25', color:'text-green-400',  bg:'bg-green-500/5  border-green-500/20'  },
              ].map(r => (
                <div key={r.cond} className={`flex items-center justify-between p-3 rounded-xl border ${r.bg}`}>
                  <span className="text-gray-300 text-sm">{r.cond}</span>
                  <span className={`font-mono font-bold ${r.color}`}>{r.mod}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Supervisor Agent MDP */}
      <Section id="supervisor-mdp" title="Supervisor Agent — MDP Design" subtitle="Phase 2 · Q-Learning · Manages the entire ward">

        {/* Ward States */}
        <div className="card">
          <h3 className="font-semibold text-gray-300 mb-4">Ward States (W0–W4)</h3>
          <div className="space-y-2 mb-4">
            {[
              { s:0, desc:'No patients above S1.',                              rule:'All patients S0 or S1' },
              { s:1, desc:'1–2 patients at S2 (Unstable).',                     rule:'count(S2) ≥ 1' },
              { s:2, desc:'3+ patients at S2, or 1 patient at S3.',             rule:'count(S2) ≥ 3 OR count(S3) = 1' },
              { s:3, desc:'2+ patients at S3, or 1 patient at S4.',             rule:'count(S3) ≥ 2 OR count(S4) = 1' },
              { s:4, desc:'2+ patients at S4, or multiple agents conflicting.', rule:'count(S4) ≥ 2' },
            ].map(({ s, desc, rule }) => (
              <div key={s} className={`flex items-center gap-4 p-3 rounded-xl border ${STATE_COLORS[s]}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black border flex-shrink-0 ${STATE_COLORS[s]}`}>
                  W{s}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{WARD_STATE_LABELS[s]}</p>
                  <p className="text-gray-400 text-xs">{desc}</p>
                </div>
                <code className="text-xs text-gray-500 font-mono bg-gray-900 px-2 py-1 rounded">{rule}</code>
              </div>
            ))}
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 text-xs font-mono text-gray-400">
            <p className="text-gray-300 font-bold mb-2">Ward state derivation (runs every timestep):</p>
            <p>if count(S4) ≥ 2                        → W4 Crisis</p>
            <p>elif count(S4) = 1 OR count(S3) ≥ 2    → W3 Overloaded</p>
            <p>elif count(S3) = 1 OR count(S2) ≥ 3    → W2 Busy</p>
            <p>elif count(S2) ≥ 1                      → W1 Active</p>
            <p>else                                     → W0 Calm</p>
          </div>
        </div>

        {/* Supervisor Actions */}
        <div className="card">
          <h3 className="font-semibold text-gray-300 mb-4">Supervisor Actions (B0–B3)</h3>
          <div className="space-y-3">
            {[
              { b:'B0', name:'Standby',         desc:'Trust Triage Agents. No ward-level intervention.',                     legal:[0,1,2],   color:'text-blue-400   bg-blue-500/10   border-blue-500/30' },
              { b:'B1', name:'Reallocate Staff', desc:'Move nursing staff to highest-priority patient.',                     legal:[1,2,3],   color:'text-teal-400   bg-teal-500/10   border-teal-500/30' },
              { b:'B2', name:'Override Triage', desc:'Force a Triage Agent\'s action up one level (A1→A2, A2→A3).',         legal:[2,3,4],   color:'text-purple-400 bg-purple-500/10 border-purple-500/30' },
              { b:'B3', name:'Request Backup',  desc:'Call for additional staff/resources from outside the ward.',           legal:[2,3,4],   color:'text-red-400    bg-red-500/10    border-red-500/30' },
            ].map(action => (
              <div key={action.b} className={`p-3 rounded-xl border ${action.color}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`font-black text-sm px-2 py-1 rounded-lg border ${action.color}`}>{action.b}</span>
                    <div>
                      <p className="font-bold text-white text-sm">{action.name}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{action.desc}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500 mb-1">Legal in states</p>
                    <div className="flex gap-1">
                      {[0,1,2,3,4].map(s => (
                        <span key={s} className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold border ${
                          action.legal.includes(s) ? STATE_COLORS[s] : 'text-gray-700 border-gray-700 bg-gray-900'
                        }`}>W{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Supervisor Transitions */}
        <div className="card">
          <h3 className="font-semibold text-gray-300 mb-2">Ward Transition Probabilities P(w' | w, b)</h3>
          <p className="text-gray-500 text-xs mb-4">Select a ward state to see supervisor action outcomes.</p>

          <div className="flex gap-2 mb-5 flex-wrap">
            {[0,1,2,3,4].map(s => (
              <button key={s} onClick={() => setActiveSupervisorState(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  activeSupervisorState === s ? STATE_COLORS[s] : 'text-gray-500 border-gray-700 bg-gray-900'
                }`}>
                W{s} · {WARD_STATE_LABELS[s]}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {SUPERVISOR_TRANSITIONS[activeSupervisorState].actions.map(action => (
              <div key={action.id} className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-black text-white bg-gray-700 px-2 py-1 rounded-lg">{action.id}</span>
                  <span className="text-sm font-semibold text-white">{action.name}</span>
                  <span className="text-xs text-gray-500 ml-auto">from W{activeSupervisorState} ({WARD_STATE_LABELS[activeSupervisorState]})</span>
                </div>
                <div className="space-y-2">
                  {action.probs.map((p, s) => p > 0 && (
                    <WardProbBar key={s} prob={p} state={s} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Supervisor Rewards */}
        <div className="card">
          <h3 className="font-semibold text-gray-300 mb-4">Supervisor Reward Function R(w, b, w')</h3>
          <div className="space-y-2">
            {[
              { cond:'Ward improves',                                    mod:'+(steps improved) × 10', color:'text-green-400', bg:'bg-green-500/5  border-green-500/20'  },
              { cond:'Ward stays same',                                  mod:'0',                      color:'text-gray-400',  bg:'bg-gray-800     border-gray-700'      },
              { cond:'Ward worsens',                                     mod:'-(steps worsened) × 10', color:'text-red-400',   bg:'bg-red-500/5    border-red-500/20'    },
              { cond:'W4 → W4 (crisis persists)',                       mod:'-30',                    color:'text-red-400',   bg:'bg-red-500/5    border-red-500/20'    },
              { cond:'W3/W4 + Standby (under-action)',                   mod:'-25',                    color:'text-red-400',   bg:'bg-red-500/5    border-red-500/20'    },
              { cond:'W0/W1 + Request Backup (wasteful escalation)',     mod:'-10',                    color:'text-orange-400',bg:'bg-orange-500/5 border-orange-500/20' },
              { cond:'W4 + Backup → W2 or better (crisis resolved)',    mod:'+25',                    color:'text-green-400', bg:'bg-green-500/5  border-green-500/20'  },
            ].map(r => (
              <div key={r.cond} className={`flex items-center justify-between p-3 rounded-xl border ${r.bg}`}>
                <span className="text-gray-300 text-sm">{r.cond}</span>
                <span className={`font-mono font-bold ${r.color}`}>{r.mod}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Multi-Agent Communication */}
      <Section id="multi-agent" title="Multi-Agent Communication" subtitle="How Phase 1 becomes Phase 2">
        <div className="card">
          <div className="space-y-4 text-sm text-gray-300">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <p className="text-blue-400 font-bold mb-2">Phase 1 — Independent</p>
                <p className="text-gray-400">Each Triage Agent sees only its own patient. Decisions are made in isolation. No agent knows what others are doing.</p>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-emerald-400 font-bold mb-2">Phase 2 — Coordinated</p>
                <p className="text-gray-400">Supervisor aggregates all patient states into a ward state. Can override any Triage Agent or request backup for the whole ward.</p>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4 font-mono text-xs space-y-1 text-gray-400">
              <p className="text-gray-300 font-bold mb-2">Every timestep:</p>
              <p>1. Each Triage Agent observes patient → selects action → transitions state</p>
              <p>2. Reports (patient_id, state, action, next_state) to Supervisor</p>
              <p>3. Supervisor aggregates → derives ward state W</p>
              <p>4. Supervisor selects ward action B</p>
              <p>5. If B = Override: forces highest-risk Triage Agent's action up one level</p>
              <p>6. All agents update Q-values from their own rewards</p>
              <p>7. LLM generates ward report for Dr. Roy</p>
            </div>

            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
              <p className="text-purple-400 font-bold mb-2">Override Protocol</p>
              <p className="text-gray-400">When Supervisor selects B2 (Override), it identifies the most critical patient, forces that Triage Agent's action up one level (A1→A2 or A2→A3), and takes responsibility for the reward. The Triage Agent's Q-table is not updated for that step — it did not make the decision.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Tech Stack */}
      <Section id="tech" title="Tools & Technologies">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { cat:'Backend',    icon:'🐍', items:['Python 3.12','FastAPI — REST API','PyTorch — DQN neural network','NumPy — Q-table operations','Anthropic SDK — Claude API'] },
            { cat:'RL & AI',    icon:'🧠', items:['Deep Q-Network (DQN)','Experience Replay Buffer','Target Network (stability)','Tabular Q-Learning (Supervisor)','Epsilon-greedy exploration'] },
            { cat:'Frontend',   icon:'⚛️', items:['React + Vite','TailwindCSS','Recharts — reward visualization','Axios — API calls','GitHub Codespaces deployment'] },
          ].map(s => (
            <div key={s.cat} className="card">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{s.icon}</span>
                <h3 className="font-bold text-white">{s.cat}</h3>
              </div>
              <ul className="space-y-1.5">
                {s.items.map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

    </div>
  )
}
