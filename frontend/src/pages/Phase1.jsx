import { useState, useRef } from 'react'
import axios from 'axios'
import StateBadge from '../components/StateBadge'
import { ActionBadge } from '../components/ActionBadge'
import QValueBar from '../components/QValueBar'

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const TRIAGE_PROBS = {
  '0-0':[0.85,0.12,0.03,0.00,0.00],
  '1-0':[0.20,0.50,0.25,0.05,0.00],
  '1-1':[0.50,0.35,0.12,0.03,0.00],
  '1-2':[0.60,0.30,0.08,0.02,0.00],
  '2-0':[0.05,0.15,0.40,0.30,0.10],
  '2-1':[0.15,0.35,0.35,0.12,0.03],
  '2-2':[0.25,0.40,0.25,0.08,0.02],
  '2-3':[0.20,0.30,0.30,0.15,0.05],
  '3-2':[0.15,0.30,0.30,0.20,0.05],
  '3-3':[0.25,0.35,0.25,0.12,0.03],
  '4-2':[0.00,0.00,0.25,0.45,0.30],
  '4-3':[0.00,0.00,0.45,0.35,0.20],
}

const STATE_LABELS  = ['Healthy','At Risk','Unstable','Critical','Emergency']
const ACTION_LABELS = ['Monitor','Treat','Escalate','Emergency Response']
const PROB_COLORS   = ['#4ade80','#a5b4fc','#60a5fa','#fb7185','#c084fc']

const VITAL_COLOR = {
  hr:    v => v>120?'#fb7185':v>100?'#60a5fa':'#4ade80',
  bp_sys:v => v>160?'#fb7185':v>140?'#60a5fa':'#4ade80',
  spo2:  v => v<88 ?'#fb7185':v<92 ?'#60a5fa':'#4ade80',
  temp:  v => v>39 ?'#fb7185':v>38 ?'#60a5fa':'#4ade80',
}

function VitalInput({ label, fieldKey, value, unit, step=1, onChange }) {
  const color = VITAL_COLOR[fieldKey] ? VITAL_COLOR[fieldKey](value) : '#f0f8ff'
  const adj = (delta) => onChange(fieldKey, parseFloat((value + delta).toFixed(1)))
  return (
    <div style={{ background:'#060d1a', border:'1.5px solid #1e3050', borderRadius:10, padding:'12px 14px' }}>
      <div style={{ color:'#4a78b0', fontSize:'clamp(13px,1vw,15px)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{label}</div>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <button onClick={() => adj(-step)} style={{ width:26, height:26, borderRadius:6, background:'#0f1f3d', border:'1px solid #1e3050', color:'#94b8d8', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:600, transition:'all 0.15s' }}
          onMouseOver={e=>e.target.style.borderColor='#2563eb'} onMouseOut={e=>e.target.style.borderColor='#1e3050'}>−</button>
        <input type="number" step={step} value={value}
          onChange={e => onChange(fieldKey, parseFloat(e.target.value))}
          style={{ flex:1, background:'transparent', border:'none', outline:'none', color, fontSize:'clamp(18px,1.8vw,24px)', fontFamily:'JetBrains Mono,monospace', fontWeight:700, textAlign:'center', minWidth:0 }}/>
        <button onClick={() => adj(step)} style={{ width:26, height:26, borderRadius:6, background:'#0f1f3d', border:'1px solid #1e3050', color:'#94b8d8', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:600, transition:'all 0.15s' }}
          onMouseOver={e=>e.target.style.borderColor='#2563eb'} onMouseOut={e=>e.target.style.borderColor='#1e3050'}>+</button>
      </div>
      <div style={{ color:'#1e3050', fontSize:'clamp(13px,1vw,14px)', textAlign:'center', marginTop:3 }}>{unit}</div>
    </div>
  )
}

export default function Phase1() {
  const [mode,setMode]           = useState('manual')
  const [nlpText,setNlpText]     = useState('')
  const [vitals,setVitals]       = useState({hr:75,bp_sys:120,bp_dia:80,temp:37.0,spo2:98,age:50,conditions:0})
  const [currentState,setState]  = useState(null)
  const [result,setResult]       = useState(null)
  const [loading,setLoading]     = useState(false)
  const [parsing,setParsing]     = useState(false)
  const [episodeRunning,setEpRun]= useState(false)
  const [episodeSteps,setEpSteps]= useState([])
  const [episodeDone,setEpDone]  = useState(false)
  const [explanation,setExpl]    = useState(null)
  const [llmLoading,setLlmLoad]  = useState(false)
  const stopRef = useRef(false)

  const updateVital = (key, val) => setVitals(v => ({...v, [key]: val}))

  const FIELDS = [
    {key:'hr',        label:'Heart Rate',   unit:'bpm',  step:1  },
    {key:'bp_sys',    label:'BP Systolic',  unit:'mmHg', step:1  },
    {key:'bp_dia',    label:'BP Diastolic', unit:'mmHg', step:1  },
    {key:'temp',      label:'Temperature',  unit:'°C',   step:0.1},
    {key:'spo2',      label:'SpO2',         unit:'%',    step:1  },
    {key:'age',       label:'Age',          unit:'yrs',  step:1  },
    {key:'conditions',label:'Conditions',   unit:'#',    step:1  },
  ]

  async function parseNLP() {
    if(!nlpText.trim()) return
    setParsing(true)
    try {
      const r = await axios.post(`${API}/api/parse-patient`,{text:nlpText})
      setVitals(r.data.vitals); setState(r.data.state); setExpl(null)
    } catch(e){alert(e.message)} finally{setParsing(false)}
  }
  async function mapState() {
    setLoading(true)
    try { const r=await axios.post(`${API}/api/vitals-to-state`,vitals); setState(r.data.state); setExpl(null) }
    catch(e){alert(e.message)} finally{setLoading(false)}
  }
  async function runStep() {
    if(currentState===null) return
    setLoading(true); setEpSteps([]); setEpDone(false)
    try {
      const r=await axios.post(`${API}/api/triage-step`,{state:currentState,use_llm:true})
      setResult(r.data); setState(r.data.next_state); setExpl(r.data.explanation)
    } catch(e){alert(e.message)} finally{setLoading(false)}
  }
  async function runEpisode() {
    if(currentState===null) return
    setEpRun(true); setEpDone(false); setEpSteps([]); setResult(null); setExpl(null)
    stopRef.current=false; let state=currentState
    for(let i=0;i<20;i++){
      if(stopRef.current) break
      try {
        const r=await axios.post(`${API}/api/triage-step`,{state,use_llm:false})
        setEpSteps(p=>[...p,{...r.data,stepNum:i+1}]); setState(r.data.next_state); state=r.data.next_state
        if(state===0) break
        await new Promise(r=>setTimeout(r,500))
      } catch(e){alert(e.message);break}
    }
    setEpRun(false); setEpDone(true)
  }
  async function askExplain(step) {
    setLlmLoad(true)
    try {
      const r=await axios.post(`${API}/api/explain-step`,{
        patient_id:1, state:step.state, state_label:STATE_LABELS[step.state],
        action:step.action, action_label:ACTION_LABELS[step.action],
        next_state:step.next_state, next_state_label:STATE_LABELS[step.next_state], overridden:false,
      })
      setExpl(r.data.explanation)
    } catch(e){alert(e.message)} finally{setLlmLoad(false)}
  }

  const maxQ       = result?Math.max(...Object.values(result.q_values).filter(v=>v!==null).map(Math.abs)):1
  const transProbs = result?TRIAGE_PROBS[`${result.state}-${result.action}`]:null
  const totalRew   = episodeSteps.reduce((s,r)=>s+r.reward,0)

  return (
    <div style={{display:'flex',flexDirection:'column',background:'#060d1a',minHeight:'calc(100vh - 52px)'}}>

      {/* TOP BAR */}
      <div style={{background:'#0f1f3d',borderBottom:'1px solid #1e3050',padding:'clamp(16px,1.8vw,24px) clamp(20px,2.5vw,36px)'}}>
        {/* Title + buttons */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{color:'#ffffff',fontSize:'clamp(20px,2.2vw,28px)',fontWeight:800,letterSpacing:'-0.025em',marginBottom:4}}>Phase 1 — Single Triage Agent</h1>
            <p style={{color:'#4a78b0',fontSize:'clamp(15px,1.2vw,17px)'}}>DQN agent learns optimal patient actions via reinforcement learning</p>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            {currentState!==null&&(
              <div style={{display:'flex',alignItems:'center',gap:8,background:'#060d1a',border:'1px solid #1e3050',borderRadius:10,padding:'8px 14px'}}>
                <span style={{color:'#4a78b0',fontSize:14}}>State:</span>
                <StateBadge state={currentState}/>
              </div>
            )}
            {mode==='manual'&&<button className="btn btn-ghost" onClick={mapState} disabled={loading||episodeRunning}>Map to State</button>}
            <button className="btn btn-primary" onClick={runStep} disabled={loading||episodeRunning||currentState===null}>
              {loading?'Running...':'▶ Run Step'}
            </button>
            {!episodeRunning
              ?<button className="btn btn-green" onClick={runEpisode} disabled={loading||currentState===null}>⚡ Episode</button>
              :<button className="btn btn-red" onClick={()=>stopRef.current=true}>⏹ Stop</button>
            }
            <button className="btn-ghost" onClick={()=>{setResult(null);setState(null);setEpSteps([]);setEpDone(false);setExpl(null)}}>Reset</button>
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{display:'flex',gap:4,marginBottom:16,background:'#060d1a',borderRadius:9,padding:4,width:'fit-content'}}>
          {[{id:'manual',label:'Manual Vitals'},{id:'nlp',label:'Natural Language'}].map(m=>(
            <button key={m.id} onClick={()=>setMode(m.id)} style={{
              padding:'8px 18px',borderRadius:7,fontSize:'clamp(15px,1.2vw,17px)',fontWeight:600,
              fontFamily:'Inter,sans-serif',cursor:'pointer',border:'none',transition:'all 0.15s',
              background:mode===m.id?'linear-gradient(135deg,#2563eb,#1d4ed8)':'transparent',
              color:mode===m.id?'#fff':'#3a6090',
              boxShadow:mode===m.id?'0 2px 10px rgba(37,99,235,0.3)':'none',
            }}>{m.label}</button>
          ))}
        </div>

        {/* Inputs */}
        {mode==='nlp'?(
          <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
            <textarea className="input" style={{height:60,resize:'none',lineHeight:1.6,flex:1,fontSize:'clamp(14px,1.1vw,15px)'}}
              placeholder="e.g. 67 year old diabetic, heart rate 134, BP 182/110, SpO2 89%, declining over the last hour..."
              value={nlpText} onChange={e=>setNlpText(e.target.value)}/>
            <button className="btn btn-primary" onClick={parseNLP} disabled={parsing||!nlpText.trim()} style={{height:60,padding:'0 24px',fontSize:15}}>
              {parsing?'Parsing...':'Parse with Claude →'}
            </button>
          </div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
            {FIELDS.map(f=>(
              <VitalInput key={f.key} label={f.label} fieldKey={f.key} value={vitals[f.key]} unit={f.unit} step={f.step} onChange={updateVital}/>
            ))}
          </div>
        )}
      </div>

      {/* RESULTS */}
      <div style={{flex:1,padding:'clamp(16px,1.8vw,24px) clamp(20px,2.5vw,36px)',display:'flex',flexDirection:'column',gap:'clamp(14px,1.4vw,20px)'}}>

        {/* Empty */}
        {!result&&!episodeSteps.length&&(
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:'80px 0',opacity:0.45}}>
            <div style={{width:60,height:60,background:'linear-gradient(135deg,#2563eb,#1d4ed8)',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 28px rgba(37,99,235,0.35)'}}>
              <svg width="28" height="28" viewBox="0 0 28 28"><rect x="11" y="0" width="6" height="28" rx="3" fill="white"/><rect x="0" y="11" width="28" height="6" rx="3" fill="white"/></svg>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{color:'#94b8d8',fontSize:'clamp(15px,1.3vw,18px)',fontWeight:600,marginBottom:6}}>Enter vitals and run a step</div>
              <div style={{color:'#4a78b0',fontSize:'clamp(15px,1.2vw,17px)'}}>Q-values, transition probabilities and Claude's explanation appear here</div>
            </div>
          </div>
        )}

        {/* Step result */}
        {result&&!episodeSteps.length&&(
          <>
            <div className="card">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
                <div>
                  <div className="t-label" style={{marginBottom:10}}>Step Result</div>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                    <StateBadge state={result.state}/>
                    <span className="arrow">→</span>
                    <ActionBadge action={result.action}/>
                    <span className="arrow">→</span>
                    <StateBadge state={result.next_state}/>
                    <span style={{
                      background:result.next_state<result.state?'rgba(74,222,128,0.14)':result.next_state>result.state?'rgba(251,113,133,0.14)':'rgba(255,255,255,0.05)',
                      color:result.next_state<result.state?'#4ade80':result.next_state>result.state?'#fb7185':'#3a6090',
                      border:`1.5px solid ${result.next_state<result.state?'rgba(74,222,128,0.4)':result.next_state>result.state?'rgba(251,113,133,0.4)':'rgba(255,255,255,0.1)'}`,
                      padding:'5px 13px',borderRadius:20,fontSize:'clamp(14px,1.1vw,16px)',fontWeight:700,
                    }}>{result.next_state<result.state?'↑ Improved':result.next_state>result.state?'↓ Worsened':'→ Unchanged'}</span>
                  </div>
                </div>
                <div style={{display:'flex',gap:10}}>
                  {[
                    {label:'Reward',  val:`${result.reward>0?'+':''}${result.reward.toFixed(1)}`, color:result.reward>=0?'#4ade80':'#fb7185', glow:'74,222,128'},
                    {label:'Prob',    val:transProbs?`${(transProbs[result.next_state]*100).toFixed(0)}%`:'—', color:'#60a5fa', glow:'96,165,250'},
                    {label:'Epsilon', val:result.epsilon, color:'#4a78b0', glow:null},
                  ].map(s=>(
                    <div key={s.label} style={{
                      background:s.glow?`rgba(${s.glow},0.08)`:'rgba(255,255,255,0.02)',
                      border:`1.5px solid ${s.glow?`rgba(${s.glow},0.25)`:'#1e3050'}`,
                      borderRadius:12,padding:'clamp(12px,1.2vw,16px) clamp(16px,1.6vw,22px)',textAlign:'center',
                      boxShadow:s.glow?`0 0 16px rgba(${s.glow},0.08)`:'none',minWidth:90,
                    }}>
                      <div className="t-label" style={{marginBottom:5}}>{s.label}</div>
                      <div style={{color:s.color,fontFamily:'JetBrains Mono,monospace',fontSize:'clamp(22px,2.4vw,30px)',fontWeight:800,letterSpacing:'-0.02em'}}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="result-grid">
              <div className="card">
                <div className="t-label" style={{marginBottom:14}}>Q-Values — Why This Action?</div>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  {Object.entries(result.q_values).map(([label,val],i)=>(
                    <QValueBar key={label} label={label} value={val} max={maxQ} actionIdx={i} selected={i===result.action}/>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="t-label" style={{marginBottom:14}}>P(s' | S{result.state}, A{result.action})</div>
                {transProbs&&(
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {transProbs.map((p,s)=>p>0&&(
                      <div key={s} style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:'clamp(80px,9vw,110px)',background:'#081020',borderRadius:4,height:6,flexShrink:0}}>
                          <div style={{width:`${p*100}%`,height:'100%',background:PROB_COLORS[s],borderRadius:4,transition:'width 0.4s'}}/>
                        </div>
                        <span style={{color:'#4a78b0',fontSize:'clamp(12px,1vw,13px)',fontFamily:'JetBrains Mono,monospace',width:32}}>{(p*100).toFixed(0)}%</span>
                        <StateBadge state={s}/>
                        {s===result.next_state&&<span style={{color:PROB_COLORS[s],fontSize:'clamp(14px,1.1vw,16px)',fontWeight:600}}>← occurred</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card" style={{borderLeft:'3px solid #2563eb',borderRadius:'0 14px 14px 0'}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:12}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:'#2563eb',boxShadow:'0 0 8px rgba(37,99,235,0.7)'}}/>
                  <div className="t-label">Claude's Explanation</div>
                </div>
                {explanation
                  ?<p style={{color:'#c0d8f0',fontSize:'clamp(16px,1.3vw,18px)',lineHeight:1.75}}>{explanation}</p>
                  :<p style={{color:'#4a78b0',fontSize:14}}>Generating explanation...</p>}
              </div>
            </div>
          </>
        )}

        {/* Episode */}
        {episodeSteps.length>0&&(
          <div className="card">
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:12}}>
              <div>
                <div className="t-label" style={{marginBottom:5}}>Episode Timeline</div>
                <div style={{color:'#f0f8ff',fontSize:'clamp(14px,1.2vw,17px)',fontWeight:600}}>
                  {episodeRunning?`Running · step ${episodeSteps.length}`:`${episodeSteps.length} steps completed`}
                  {episodeDone&&episodeSteps[episodeSteps.length-1]?.next_state===0&&
                    <span style={{color:'#4ade80',marginLeft:10}}>· Patient reached Healthy ✓</span>}
                </div>
              </div>
              {episodeDone&&(
                <div style={{textAlign:'right'}}>
                  <div className="t-label" style={{marginBottom:4}}>Total Reward</div>
                  <div style={{color:totalRew>=0?'#4ade80':'#fb7185',fontFamily:'JetBrains Mono,monospace',fontSize:'clamp(24px,2.4vw,32px)',fontWeight:800,letterSpacing:'-0.02em'}}>
                    {totalRew>0?'+':''}{totalRew.toFixed(1)}
                  </div>
                </div>
              )}
            </div>
            {/* Flow */}
            <div style={{background:'#081020',border:'1px solid #1e3050',borderRadius:10,padding:'clamp(10px,1vw,14px) clamp(14px,1.4vw,18px)',marginBottom:16,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#f43f5e,#38bdf8,#6366f1,#22c55e)',opacity:0.4}}/>
              {episodeSteps.map((step,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:7,position:'relative',zIndex:1}}>
                  {i===0&&<StateBadge state={step.state}/>}
                  <span className="arrow">→</span>
                  <StateBadge state={step.next_state}/>
                </div>
              ))}
              {episodeRunning&&<div style={{width:18,height:18,borderRadius:'50%',border:'2px solid #2563eb',borderTopColor:'transparent',animation:'spin 0.7s linear infinite'}}/>}
            </div>
            {/* Table */}
            <div style={{overflowX:'auto',border:'1px solid #1e3050',borderRadius:10}}>
              <table className="data-table">
                <thead><tr><th>#</th><th>From</th><th>Action</th><th>To</th><th>Prob</th><th>Reward</th><th>Cumul.</th><th>Ask</th></tr></thead>
                <tbody>
                  {episodeSteps.map((s,i)=>{
                    const cum=episodeSteps.slice(0,i+1).reduce((a,r)=>a+r.reward,0)
                    const probs=TRIAGE_PROBS[`${s.state}-${s.action}`]
                    const prob=probs?probs[s.next_state]:null
                    return (
                      <tr key={i} style={s.next_state===0?{background:'rgba(74,222,128,0.04)'}:{}}>
                        <td style={{color:'#4a78b0',fontFamily:'JetBrains Mono,monospace'}}>{s.stepNum}</td>
                        <td><StateBadge state={s.state}/></td>
                        <td><ActionBadge action={s.action}/></td>
                        <td><StateBadge state={s.next_state}/></td>
                        <td style={{color:'#60a5fa',fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>{prob!==null?`${(prob*100).toFixed(0)}%`:'—'}</td>
                        <td style={{color:s.reward>=0?'#4ade80':'#fb7185',fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>{s.reward>0?'+':''}{s.reward.toFixed(1)}</td>
                        <td style={{color:cum>=0?'#60a5fa':'#fb7185',fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>{cum>0?'+':''}{cum.toFixed(1)}</td>
                        <td>
                          <button onClick={()=>askExplain(s)} disabled={llmLoading} style={{background:'rgba(37,99,235,0.12)',color:'#60a5fa',border:'1.5px solid rgba(37,99,235,0.35)',padding:'5px 14px',borderRadius:7,fontSize:'clamp(14px,1.1vw,16px)',cursor:'pointer',fontFamily:'Inter,sans-serif',fontWeight:600,opacity:llmLoading?0.4:1,transition:'all 0.15s'}}
                            onMouseOver={e=>{if(!llmLoading)e.currentTarget.style.background='rgba(37,99,235,0.22)'}}
                            onMouseOut={e=>e.currentTarget.style.background='rgba(37,99,235,0.12)'}>
                            {llmLoading?'...':'Ask'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {explanation&&(
              <div style={{marginTop:14,background:'rgba(37,99,235,0.07)',border:'1px solid rgba(37,99,235,0.25)',borderLeft:'3px solid #2563eb',borderRadius:'0 10px 10px 0',padding:'clamp(14px,1.4vw,18px)'}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:'#2563eb',boxShadow:'0 0 8px rgba(37,99,235,0.7)'}}/>
                  <div className="t-label">Claude's Explanation</div>
                </div>
                <p style={{color:'#c0d8f0',fontSize:'clamp(16px,1.3vw,18px)',lineHeight:1.75}}>{explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
