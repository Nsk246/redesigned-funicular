import { useState, useEffect } from 'react'
import Phase1 from './pages/Phase1'
import Phase2 from './pages/Phase2'
import About  from './pages/About'

const TABS = [
  { id:'about',  label:'Overview' },
  { id:'phase1', label:'Phase 1'  },
  { id:'phase2', label:'Phase 2'  },
]

export default function App() {
  const [tab, setTab]   = useState('about')
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => setTime(new Date().toTimeString().split(' ')[0])
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])

  return (
    <div style={{ minHeight:'100vh' }}>
      {/* Header */}
      <header style={{
        background: '#060e1c',
        borderBottom: '1px solid rgba(59,130,246,0.2)',
        position: 'sticky', top: 0, zIndex: 50,
        height: 52,
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(12px,2vw,24px)',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:30, height:30,
            background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
            borderRadius:8,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow: '0 0 16px rgba(37,99,235,0.6), 0 0 32px rgba(37,99,235,0.25)',
            flexShrink:0,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="5.5" y="0" width="3" height="14" rx="1.5" fill="white"/>
              <rect x="0" y="5.5" width="14" height="3" rx="1.5" fill="white"/>
            </svg>
          </div>
          <div>
            <div style={{ color:'#ffffff', fontSize:'clamp(15px,1.2vw,17px)', fontWeight:700, lineHeight:1.2 }}>Hospital Triage AI</div>
            <div style={{ color:'#4a78b0', fontSize:'clamp(12px,0.9vw,13px)' }}>RL + LLM Multi-Agent</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display:'flex', background:'#0a1830', border:'1px solid rgba(59,130,246,0.2)', borderRadius:8, padding:3, gap:2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`nav-tab${tab===t.id?' active':''}`}>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Status */}
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(4,20,12,0.8)', border:'1px solid rgba(34,197,94,0.25)', borderRadius:20, padding:'5px 12px' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 8px #22c55e' }}/>
          <span style={{ color:'#4ade80', fontSize:'clamp(13px,1vw,15px)', fontWeight:600 }}>Live</span>
          <span style={{ color:'rgba(74,222,128,0.4)', fontSize:'clamp(13px,1vw,15px)', fontFamily:'JetBrains Mono,monospace' }}>{time}</span>
        </div>
      </header>

      {/* Page */}
      <main className="page">
        {tab==='about'  && <About />}
        {tab==='phase1' && <Phase1 />}
        {tab==='phase2' && <Phase2 />}
      </main>
    </div>
  )
}
