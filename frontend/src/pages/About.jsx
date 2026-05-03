import { useState } from 'react'
import StateBadge from '../components/StateBadge'
import { ActionBadge, WardActionBadge } from '../components/ActionBadge'

const TRIAGE_TRANSITIONS = {
  0:[{id:'A0',name:'Monitor',   probs:[0.85,0.12,0.03,0.00,0.00]}],
  1:[{id:'A0',name:'Monitor',   probs:[0.20,0.50,0.25,0.05,0.00]},
     {id:'A1',name:'Treat',     probs:[0.50,0.35,0.12,0.03,0.00]},
     {id:'A2',name:'Escalate',  probs:[0.60,0.30,0.08,0.02,0.00]}],
  2:[{id:'A0',name:'Monitor',   probs:[0.05,0.15,0.40,0.30,0.10]},
     {id:'A1',name:'Treat',     probs:[0.15,0.35,0.35,0.12,0.03]},
     {id:'A2',name:'Escalate',  probs:[0.25,0.40,0.25,0.08,0.02]},
     {id:'A3',name:'Emergency', probs:[0.20,0.30,0.30,0.15,0.05]}],
  3:[{id:'A2',name:'Escalate',  probs:[0.15,0.30,0.30,0.20,0.05]},
     {id:'A3',name:'Emergency', probs:[0.25,0.35,0.25,0.12,0.03]}],
  4:[{id:'A2',name:'Escalate',  probs:[0.00,0.00,0.25,0.45,0.30]},
     {id:'A3',name:'Emergency', probs:[0.00,0.00,0.45,0.35,0.20]}],
}

const SUPERVISOR_TRANSITIONS = {
  0:[{id:'B0',name:'Standby',    probs:[0.80,0.15,0.04,0.01,0.00]}],
  1:[{id:'B0',name:'Standby',    probs:[0.30,0.45,0.20,0.05,0.00]},
     {id:'B1',name:'Reallocate', probs:[0.45,0.40,0.12,0.03,0.00]}],
  2:[{id:'B0',name:'Standby',    probs:[0.05,0.20,0.40,0.25,0.10]},
     {id:'B1',name:'Reallocate', probs:[0.15,0.35,0.35,0.12,0.03]},
     {id:'B2',name:'Override',   probs:[0.20,0.40,0.28,0.10,0.02]},
     {id:'B3',name:'Backup',     probs:[0.25,0.40,0.25,0.08,0.02]}],
  3:[{id:'B1',name:'Reallocate', probs:[0.00,0.15,0.30,0.35,0.20]},
     {id:'B2',name:'Override',   probs:[0.00,0.20,0.35,0.30,0.15]},
     {id:'B3',name:'Backup',     probs:[0.00,0.35,0.35,0.20,0.10]}],
  4:[{id:'B2',name:'Override',   probs:[0.00,0.00,0.20,0.45,0.35]},
     {id:'B3',name:'Backup',     probs:[0.00,0.00,0.40,0.40,0.20]}],
}

const STATE_COLORS = [
  { color:'#4ade80', bg:'rgba(34,197,94,0.1)',   border:'rgba(34,197,94,0.25)'   },
  { color:'#a5b4fc', bg:'rgba(99,102,241,0.1)',  border:'rgba(99,102,241,0.25)'  },
  { color:'#60a5fa', bg:'rgba(96,165,250,0.1)',  border:'rgba(96,165,250,0.25)'  },
  { color:'#fb7185', bg:'rgba(251,113,133,0.1)', border:'rgba(251,113,133,0.25)' },
  { color:'#c084fc', bg:'rgba(192,132,252,0.1)', border:'rgba(192,132,252,0.25)' },
]
const WARD_COLORS = [
  { color:'#4ade80', bg:'rgba(34,197,94,0.1)',   border:'rgba(34,197,94,0.25)'   },
  { color:'#67e8f9', bg:'rgba(103,232,249,0.1)', border:'rgba(103,232,249,0.25)' },
  { color:'#a5b4fc', bg:'rgba(99,102,241,0.1)',  border:'rgba(99,102,241,0.25)'  },
  { color:'#60a5fa', bg:'rgba(96,165,250,0.1)',  border:'rgba(96,165,250,0.25)'  },
  { color:'#fb7185', bg:'rgba(251,113,133,0.1)', border:'rgba(251,113,133,0.25)' },
]
const STATE_LABELS = ['Healthy','At Risk','Unstable','Critical','Emergency']
const WARD_LABELS  = ['Calm','Active','Busy','Overloaded','Crisis']
const PROB_COLORS  = ['#4ade80','#a5b4fc','#60a5fa','#fb7185','#c084fc']
const WARD_PROB_COLORS = ['#4ade80','#67e8f9','#a5b4fc','#60a5fa','#fb7185']

function STag({ s }) {
  const c = STATE_COLORS[s]
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:20, fontSize:'clamp(13px,1vw,15px)', fontWeight:700, fontFamily:'DM Sans,sans-serif', background:c.bg, color:c.color, border:`1px solid ${c.border}`, whiteSpace:'nowrap' }}>
      S{s} · {STATE_LABELS[s]}
    </span>
  )
}

function WTag({ w }) {
  const c = WARD_COLORS[w]
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:20, fontSize:'clamp(13px,1vw,15px)', fontWeight:700, fontFamily:'DM Sans,sans-serif', background:c.bg, color:c.color, border:`1px solid ${c.border}`, whiteSpace:'nowrap' }}>
      W{w} · {WARD_LABELS[w]}
    </span>
  )
}

function Section({ title, sub, accent='#2563eb', children }) {
  return (
    <section style={{ display:'flex', flexDirection:'column', gap:'clamp(14px,1.4vw,20px)' }}>
      <div style={{ borderLeft:`3px solid ${accent}`, paddingLeft:'clamp(10px,1vw,14px)' }}>
        <h2 style={{ color:'#ffffff', fontSize:'clamp(16px,1.6vw,22px)', fontWeight:700, letterSpacing:'-0.02em', marginBottom:4 }}>{title}</h2>
        {sub && <p style={{ color:'#4a6080', fontSize:'clamp(14px,1.1vw,16px)' }}>{sub}</p>}
      </div>
      {children}
    </section>
  )
}

function ProbTable({ data, isWard=false }) {
  if (!data || !data.actions || !data.actions.length) return null;
  const colors = isWard ? WARD_PROB_COLORS : PROB_COLORS
  const sc     = isWard ? WARD_COLORS : STATE_COLORS
  const labels = isWard ? WARD_LABELS : STATE_LABELS
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {data.actions.map(action => (
        <div key={action.id} style={{ background:'#081020', border:'1px solid #1e3050', borderRadius:10, padding:'clamp(12px,1.2vw,16px)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span style={{ background:'#0f1f3d', border:'1px solid #1e3050', color:'#8099b8', fontSize:'clamp(13px,1vw,15px)', fontWeight:700, padding:'2px 8px', borderRadius:5, fontFamily:'JetBrains Mono,monospace' }}>{action.id}</span>
            <span style={{ color:'#8099b8', fontSize:'clamp(12px,1.1vw,14px)', fontWeight:600 }}>{action.name}</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {action.probs.map((p, i) => p > 0 && (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:'clamp(80px,9vw,110px)', background:'#0a1628', borderRadius:3, height:4, flexShrink:0 }}>
                  <div style={{ width:`${p*100}%`, height:'100%', background:colors[i], borderRadius:3 }}/>
                </div>
                <span style={{ color:'#4a6080', fontSize:'clamp(13px,1vw,14px)', fontFamily:'JetBrains Mono,monospace', width:26 }}>{(p*100).toFixed(0)}%</span>
                <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:20, fontSize:'clamp(13px,1vw,15px)', fontWeight:700, background:sc[i].bg, color:sc[i].color, border:`1px solid ${sc[i].border}` }}>
                  {isWard ? `W${i}` : `S${i}`} · {labels[i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Vital scoring helper mirrors backend logic
function scoreVital(key, val) {
  // Matches state_mapper.py exactly — cumulative scoring
  const scores = {
    hr:     val > 140 || val < 40  ? 3 : val > 120 || val < 50 ? 2 : val > 100 || val < 60 ? 1 : 0,
    bp_sys: val > 180 || val < 80  ? 3 : val > 160 || val < 90 ? 2 : val > 140 || val < 100 ? 1 : 0,
    spo2:   val < 88 ? 3 : val < 92 ? 2 : val < 95 ? 1 : 0,
    temp:   val > 40 || val < 35   ? 3 : val > 39 || val < 36  ? 2 : val > 38 ? 1 : 0,
  }
  return scores[key] ?? 0
}

export default function About() {
  const [triageState,     setTriageState]     = useState(2)
  const [supervisorState, setSupervisorState] = useState(2)
  const [demoVitals, setDemoVitals] = useState({ hr:134, bp_sys:182, bp_dia:110, temp:39.4, spo2:89, age:67, conditions:2 })

  const vitalScores = {
    hr:    scoreVital('hr',    demoVitals.hr),
    bp_sys:scoreVital('bp_sys',demoVitals.bp_sys),
    spo2:  scoreVital('spo2',  demoVitals.spo2),
    temp:  scoreVital('temp',  demoVitals.temp),
  }
  const totalScore = Object.values(vitalScores).reduce((a,b)=>a+b, 0)
  const mappedState = totalScore === 0 ? 0 : totalScore <= 2 ? 1 : totalScore <= 5 ? 2 : totalScore <= 8 ? 3 : 4

  return (
    <div style={{ maxWidth:960, margin:'0 auto', display:'flex', flexDirection:'column', gap:'clamp(40px,5vw,64px)', paddingBottom:80 }}>

      {/* Hero */}
      <div style={{ textAlign:'center', padding:'clamp(32px,4vw,56px) 0 clamp(16px,2vw,24px)' }}>
        <div style={{ display:'inline-flex', alignItems:'center', background:'rgba(37,99,235,0.15)', border:'1px solid rgba(37,99,235,0.2)', borderRadius:20, padding:'4px 14px', marginBottom:16 }}>
          <span style={{ color:'#60a5fa', fontSize:'clamp(13px,1vw,15px)', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' }}>AI Agent Course Project</span>
        </div>
        <h1 style={{ color:'#ffffff', fontSize:'clamp(28px,4vw,48px)', fontWeight:800, letterSpacing:'-0.03em', marginBottom:14, lineHeight:1.1 }}>Hospital Triage AI</h1>
        <p style={{ color:'#4a6080', fontSize:'clamp(13px,1.2vw,16px)', maxWidth:560, margin:'0 auto clamp(16px,2vw,24px)', lineHeight:1.7 }}>
          A hybrid Reinforcement Learning + LLM multi-agent system for intelligent patient triage and ward management
        </p>
        <div style={{ display:'flex', justifyContent:'center', flexWrap:'wrap', gap:8 }}>
          {['RL · DQN + Q-Learning','LLM · Claude API','Multi-Agent System','FastAPI + React'].map(t => (
            <span key={t} style={{ background:'#0f1f3d', border:'1px solid #1e3050', color:'#4a6080', fontSize:'clamp(14px,1.1vw,16px)', padding:'5px 14px', borderRadius:20 }}>{t}</span>
          ))}
        </div>
      </div>

      {/* How Vitals Map to States */}
      <Section title="How Vitals Map to States" sub="The exact scoring algorithm that converts patient measurements into S0–S4" accent="#60a5fa">

        {/* Interactive demo */}
        <div className="card-glow">
          <div className="t-label" style={{ marginBottom:12 }}>Live Demo Edit vitals and watch the state update</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10, marginBottom:16 }}>
            {[
              { key:'hr',    label:'Heart Rate',  unit:'bpm'  },
              { key:'bp_sys',label:'BP Systolic', unit:'mmHg' },
              { key:'spo2',  label:'SpO2',        unit:'%'    },
              { key:'temp',  label:'Temperature', unit:'°C'   },
            ].map(f => {
              const score = vitalScores[f.key]
              const scoreColor = ['#4ade80','#a5b4fc','#60a5fa','#fb7185','#c084fc'][score]
              return (
                <div key={f.key} style={{ background:'#081020', border:`1px solid ${scoreColor}33`, borderRadius:8, padding:'clamp(8px,0.9vw,12px)' }}>
                  <div style={{ color:'#4a6080', fontSize:'clamp(12px,0.9vw,13px)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{f.label}</div>
                  <input type="number" step={f.key==='temp'?0.1:1} value={demoVitals[f.key]}
                    onChange={e => setDemoVitals(v => ({ ...v, [f.key]: parseFloat(e.target.value) }))}
                    style={{ background:'transparent', border:'none', outline:'none', color:scoreColor, fontSize:'clamp(16px,1.6vw,22px)', fontFamily:'JetBrains Mono,monospace', fontWeight:700, width:'100%', padding:0 }} />
                  <div style={{ color:'#4a6080', fontSize:'clamp(12px,0.9vw,13px)', marginTop:2 }}>{f.unit}</div>
                  <div style={{ marginTop:6, background:'#0a1628', borderRadius:3, height:3 }}>
                    <div style={{ width:`${(score/4)*100}%`, height:'100%', background:scoreColor, borderRadius:3, transition:'width 0.3s' }}/>
                  </div>
                  <div style={{ color:scoreColor, fontSize:'clamp(12px,0.9vw,13px)', marginTop:3, fontWeight:600 }}>Score: {score}/4</div>
                </div>
              )
            })}
          </div>

          {/* Scoring explanation */}
          <div style={{ background:'#081020', border:'1px solid #1e3050', borderRadius:10, padding:'clamp(12px,1.2vw,16px)', marginBottom:14 }}>
            <div className="t-label" style={{ marginBottom:10 }}>Scoring Logic</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10, fontSize:'clamp(13px,1vw,15px)', color:'#4a6080', fontFamily:'JetBrains Mono,monospace', lineHeight:1.8 }}>
              <div>
                <div style={{ color:'#60a5fa', fontWeight:700, marginBottom:4 }}>Heart Rate</div>
                <div>&gt;140 or &lt;40 → +3</div>
                <div>&gt;120 or &lt;50 → +2</div>
                <div>&gt;100 or &lt;60 → +1</div>
                <div>60–100 → +0</div>
              </div>
              <div>
                <div style={{ color:'#60a5fa', fontWeight:700, marginBottom:4 }}>BP Systolic</div>
                <div>&gt;180 or &lt;80 → +3</div>
                <div>&gt;160 or &lt;90 → +2</div>
                <div>&gt;140 or &lt;100 → +1</div>
                <div>100–140 → +0</div>
              </div>
              <div>
                <div style={{ color:'#60a5fa', fontWeight:700, marginBottom:4 }}>SpO2</div>
                <div>&lt;88% → +3</div>
                <div>&lt;92% → +2</div>
                <div>&lt;95% → +1</div>
                <div>≥95% → +0</div>
              </div>
              <div>
                <div style={{ color:'#60a5fa', fontWeight:700, marginBottom:4 }}>Temperature</div>
                <div>&gt;40°C or &lt;35°C → +3</div>
                <div>&gt;39°C or &lt;36°C → +2</div>
                <div>&gt;38°C → +1</div>
                <div>36–38°C → +0</div>
              </div>
              <div>
                <div style={{ color:'#60a5fa', fontWeight:700, marginBottom:4 }}>Risk Modifiers</div>
                <div>Age &gt;70 → +1</div>
                <div>Conditions ≥2 → +1</div>
              </div>
            </div>
            <div style={{ marginTop:12, background:'rgba(96,165,250,0.06)', border:'1px solid rgba(96,165,250,0.15)', borderRadius:8, padding:'10px 12px' }}>
              <span style={{ color:'#60a5fa', fontWeight:600, fontSize:'clamp(14px,1.1vw,16px)' }}>Rule: </span>
              <span style={{ color:'#8099b8', fontSize:'clamp(14px,1.1vw,16px)' }}>Final state = sum of all vital scores + risk modifiers. Total 0→S0, 1-2→S1, 3-5→S2, 6-8→S3, 9+→S4</span>
            </div>
          </div>

          {/* Live result */}
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', background:'#081020', border:'1px solid #1e3050', borderRadius:10, padding:'clamp(12px,1.2vw,16px)' }}>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', flex:1 }}>
              {Object.entries(vitalScores).map(([key, score]) => {
                const labels = { hr:'HR', bp_sys:'BP', spo2:'SpO2', temp:'Temp' }
                const c = STATE_COLORS[score]
                return (
                  <div key={key} style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:8, padding:'6px 12px', textAlign:'center' }}>
                    <div style={{ color:'#4a6080', fontSize:'clamp(12px,0.9vw,13px)', fontWeight:600, textTransform:'uppercase', marginBottom:2 }}>{labels[key]}</div>
                    <div style={{ color:c.color, fontSize:'clamp(14px,1.1vw,16px)', fontWeight:700 }}>Score {score}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ color:'#4a6080', fontSize:'clamp(12px,1.1vw,14px)' }}>total score {totalScore}</span>
              <span style={{ color:'#4a6080', fontSize:18 }}>→</span>
              <StateBadge state={mappedState} />
            </div>
          </div>
        </div>

        {/* State table */}
        <div className="card">
          <div className="t-label" style={{ marginBottom:14 }}>State Definitions S0 – S4</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { s:0, desc:'All vitals within normal range. No clinical concern.',          vitals:'HR 60–100 · BP 90–140 · Temp 36–38°C · SpO2 ≥95%' },
              { s:1, desc:'One vital mildly out of range. Patient flagged for monitoring.',  vitals:'HR 100–120 · BP 140–160 · Temp 38–39°C · SpO2 92–95%' },
              { s:2, desc:'Multiple vitals elevated. Patient needs active attention.',       vitals:'HR 120–140 · BP 160–180 · Temp 39–40°C · SpO2 88–92%' },
              { s:3, desc:'Dangerous readings. Urgent response required immediately.',       vitals:'HR >140 · BP >180 · Temp >40°C · SpO2 <88%' },
              { s:4, desc:'Life-threatening. Immediate emergency intervention required.',   vitals:'Extreme values across multiple vitals simultaneously' },
            ].map(({ s, desc, vitals }) => (
              <div key={s} style={{ display:'flex', gap:14, padding:'clamp(10px,1vw,14px)', borderRadius:10, background:STATE_COLORS[s].bg, border:`1px solid ${STATE_COLORS[s].border}`, alignItems:'flex-start' }}>
                <div style={{ width:44, height:44, borderRadius:10, background:STATE_COLORS[s].bg, border:`1px solid ${STATE_COLORS[s].border}`, display:'flex', alignItems:'center', justifyContent:'center', color:STATE_COLORS[s].color, fontSize:'clamp(12px,1.1vw,14px)', fontWeight:800, flexShrink:0, fontFamily:'JetBrains Mono,monospace' }}>S{s}</div>
                <div>
                  <div style={{ color:STATE_COLORS[s].color, fontSize:'clamp(12px,1.1vw,14px)', fontWeight:700, marginBottom:4 }}>{STATE_LABELS[s]}</div>
                  <div style={{ color:'#8099b8', fontSize:'clamp(14px,1.1vw,16px)', marginBottom:4, lineHeight:1.5 }}>{desc}</div>
                  <div style={{ color:'#4a6080', fontSize:'clamp(13px,1vw,15px)', fontFamily:'JetBrains Mono,monospace' }}>{vitals}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Problem Statement */}
      <Section title="Problem Statement" sub="What are we solving and why does it matter?" accent="#2563eb">
        <div className="card" style={{ fontSize:'clamp(15px,1.2vw,17px)', color:'#8099b8', lineHeight:1.8 }}>
          Hospital triage requires nurses and doctors to simultaneously monitor multiple patients, detect deterioration early, and decide when to escalate care all under time pressure and resource constraints. Delayed escalation leads to preventable deterioration. Over-escalation wastes critical resources. When multiple patients deteriorate simultaneously, coordination breaks down entirely.
        </div>
        <div className="grid-2">
          {[
            { letter:'P', title:'Performance', color:'#4ade80', rgb:'52,211,153',
              items:['Patient state improvement over time','Correct escalation rate','Unnecessary escalation rate','Cumulative reward per episode','Ward stability score'] },
            { letter:'E', title:'Environment', color:'#67e8f9', rgb:'56,189,248',
              items:['Hospital ward with multiple patients','Partially observable vitals only','Stochastic same action, variable outcome','Dynamic patient states change each step','Multi-agent patients share ward resources'] },
            { letter:'A', title:'Actuators',   color:'#a5b4fc', rgb:'99,102,241',
              items:['Monitor, Treat, Escalate, Emergency Response (Triage)','Standby, Reallocate, Override, Backup (Supervisor)'] },
            { letter:'S', title:'Sensors',     color:'#c084fc', rgb:'192,132,252',
              items:['Heart rate, BP, temperature, SpO2','Patient age and pre-existing conditions','Natural language input via LLM parsing','All patient states (Supervisor only)','Reward signal from previous actions'] },
          ].map(p => (
            <div key={p.letter} style={{ background:'#0f1f3d', border:`1px solid rgba(${p.rgb},0.35)`, borderRadius:14, padding:'clamp(14px,1.4vw,20px)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:`rgba(${p.rgb},0.1)`, border:`1px solid rgba(${p.rgb},0.25)`, display:'flex', alignItems:'center', justifyContent:'center', color:p.color, fontSize:'clamp(15px,1.4vw,18px)', fontWeight:800, flexShrink:0 }}>{p.letter}</div>
                <span style={{ color:'#ffffff', fontSize:'clamp(13px,1.2vw,15px)', fontWeight:700 }}>{p.title}</span>
              </div>
              <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:7 }}>
                {p.items.map(item => (
                  <li key={item} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                    <span style={{ color:p.color, marginTop:2, flexShrink:0, fontSize:13 }}>◆</span>
                    <span style={{ color:'#8099b8', fontSize:'clamp(14px,1.1vw,16px)', lineHeight:1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Why AI */}
      <Section title="Why Only AI?" sub="Why a rule-based system fundamentally fails here" accent="#fb7185">
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { icon:'✕', title:'Combinatorial complexity',    color:'#fb7185', rgb:'251,113,133',
              body:'A rule like "if HR > 100 and BP > 140, alert nurse" ignores context. The same vitals mean different things for a 25-year-old athlete vs a 70-year-old diabetic. The combination of vitals, age, conditions, and trend creates thousands of configurations no finite ruleset handles this.' },
            { icon:'⟳', title:'Sequential decision-making',  color:'#a5b4fc', rgb:'99,102,241',
              body:'What matters is the trajectory HR 95→100→110 over three hours demands different action than HR 110→100→95. This is the Markov Decision Process framework. No static rule models sequential state transitions.' },
            { icon:'~', title:'Probabilistic outcomes',      color:'#60a5fa', rgb:'96,165,250',
              body:'Even the correct action does not guarantee improvement. The RL agent learns to maximize expected reward over probability distributions. No deterministic rule can model stochastic medical outcomes.' },
            { icon:'↑', title:'Adaptation over time',        color:'#67e8f9', rgb:'56,189,248',
              body:'Patient populations change. A rule written for one ICU does not transfer to another. The RL agent continuously updates Q-values based on observed outcomes. After 2000 training episodes it has learned policies no human-written ruleset could match.' },
            { icon:'◉', title:'Natural language interaction', color:'#4ade80', rgb:'52,211,153',
              body:"A doctor won't type structured data. The LLM layer extracts vitals from natural speech, maps them to states, and generates context-aware personalized explanations capabilities no rule-based system can replicate." },
          ].map(r => (
            <div key={r.title} style={{ background:`rgba(${r.rgb},0.1)`, border:`1px solid rgba(${r.rgb},0.3)`, borderRadius:10, padding:'clamp(12px,1.2vw,16px)', display:'flex', gap:14 }}>
              <span style={{ color:r.color, fontSize:'clamp(14px,1.3vw,18px)', flexShrink:0, width:22, textAlign:'center', marginTop:2 }}>{r.icon}</span>
              <div>
                <p style={{ color:'#ffffff', fontSize:'clamp(15px,1.2vw,17px)', fontWeight:700, marginBottom:6 }}>{r.title}</p>
                <p style={{ color:'#8099b8', fontSize:'clamp(14px,1.1vw,16px)', lineHeight:1.7 }}>{r.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* AI Workflow */}
      <Section title="AI Workflow" sub="How RL and LLM work together each doing only what it's good at" accent="#60a5fa">
        <div className="card" style={{ marginBottom:0 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {[
              { icon:'◉', label:'User speaks',       desc:'Natural language vitals, observations, concerns',           color:'#67e8f9', rgb:'56,189,248' },
              { icon:'⬡', label:'LLM Input Parsing',  desc:'Extracts vitals → maps to structured state S0–S4',           color:'#c084fc', rgb:'192,132,252' },
              { icon:'▣', label:'RL Agent (DQN)',        desc:'State → Q(s,a) → selects argmax action',                    color:'#a5b4fc', rgb:'99,102,241'  },
              { icon:'⬡', label:'LLM Output',         desc:'(state, action, next_state) → clinical explanation',         color:'#c084fc', rgb:'192,132,252' },
              { icon:'◉', label:'User reads',        desc:'Personalized clinical response with full reasoning',          color:'#4ade80', rgb:'52,211,153'   },
            ].map((step, i) => (
              <div key={i} style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:`rgba(${step.rgb},0.12)`, border:`1px solid rgba(${step.rgb},0.25)`, display:'flex', alignItems:'center', justifyContent:'center', color:step.color, fontSize:14 }}>{step.icon}</div>
                  {i < 4 && <div style={{ width:1, height:20, background:'#1e3050', margin:'3px 0' }}/>}
                </div>
                <div style={{ paddingTop:8, paddingBottom: i < 4 ? 0 : 0 }}>
                  <p style={{ color:'#ffffff', fontSize:'clamp(12px,1.1vw,14px)', fontWeight:700, marginBottom:2 }}>{step.label}</p>
                  <p style={{ color:'#4a6080', fontSize:'clamp(14px,1.1vw,16px)' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid-2">
          <div className="card" style={{ borderLeft:'2px solid #a5b4fc' }}>
            <p style={{ color:'#a5b4fc', fontSize:'clamp(14px,1.1vw,16px)', fontWeight:700, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.04em' }}>RL Agent The Brain</p>
            <p style={{ color:'#8099b8', fontSize:'clamp(14px,1.1vw,16px)', lineHeight:1.7 }}>Decides WHAT to do. Never speaks. Never sees text. Only knows state numbers and Q-values. Outputs a single integer: 0, 1, 2, or 3.</p>
          </div>
          <div className="card" style={{ borderLeft:'2px solid #c084fc' }}>
            <p style={{ color:'#c084fc', fontSize:'clamp(14px,1.1vw,16px)', fontWeight:700, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.04em' }}>LLM The Voice</p>
            <p style={{ color:'#8099b8', fontSize:'clamp(14px,1.1vw,16px)', lineHeight:1.7 }}>Decides HOW to say it. Never makes medical decisions. Only translates between human language and structured data.</p>
          </div>
        </div>
      </Section>

      {/* Triage Agent MDP */}
      <Section title="Triage Agent MDP Design" sub="Phase 1 · DQN · Manages a single patient" accent="#fb7185">

        {/* Actions */}
        <div className="card">
          <div className="t-label" style={{ marginBottom:14 }}>Actions + Legal Mask</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { a:0, desc:'Observe and log vitals. No clinical intervention.',        legal:[0,1,2]   },
              { a:1, desc:'Administer medication or basic treatment protocol.',        legal:[1,2]     },
              { a:2, desc:'Call doctor or specialist for immediate assessment.',       legal:[1,2,3,4] },
              { a:3, desc:'Trigger full emergency team. Highest resource cost.',       legal:[2,3,4]   },
            ].map(({ a, desc, legal }) => (
              <div key={a} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, padding:'clamp(10px,1vw,14px)', borderRadius:10, background:'#081020', border:'1px solid #1e3050', flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <ActionBadge action={a} />
                  <p style={{ color:'#8099b8', fontSize:'clamp(14px,1.1vw,16px)' }}>{desc}</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                  <span style={{ color:'#4a6080', fontSize:'clamp(13px,1vw,14px)' }}>Legal in:</span>
                  {[0,1,2,3,4].map(s => (
                    <span key={s} style={{
                      width:26, height:26, borderRadius:6, display:'inline-flex', alignItems:'center', justifyContent:'center',
                      fontSize:'clamp(13px,1vw,14px)', fontWeight:700, fontFamily:'JetBrains Mono,monospace',
                      background: legal.includes(s) ? STATE_COLORS[s].bg : '#060e1c',
                      color:      legal.includes(s) ? STATE_COLORS[s].color : '#1e3050',
                      border:     `1px solid ${legal.includes(s) ? STATE_COLORS[s].border : '#1e3050'}`,
                    }}>S{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive transitions */}
        <div className="card-glow">
          <div className="t-label" style={{ marginBottom:6 }}>Transition Probabilities P(s' | s, a)</div>
          <p style={{ color:'#4a6080', fontSize:'clamp(14px,1.1vw,16px)', marginBottom:14 }}>Select a state to explore all legal actions and their outcome distributions</p>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:18 }}>
            {[0,1,2,3,4].map(s => (
              <button key={s} onClick={() => setTriageState(s)} style={{
                padding:'6px 14px', borderRadius:20, fontSize:'clamp(14px,1.1vw,16px)', fontWeight:700,
                fontFamily:'DM Sans,sans-serif', cursor:'pointer', transition:'all 0.15s', border:'none',
                background: triageState===s ? STATE_COLORS[s].bg : 'transparent',
                color:       triageState===s ? STATE_COLORS[s].color : '#4a6080',
                outline:     triageState===s ? `1px solid ${STATE_COLORS[s].border}` : '1px solid #1e3050',
              }}>S{s} · {STATE_LABELS[s]}</button>
            ))}
          </div>
          <ProbTable data={{ actions:TRIAGE_TRANSITIONS[triageState] }} isWard={false} />
        </div>

        {/* Reward */}
        <div className="card">
          <div className="t-label" style={{ marginBottom:14 }}>Reward Function R(s, a, s')</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
            {[
              { case:'Patient improves', formula:'+(steps) × 10', ex:'S3→S1 = +20', color:'#4ade80' },
              { case:'No change',        formula:'0',             ex:'S2→S2 = 0',   color:'#4a6080' },
              { case:'Patient worsens',  formula:'-(steps) × 10', ex:'S1→S3 = -20', color:'#fb7185' },
            ].map(r => (
              <div key={r.case} style={{ textAlign:'center', background:'#081020', borderRadius:10, padding:'clamp(10px,1vw,14px)' }}>
                <div className="t-label" style={{ marginBottom:6 }}>{r.case}</div>
                <div style={{ color:r.color, fontFamily:'JetBrains Mono,monospace', fontWeight:700, fontSize:'clamp(14px,1.3vw,17px)' }}>{r.ex}</div>
                <div style={{ color:'#4a6080', fontSize:'clamp(13px,1vw,15px)', marginTop:3 }}>{r.formula}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {[
              { cond:'S4 → S4 (stuck in emergency)',               mod:'-30', color:'#fb7185', rgb:'251,113,133' },
              { cond:'S2 + Emergency Response (over-escalation)',   mod:'-15', color:'#60a5fa', rgb:'96,165,250'  },
              { cond:'S4 + Emergency → S2 or better (saved)',       mod:'+25', color:'#4ade80', rgb:'52,211,153'   },
            ].map(r => (
              <div key={r.cond} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'clamp(8px,0.9vw,12px) clamp(12px,1.2vw,16px)', borderRadius:8, background:`rgba(${r.rgb},0.06)`, border:`1px solid rgba(${r.rgb},0.18)` }}>
                <span style={{ color:'#8099b8', fontSize:'clamp(14px,1.1vw,16px)' }}>{r.cond}</span>
                <span style={{ color:r.color, fontFamily:'JetBrains Mono,monospace', fontWeight:700, fontSize:'clamp(14px,1.3vw,17px)' }}>{r.mod}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Supervisor Agent */}
      <Section title="Supervisor Agent MDP Design" sub="Phase 2 · Q-Learning · Manages the entire ward" accent="#c084fc">

        {/* Ward states */}
        <div className="card">
          <div className="t-label" style={{ marginBottom:14 }}>Ward States W0 – W4</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
            {[
              { w:0, desc:'All patients S0/S1. No clinical concern.',              rule:'All patients ≤ S1' },
              { w:1, desc:'1–2 patients at S2 (Unstable).',                        rule:'count(S2) ≥ 1'    },
              { w:2, desc:'3+ patients at S2, or 1 patient at S3.',                rule:'count(S2)≥3 OR count(S3)=1' },
              { w:3, desc:'2+ patients at S3, or 1 patient at S4.',                rule:'count(S3)≥2 OR count(S4)=1' },
              { w:4, desc:'2+ patients at S4.',                                    rule:'count(S4) ≥ 2'    },
            ].map(({ w, desc, rule }) => (
              <div key={w} style={{ display:'flex', alignItems:'center', gap:14, padding:'clamp(8px,0.9vw,12px)', borderRadius:8, background:WARD_COLORS[w].bg, border:`1px solid ${WARD_COLORS[w].border}` }}>
                <div style={{ width:38, height:38, borderRadius:8, background:WARD_COLORS[w].bg, border:`1px solid ${WARD_COLORS[w].border}`, display:'flex', alignItems:'center', justifyContent:'center', color:WARD_COLORS[w].color, fontSize:'clamp(14px,1.1vw,16px)', fontWeight:800, flexShrink:0, fontFamily:'JetBrains Mono,monospace' }}>W{w}</div>
                <div style={{ flex:1 }}>
                  <p style={{ color:WARD_COLORS[w].color, fontSize:'clamp(12px,1.1vw,14px)', fontWeight:700, marginBottom:2 }}>{WARD_LABELS[w]}</p>
                  <p style={{ color:'#8099b8', fontSize:'clamp(11px,0.95vw,12px)' }}>{desc}</p>
                </div>
                <code style={{ color:'#4a6080', fontSize:'clamp(13px,1vw,14px)', fontFamily:'JetBrains Mono,monospace', background:'#081020', padding:'3px 8px', borderRadius:5, flexShrink:0 }}>{rule}</code>
              </div>
            ))}
          </div>
          <div style={{ background:'#081020', borderRadius:8, padding:'clamp(10px,1vw,14px)', fontFamily:'JetBrains Mono,monospace', fontSize:'clamp(13px,1vw,15px)', color:'#4a6080', lineHeight:2 }}>
            <p style={{ color:'#8099b8', fontWeight:600, marginBottom:4 }}>Derivation (runs every timestep):</p>
            <p>if count(S4) ≥ 2                       → W4 Crisis</p>
            <p>elif count(S4) = 1 OR count(S3) ≥ 2   → W3 Overloaded</p>
            <p>elif count(S3) = 1 OR count(S2) ≥ 3   → W2 Busy</p>
            <p>elif count(S2) ≥ 1                     → W1 Active</p>
            <p>else                                    → W0 Calm</p>
          </div>
        </div>

        {/* Supervisor actions */}
        <div className="card">
          <div className="t-label" style={{ marginBottom:14 }}>Supervisor Actions + Legal Mask</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { b:0, desc:'Trust Triage Agents. No ward-level intervention.',             legal:[0,1]     },
              { b:1, desc:'Move nursing staff to highest-priority patient.',              legal:[1,2,3]   },
              { b:2, desc:"Force a Triage Agent's action up one escalation level.",       legal:[2,3,4]   },
              { b:3, desc:'Call for additional staff and resources from outside.',        legal:[2,3,4]   },
            ].map(({ b, desc, legal }) => (
              <div key={b} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, padding:'clamp(10px,1vw,14px)', borderRadius:10, background:'#081020', border:'1px solid #1e3050', flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <WardActionBadge action={b} />
                  <p style={{ color:'#8099b8', fontSize:'clamp(14px,1.1vw,16px)' }}>{desc}</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                  <span style={{ color:'#4a6080', fontSize:'clamp(13px,1vw,14px)' }}>Legal in:</span>
                  {[0,1,2,3,4].map(w => (
                    <span key={w} style={{
                      width:26, height:26, borderRadius:6, display:'inline-flex', alignItems:'center', justifyContent:'center',
                      fontSize:'clamp(13px,1vw,14px)', fontWeight:700, fontFamily:'JetBrains Mono,monospace',
                      background: legal.includes(w) ? WARD_COLORS[w].bg : '#060e1c',
                      color:      legal.includes(w) ? WARD_COLORS[w].color : '#1e3050',
                      border:     `1px solid ${legal.includes(w) ? WARD_COLORS[w].border : '#1e3050'}`,
                    }}>W{w}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive supervisor transitions */}
        <div className="card-glow">
          <div className="t-label" style={{ marginBottom:6 }}>Ward Transition Probabilities P(w' | w, b)</div>
          <p style={{ color:'#4a6080', fontSize:'clamp(14px,1.1vw,16px)', marginBottom:14 }}>Select a ward state to see supervisor action outcomes</p>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:18 }}>
            {[0,1,2,3,4].map(w => (
              <button key={w} onClick={() => setSupervisorState(w)} style={{
                padding:'6px 14px', borderRadius:20, fontSize:'clamp(14px,1.1vw,16px)', fontWeight:700,
                fontFamily:'DM Sans,sans-serif', cursor:'pointer', transition:'all 0.15s', border:'none',
                background: supervisorState===w ? WARD_COLORS[w].bg : 'transparent',
                color:       supervisorState===w ? WARD_COLORS[w].color : '#4a6080',
                outline:     supervisorState===w ? `1px solid ${WARD_COLORS[w].border}` : '1px solid #1e3050',
              }}>W{w} · {WARD_LABELS[w]}</button>
            ))}
          </div>
          <ProbTable data={{ actions:SUPERVISOR_TRANSITIONS[supervisorState] }} isWard={true} />
        </div>

        {/* Q-Table */}
        <div className="card">
          <div className="t-label" style={{ marginBottom:14 }}>Trained Q-Table (after 3000 episodes)</div>
          <div style={{ overflowX:'auto', border:'1px solid #1e3050', borderRadius:8 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ward State</th>
                  <th>B0 Standby</th>
                  <th>B1 Reallocate</th>
                  <th>B2 Override</th>
                  <th>B3 Backup</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [0,'Calm',      '-5.04',' ',    ' ',    ' '    ],
                  [1,'Active',    '4.10', '4.67', ' ',    ' '    ],
                  [2,'Busy',      '12.95','12.29','13.65','14.30'],
                  [3,'Overloaded',' ',    '21.95','22.61','23.76'],
                  [4,'Crisis',    ' ',    ' ',    '18.70','39.10'],
                ].map(([w, label, ...vals]) => (
                  <tr key={w}>
                    <td>
                      <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:20, fontSize:'clamp(13px,1vw,15px)', fontWeight:700, background:WARD_COLORS[w].bg, color:WARD_COLORS[w].color, border:`1px solid ${WARD_COLORS[w].border}` }}>
                        W{w} · {label}
                      </span>
                    </td>
                    {vals.map((v, j) => (
                      <td key={j} style={{
                        fontFamily:'JetBrains Mono,monospace', fontWeight:700,
                        fontSize:'clamp(12px,1.1vw,14px)',
                        color: v==='39.10' ? '#4ade80' : v===' ' ? '#1e3050' : parseFloat(v) > 0 ? '#60a5fa' : '#fb7185',
                      }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop:12, background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.18)', borderRadius:10, padding:'clamp(10px,1vw,14px)' }}>
            <p style={{ color:'#4ade80', fontSize:'clamp(12px,1.1vw,14px)', fontWeight:700, marginBottom:4 }}>Key Insight: Request Backup at Crisis = 39.10 vs Override = 18.70</p>
            <p style={{ color:'#8099b8', fontSize:'clamp(14px,1.1vw,16px)', lineHeight:1.6 }}>The agent learned that bringing new resources outperforms reshuffling existing ones during a crisis. Clinically correct and independently discovered through reinforcement learning with zero hardcoded rules.</p>
          </div>
        </div>
      </Section>

      {/* Tech Stack */}
      <Section title="Tools & Technologies" accent="#67e8f9">
        <div className="grid-3">
          {[
            { cat:'Backend',  color:'#67e8f9', items:['Python 3.12','FastAPI REST API','PyTorch DQN neural network','NumPy Q-table operations','Anthropic SDK Claude API'] },
            { cat:'RL & AI',  color:'#a5b4fc', items:['Deep Q-Network (DQN)','Experience Replay Buffer','Target Network stability','Tabular Q-Learning (Supervisor)','Epsilon-greedy exploration'] },
            { cat:'Frontend', color:'#c084fc', items:['React + Vite','TailwindCSS','Recharts visualization','Axios API calls','DM Sans + JetBrains Mono'] },
          ].map(s => (
            <div key={s.cat} className="card">
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:s.color, flexShrink:0 }}/>
                <span style={{ color:'#ffffff', fontSize:'clamp(13px,1.2vw,15px)', fontWeight:700 }}>{s.cat}</span>
              </div>
              <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:7 }}>
                {s.items.map(item => (
                  <li key={item} style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ color:s.color, flexShrink:0, fontSize:8 }}>◆</span>
                    <span style={{ color:'#8099b8', fontSize:'clamp(14px,1.1vw,16px)' }}>{item}</span>
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
