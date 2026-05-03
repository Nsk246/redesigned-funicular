import { useState, useRef } from 'react'
import axios from 'axios'
import StateBadge from '../components/StateBadge'
import { ActionBadge, WardActionBadge } from '../components/ActionBadge'

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
const WARD_PROBS = {
  '0-0':[0.80,0.15,0.04,0.01,0.00],
  '1-0':[0.30,0.45,0.20,0.05,0.00],
  '1-1':[0.45,0.40,0.12,0.03,0.00],
  '2-0':[0.05,0.20,0.40,0.25,0.10],
  '2-1':[0.15,0.35,0.35,0.12,0.03],
  '2-2':[0.20,0.40,0.28,0.10,0.02],
  '2-3':[0.25,0.40,0.25,0.08,0.02],
  '3-1':[0.00,0.15,0.30,0.35,0.20],
  '3-2':[0.00,0.20,0.35,0.30,0.15],
  '3-3':[0.00,0.35,0.35,0.20,0.10],
  '4-2':[0.00,0.00,0.20,0.45,0.35],
  '4-3':[0.00,0.00,0.40,0.40,0.20],
}

const STATE_LABELS = ['Healthy','At Risk','Unstable','Critical','Emergency']
const WARD_STYLE = [
  {color:'#4ade80',bg:'rgba(74,222,128,0.12)',   border:'rgba(74,222,128,0.35)',   label:'Calm',       rgb:'74,222,128'   },
  {color:'#38bdf8',bg:'rgba(56,189,248,0.12)',  border:'rgba(56,189,248,0.35)',  label:'Active',     rgb:'56,189,248'  },
  {color:'#a5b4fc',bg:'rgba(99,102,241,0.12)',   border:'rgba(99,102,241,0.35)',   label:'Busy',       rgb:'99,102,241'   },
  {color:'#93c5fd',bg:'rgba(96,165,250,0.12)',   border:'rgba(96,165,250,0.35)',   label:'Overloaded', rgb:'96,165,250'   },
  {color:'#fb7185',bg:'rgba(251,113,133,0.12)',  border:'rgba(251,113,133,0.35)',  label:'Crisis',     rgb:'251,113,133'  },
]
const PROB_COLORS     = ['#4ade80','#a5b4fc','#60a5fa','#fb7185','#c084fc']
const WARD_PROB_COLORS= ['#4ade80','#67e8f9','#a5b4fc','#60a5fa','#fb7185']

const C = {
  page:'#020818',sidebar:'#081020',card:'#0f1f3d',
  cardBorder:'#1e3050',text:'#ffffff',textSec:'#8099b8',
  textMuted:'#4a6080',textDim:'#3a5070',
}

function WardBadge({w,size='md'}) {
  const s=WARD_STYLE[w]
  return <span style={{display:'inline-flex',alignItems:'center',padding:size==='lg'?'5px 13px':'3px 10px',borderRadius:20,fontSize:'clamp(14px,1.1vw,16px)',fontWeight:700,fontFamily:'DM Sans,sans-serif',whiteSpace:'nowrap',background:s.bg,color:s.color,border:`1.5px solid ${s.border}`}}>W{w} · {s.label}</span>
}

export default function Phase2() {
  const [patientStates,setPS]      = useState([1,2,1])
  const [result,setResult]         = useState(null)
  const [loading,setLoading]       = useState(false)
  const [episodeRunning,setEpRun]  = useState(false)
  const [episodeSteps,setEpSteps]  = useState([])
  const [episodeDone,setEpDone]    = useState(false)
  const [explanation,setExpl]      = useState(null)
  const [llmLoading,setLlmLoad]    = useState(false)
  const stopRef = useRef(false)

  async function runStep() {
    setLoading(true)
    try { const r=await axios.post(`${API}/api/supervisor-step`,{patient_states:patientStates,use_llm:true}); setResult(r.data); setPS(r.data.triage_agents.map(t=>t.next_state)) }
    catch(e){alert(e.message)} finally{setLoading(false)}
  }
  async function runEpisode() {
    setEpRun(true); setEpDone(false); setEpSteps([]); stopRef.current=false
    let states=[...patientStates]
    for(let i=0;i<20;i++){
      if(stopRef.current) break
      try {
        const r=await axios.post(`${API}/api/supervisor-step`,{patient_states:states,use_llm:false})
        setEpSteps(p=>[...p,{...r.data,stepNum:i+1}]); states=r.data.triage_agents.map(t=>t.next_state); setPS(states)
        if(states.every(s=>s===0)) break
        await new Promise(r=>setTimeout(r,600))
      } catch(e){alert(e.message);break}
    }
    setEpRun(false); setEpDone(true)
  }

  async function askWardExplain(step) {
    setLlmLoad(true)
    try {
      const r = await axios.post(`${API}/api/ward-explain`, {
        ward_state:       step.supervisor.ward_state,
        ward_state_label: step.supervisor.ward_state_label,
        action:           step.supervisor.action,
        action_label:     step.supervisor.action_label,
        next_ward_state:  step.supervisor.next_ward_state,
        override_target:  step.supervisor.override_target,
        triage_agents:    step.triage_agents,
      })
      setExpl(r.data.ward_report)
    } catch(e){alert(e.message)} finally{setLlmLoad(false)}
  }

  const totalRew  = episodeSteps.reduce((s,r)=>s+r.supervisor.reward,0)
  const totalOvr  = episodeSteps.filter(r=>r.supervisor.override_target!==null).length

  return (
    <div style={{display:'flex',flexDirection:'column',gap:0,background:C.page,minHeight:'calc(100vh - 52px)'}}>

      {/* TOP BAR */}
      <div style={{background:C.sidebar,borderBottom:`1px solid ${C.cardBorder}`,padding:'clamp(10px,1.5vw,20px) clamp(10px,2vw,28px)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
          <div>
            <h1 style={{color:C.text,fontSize:'clamp(18px,2vw,24px)',fontWeight:700,letterSpacing:'-0.02em',marginBottom:3}}>Phase 2 — Multi-Agent System</h1>
            <p style={{color:C.textMuted,fontSize:'clamp(14px,1.1vw,16px)'}}>Supervisor Agent coordinates 3 Triage Agents across the ward</p>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',width:'100%'}}>
            <button className="btn btn-primary" onClick={runStep} disabled={loading||episodeRunning}>{loading?'Running...':'▶ Run Step'}</button>
            {!episodeRunning
              ?<button className="btn btn-green" onClick={runEpisode} disabled={loading}>⚡ Run Episode</button>
              :<button className="btn btn-red" onClick={()=>stopRef.current=true}>⏹ Stop</button>}
            <button className="btn-ghost" onClick={()=>{setResult(null);setPS([1,2,1]);setEpSteps([]);setEpDone(false)}}>Reset</button>
          </div>
        </div>

        {/* Patient state selectors */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          {patientStates.map((s,i)=>(
            <div key={i} style={{background:C.card,border:`1.5px solid ${C.cardBorder}`,borderRadius:8,padding:'12px 14px'}}>
              <div style={{color:C.textMuted,fontSize:'clamp(13px,1vw,15px)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Patient {i+1}</div>
              <select className="input" style={{marginBottom:8,minWidth:0,overflow:'hidden',textOverflow:'ellipsis'}} value={s}
                onChange={e=>setPS(ps=>ps.map((v,j)=>j===i?parseInt(e.target.value):v))}>
                {[0,1,2,3,4].map(v=><option key={v} value={v}>S{v} — {STATE_LABELS[v]}</option>)}
              </select>
              <StateBadge state={s}/>
            </div>
          ))}
        </div>
      </div>

      {/* RESULTS */}
      <div style={{flex:1,padding:'clamp(10px,1.5vw,20px) clamp(10px,2vw,28px)',display:'flex',flexDirection:'column',gap:'clamp(12px,1.2vw,18px)'}}>

        {!result&&!episodeSteps.length&&(
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,padding:'60px 0',opacity:0.5}}>
            <div style={{color:C.textSec,fontSize:'clamp(14px,1.2vw,17px)',fontWeight:600,textAlign:'center'}}>
              Set patient states and run a step<br/>
              <span style={{fontSize:'clamp(14px,1.1vw,16px)',fontWeight:400,color:C.textMuted}}>Multi-agent results will appear here</span>
            </div>
          </div>
        )}

        {result&&!episodeSteps.length&&(
          <div style={{display:'flex',flexDirection:'column',gap:'clamp(12px,1.2vw,16px)'}}>

            {/* Step 1 */}
            <div className="card" style={{borderTop:'2px solid rgba(96,165,250,0.6)'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div style={{width:28,height:28,borderRadius:8,background:'rgba(96,165,250,0.15)',border:'1px solid rgba(96,165,250,0.35)',display:'flex',alignItems:'center',justifyContent:'center',color:'#93c5fd',fontSize:13,fontWeight:800,flexShrink:0}}>1</div>
                <div>
                  <div style={{color:C.text,fontSize:'clamp(15px,1.2vw,17px)',fontWeight:600}}>Supervisor assessed the ward</div>
                  <div style={{color:C.textMuted,fontSize:'clamp(14px,1.1vw,16px)'}}>All 3 patient states aggregated → ward severity derived</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
                {result.triage_agents.map((t,i)=>(
                  <div key={i} style={{background:'#060d1a',border:`1px solid ${C.cardBorder}`,borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
                    <div className="t-label" style={{marginBottom:7}}>Patient {i+1}</div>
                    <StateBadge state={t.state}/>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:14}}>
                <div style={{flex:1,height:1,background:C.cardBorder}}/>
                <div style={{textAlign:'center'}}>
                  <div className="t-label" style={{marginBottom:6}}>Ward derived as</div>
                  <WardBadge w={result.supervisor.ward_state} size="lg"/>
                </div>
                <div style={{flex:1,height:1,background:C.cardBorder}}/>
              </div>
            </div>

            {/* Step 2 */}
            <div className="card" style={{borderTop:'2px solid rgba(56,189,248,0.6)'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div style={{width:28,height:28,borderRadius:8,background:'rgba(56,189,248,0.12)',border:'1px solid rgba(56,189,248,0.3)',display:'flex',alignItems:'center',justifyContent:'center',color:'#38bdf8',fontSize:13,fontWeight:800,flexShrink:0}}>2</div>
                <div>
                  <div style={{color:C.text,fontSize:'clamp(15px,1.2vw,17px)',fontWeight:600}}>Supervisor chose action</div>
                  <div style={{color:C.textMuted,fontSize:'clamp(14px,1.1vw,16px)'}}>Q-table policy from 3000 training episodes</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div style={{background:'#060d1a',border:`1px solid ${C.cardBorder}`,borderRadius:10,padding:'clamp(12px,1.2vw,16px)'}}>
                  <div className="t-label" style={{marginBottom:10}}>Action Taken</div>
                  <div style={{marginBottom:12}}><WardActionBadge action={result.supervisor.action}/></div>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:10}}>
                    <WardBadge w={result.supervisor.ward_state}/>
                    <span style={{color:C.textDim,fontSize:16}}>→</span>
                    <WardBadge w={result.supervisor.next_ward_state}/>
                    {(()=>{const wp=WARD_PROBS[`${result.supervisor.ward_state}-${result.supervisor.action}`];const p=wp?wp[result.supervisor.next_ward_state]:null;return p!==null?<span style={{color:'#93c5fd',fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:700}}>{(p*100).toFixed(0)}%</span>:null})()}
                  </div>
                  {result.supervisor.override_target!==null&&(
                    <div style={{background:'rgba(192,132,252,0.1)',border:'1px solid rgba(192,132,252,0.3)',borderRadius:8,padding:'8px 12px'}}>
                      <span style={{color:'#c084fc',fontSize:'clamp(14px,1.1vw,16px)',fontWeight:600}}>⚡ Overrode Patient {result.supervisor.override_target+1} — forced stronger action</span>
                    </div>
                  )}
                </div>
                <div style={{background:'#060d1a',border:`1px solid ${C.cardBorder}`,borderRadius:10,padding:'clamp(12px,1.2vw,16px)'}}>
                  <div className="t-label" style={{marginBottom:6}}>Ward Reward</div>
                  <div style={{color:result.supervisor.reward>=0?'#4ade80':'#fb7185',fontFamily:'JetBrains Mono,monospace',fontSize:'clamp(22px,2.2vw,30px)',fontWeight:800,letterSpacing:'-0.02em',marginBottom:14}}>
                    {result.supervisor.reward>0?'+':''}{result.supervisor.reward.toFixed(1)}
                  </div>
                  <div className="t-label" style={{marginBottom:8}}>Ward Transition Probs</div>
                  {(()=>{const probs=WARD_PROBS[`${result.supervisor.ward_state}-${result.supervisor.action}`];return probs?(
                    <div style={{display:'flex',flexDirection:'column',gap:7}}>
                      {probs.map((p,w)=>p>0&&(
                        <div key={w} style={{display:'flex',alignItems:'center',gap:7}}>
                          <div style={{width:'clamp(60px,7vw,80px)',background:'#081020',borderRadius:3,height:4,flexShrink:0}}><div style={{width:`${p*100}%`,height:'100%',background:WARD_PROB_COLORS[w],borderRadius:3}}/></div>
                          <span style={{color:C.textMuted,fontSize:14,fontFamily:'JetBrains Mono,monospace',width:26}}>{(p*100).toFixed(0)}%</span>
                          <WardBadge w={w}/>
                          {w===result.supervisor.next_ward_state&&<span style={{color:WARD_PROB_COLORS[w],fontSize:13,fontWeight:600}}>← occurred</span>}
                        </div>
                      ))}
                    </div>
                  ):null})()}
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="card" style={{borderTop:'2px solid rgba(74,222,128,0.6)'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div style={{width:28,height:28,borderRadius:8,background:'rgba(74,222,128,0.12)',border:'1px solid rgba(74,222,128,0.3)',display:'flex',alignItems:'center',justifyContent:'center',color:'#4ade80',fontSize:13,fontWeight:800,flexShrink:0}}>3</div>
                <div>
                  <div style={{color:C.text,fontSize:'clamp(15px,1.2vw,17px)',fontWeight:600}}>Patient outcomes</div>
                  <div style={{color:C.textMuted,fontSize:'clamp(14px,1.1vw,16px)'}}>Each Triage Agent executed — overridden agents used Supervisor's forced action</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                {result.triage_agents.map((t,i)=>{
                  const probs=TRIAGE_PROBS[`${t.state}-${t.action}`]
                  const prob=probs?probs[t.next_state]:null
                  const isOvr=result.supervisor.override_target===i
                  const imp=t.next_state<t.state,wor=t.next_state>t.state
                  return (
                    <div key={i} style={{background:'#060d1a',border:`1.5px solid ${isOvr?'rgba(192,132,252,0.45)':C.cardBorder}`,borderRadius:10,padding:'clamp(12px,1.2vw,16px)'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                        <div className="t-label">Patient {i+1}</div>
                        {isOvr&&<span style={{background:'rgba(192,132,252,0.12)',color:'#c084fc',border:'1px solid rgba(192,132,252,0.35)',borderRadius:20,padding:'2px 9px',fontSize:'clamp(13px,1vw,15px)',fontWeight:700}}>⚡ Overridden</span>}
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap',marginBottom:12}}>
                        <StateBadge state={t.state}/>
                        <span style={{color:C.textDim,fontSize:15}}>→</span>
                        <ActionBadge action={t.action} overridden={t.overridden}/>
                        <span style={{color:C.textDim,fontSize:15}}>→</span>
                        <StateBadge state={t.next_state}/>
                      </div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:imp?'rgba(74,222,128,0.08)':wor?'rgba(251,113,133,0.08)':'rgba(255,255,255,0.02)',border:`1px solid ${imp?'rgba(74,222,128,0.25)':wor?'rgba(251,113,133,0.25)':'rgba(255,255,255,0.06)'}`,borderRadius:8,padding:'8px 12px'}}>
                        <span style={{color:imp?'#4ade80':wor?'#fb7185':'#4a6080',fontSize:'clamp(14px,1.1vw,16px)',fontWeight:700}}>{imp?'↑ Improved':wor?'↓ Worsened':'→ Unchanged'}</span>
                        <div style={{display:'flex',gap:14}}>
                          <div style={{textAlign:'right'}}>
                            <div className="t-label" style={{marginBottom:1}}>Prob</div>
                            <div style={{color:'#93c5fd',fontFamily:'JetBrains Mono,monospace',fontWeight:700,fontSize:'clamp(15px,1.2vw,17px)'}}>{prob!==null?`${(prob*100).toFixed(0)}%`:'—'}</div>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <div className="t-label" style={{marginBottom:1}}>Reward</div>
                            <div style={{color:t.reward>=0?'#4ade80':'#fb7185',fontFamily:'JetBrains Mono,monospace',fontWeight:700,fontSize:'clamp(15px,1.2vw,17px)'}}>{t.reward>0?'+':''}{t.reward.toFixed(1)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {result.ward_report&&(
              <div className="card" style={{borderLeft:'2px solid rgba(37,99,235,0.6)',borderRadius:'0 12px 12px 0'}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:'#2563eb',boxShadow:'0 0 8px rgba(37,99,235,0.7)'}}/>
                  <div className="t-label">Claude Ward Report</div>
                </div>
                <p style={{color:C.textSec,fontSize:'clamp(15px,1.2vw,17px)',lineHeight:1.75}}>{result.ward_report}</p>
              </div>
            )}
          </div>
        )}

        {/* Episode */}
        {episodeSteps.length>0&&(
          <div className="card">
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
              <div>
                <div className="t-label" style={{marginBottom:4}}>Episode Timeline</div>
                <div style={{color:C.textSec,fontSize:'clamp(15px,1.2vw,17px)',fontWeight:600}}>
                  {episodeRunning?`Running · step ${episodeSteps.length}`:`${episodeSteps.length} steps`}
                  {episodeDone&&episodeSteps[episodeSteps.length-1]?.triage_agents.every(t=>t.next_state===0)&&<span style={{color:'#4ade80',marginLeft:8}}>· Ward stabilized ✓</span>}
                </div>
              </div>
              {episodeDone&&(
                <div style={{display:'flex',gap:20,textAlign:'right'}}>
                  <div><div className="t-label" style={{marginBottom:2}}>Supervisor Reward</div><div style={{color:totalRew>=0?'#4ade80':'#fb7185',fontFamily:'JetBrains Mono,monospace',fontSize:'clamp(20px,2vw,26px)',fontWeight:800}}>{totalRew>0?'+':''}{totalRew.toFixed(1)}</div></div>
                  <div><div className="t-label" style={{marginBottom:2}}>Overrides</div><div style={{color:'#c084fc',fontFamily:'JetBrains Mono,monospace',fontSize:'clamp(20px,2vw,26px)',fontWeight:800}}>{totalOvr}</div></div>
                </div>
              )}
            </div>

            {/* Ward flow */}
            <div style={{background:'#060d1a',border:`1px solid ${C.cardBorder}`,borderRadius:8,padding:'clamp(10px,1vw,14px) clamp(14px,1.4vw,18px)',marginBottom:14,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',bottom:0,left:0,right:0,height:1,background:'linear-gradient(90deg,#fb7185,#60a5fa,#a5b4fc,#4ade80)',opacity:0.35}}/>
              {episodeSteps.map((step,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:6,position:'relative',zIndex:1}}>
                  {i===0&&<WardBadge w={step.supervisor.ward_state}/>}
                  {step.supervisor.override_target!==null&&<span style={{color:'#c084fc',fontSize:13}}>⚡</span>}
                  <span style={{color:C.textDim,fontSize:15}}>→</span>
                  <WardBadge w={step.supervisor.next_ward_state}/>
                </div>
              ))}
              {episodeRunning&&<div style={{width:16,height:16,borderRadius:'50%',border:'2px solid #2563eb',borderTopColor:'transparent',animation:'spin 0.7s linear infinite'}}/>}
            </div>

            {/* Table */}
            <div style={{overflowX:'auto',border:`1px solid ${C.cardBorder}`,borderRadius:8}}>
              <table className="data-table">
                <thead><tr>
                  <th style={{minWidth:36}}>#</th>
                  <th style={{minWidth:260}}>Supervisor</th>
                  <th style={{minWidth:260,color:'#38bdf8'}}>Patient 1</th>
                  <th style={{minWidth:260,color:'#a5b4fc'}}>Patient 2</th>
                  <th style={{minWidth:260,color:'#c084fc'}}>Patient 3</th>
                  <th style={{minWidth:80}}>Reward</th>
                  <th style={{minWidth:80}}>Cumul.</th>
                  <th style={{minWidth:60}}>Ask</th>
                </tr></thead>
                <tbody>
                  {episodeSteps.map((s,i)=>{
                    const cum=episodeSteps.slice(0,i+1).reduce((a,r)=>a+r.supervisor.reward,0)
                    const sup=s.supervisor
                    const wp=WARD_PROBS[`${sup.ward_state}-${sup.action}`]
                    const wpr=wp?wp[sup.next_ward_state]:null
                    return (
                      <tr key={i} style={sup.override_target!==null?{background:'rgba(192,132,252,0.04)'}:{}}>
                        <td style={{color:C.textMuted,fontFamily:'JetBrains Mono,monospace'}}>{s.stepNum}</td>
                        <td>
                          <div style={{display:'flex',flexDirection:'column',gap:5}}>
                            <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'nowrap'}}>
                              <WardBadge w={sup.ward_state}/>
                              <span style={{color:C.textDim}}>→</span>
                              <WardActionBadge action={sup.action}/>
                              <span style={{color:C.textDim}}>→</span>
                              <WardBadge w={sup.next_ward_state}/>
                              {wpr!==null&&<span style={{color:'#93c5fd',fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700}}>{(wpr*100).toFixed(0)}%</span>}
                            </div>
                            {sup.override_target!==null&&<span style={{background:'rgba(192,132,252,0.1)',color:'#c084fc',border:'1px solid rgba(192,132,252,0.3)',borderRadius:20,padding:'2px 8px',fontSize:14,fontWeight:700,width:'fit-content'}}>⚡ Forced P{sup.override_target+1} to escalate</span>}
                          </div>
                        </td>
                        {s.triage_agents.map((t,j)=>{
                          const tp=TRIAGE_PROBS[`${t.state}-${t.action}`]
                          const prob=tp?tp[t.next_state]:null
                          const imp=t.next_state<t.state,wor=t.next_state>t.state
                          return (
                            <td key={j}>
                              <div style={{display:'flex',alignItems:'center',gap:4,flexWrap:'nowrap'}}>
                                <StateBadge state={t.state}/>
                                <span style={{color:C.textDim}}>→</span>
                                <span style={{padding:'2px 7px',borderRadius:5,fontSize:'clamp(13px,1vw,15px)',fontWeight:700,fontFamily:'DM Sans,sans-serif',whiteSpace:'nowrap',background:t.overridden?'rgba(192,132,252,0.12)':'rgba(255,255,255,0.03)',color:t.overridden?'#c084fc':'#4a6080',border:`1px solid ${t.overridden?'rgba(192,132,252,0.4)':'rgba(255,255,255,0.07)'}`}}>A{t.action}{t.overridden?'⚡':''}</span>
                                <span style={{color:C.textDim}}>→</span>
                                <StateBadge state={t.next_state}/>
                                {prob!==null&&<span style={{color:'#93c5fd',fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700}}>{(prob*100).toFixed(0)}%</span>}
                                <span style={{color:imp?'#4ade80':wor?'#fb7185':C.textMuted,fontSize:14,fontWeight:700}}>{imp?'↑':wor?'↓':'='}</span>
                              </div>
                            </td>
                          )
                        })}
                        <td style={{color:sup.reward>=0?'#4ade80':'#fb7185',fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>{sup.reward>0?'+':''}{sup.reward.toFixed(1)}</td>
                        <td style={{color:cum>=0?'#60a5fa':'#fb7185',fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>{cum>0?'+':''}{cum.toFixed(1)}</td>
                        <td><button onClick={()=>askWardExplain(s)} disabled={llmLoading} style={{background:'rgba(37,99,235,0.12)',color:'#93c5fd',border:'1.5px solid rgba(37,99,235,0.35)',padding:'4px 12px',borderRadius:7,fontSize:'clamp(14px,1.1vw,16px)',cursor:'pointer',fontFamily:'Inter,sans-serif',fontWeight:600,opacity:llmLoading?0.4:1,transition:'all 0.15s'}}>{llmLoading?'...':'Ask'}</button></td>
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
                <div className="t-label">Claude Ward Report</div>
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
