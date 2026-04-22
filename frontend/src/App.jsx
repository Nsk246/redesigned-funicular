import { useState } from 'react'
import Phase1 from './pages/Phase1'
import Phase2 from './pages/Phase2'
import Comparison from './pages/Comparison'
import About from './pages/About'

const TABS = [
  { id:'about',      label:'Overview',   sub:'Problem & Design' },
  { id:'phase1',     label:'Phase 1',    sub:'Single Agent'     },
  { id:'phase2',     label:'Phase 2',    sub:'Multi-Agent'      },
  { id:'comparison', label:'Comparison', sub:'P1 vs P2'         },
]

export default function App() {
  const [tab, setTab] = useState('about')
  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-lg">🏥</div>
            <div>
              <h1 className="font-bold text-white leading-tight">Hospital Triage AI</h1>
              <p className="text-xs text-gray-500">RL + LLM Multi-Agent System</p>
            </div>
          </div>
          <nav className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  tab===t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-white'
                }`}>
                <span>{t.label}</span>
                <span className={`block text-xs font-normal ${tab===t.id?'text-blue-200':'text-gray-600'}`}>{t.sub}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab==='about'      && <About />}
        {tab==='phase1'     && <Phase1 />}
        {tab==='phase2'     && <Phase2 />}
        {tab==='comparison' && <Comparison />}
      </main>
    </div>
  )
}
