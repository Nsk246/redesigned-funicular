# 🏥 Hospital Triage AI

A hybrid **Reinforcement Learning + LLM multi-agent system** for intelligent patient triage and ward management. Built as an AI Agent course project.

---

## 🧠 Architecture

### Phase 1 — Single Triage Agent (DQN)
- Deep Q-Network trained over 2000 episodes
- Manages a single patient across 5 severity states
- Legal action masking prevents clinically invalid actions
- LLM layer explains every decision in natural language

### Phase 2 — Multi-Agent System (Q-Learning)
- Supervisor Agent (Q-Learning, 3000 episodes) manages the entire ward
- Coordinates 3 independent Triage Agents
- Can override individual agents when ward is in crisis
- Ward state derived from all patient states combined

### LLM Layer (Claude API)
- Parses natural language patient descriptions into structured vitals
- Generates clinical explanations for every RL decision
- Strictly separated from RL logic — LLM never makes decisions

---

## 🗂️ Project Structure
hospital-triage-agent/
├── backend/
│   ├── agents/
│   │   ├── triage_agent.py        # DQN agent — Phase 1
│   │   ├── supervisor_agent.py    # Q-Learning supervisor — Phase 2
│   │   └── llm_layer.py           # Claude API integration
│   ├── api/
│   │   └── main.py                # FastAPI REST endpoints
│   ├── models/
│   │   ├── dqn_model.py           # Neural network architecture
│   │   └── saved/
│   │       ├── triage_agent.pth   # Trained DQN weights
│   │       └── supervisor_qtable.npy  # Trained Q-table
│   ├── training/
│   │   ├── train_triage.py        # Phase 1 training script
│   │   └── train_supervisor.py    # Phase 2 training script
│   ├── utils/
│   │   └── state_mapper.py        # Vitals → state mapping
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── About.jsx          # Overview, MDP docs, interactive demos
│   │   │   ├── Phase1.jsx         # Triage agent UI
│   │   │   └── Phase2.jsx         # Multi-agent UI
│   │   ├── components/
│   │   │   ├── StateBadge.jsx
│   │   │   ├── ActionBadge.jsx
│   │   │   └── QValueBar.jsx
│   │   └── App.jsx
│   └── package.json
└── README.md

---

## 🔬 MDP Design

### Triage Agent — States S0–S4

| State | Label     | Vitals |
|-------|-----------|--------|
| S0    | Healthy   | HR 60–100 · BP 90–140 · Temp 36–38°C · SpO2 ≥95% |
| S1    | At Risk   | HR 100–120 · BP 140–160 · Temp 38–39°C · SpO2 92–95% |
| S2    | Unstable  | HR 120–140 · BP 160–180 · Temp 39–40°C · SpO2 88–92% |
| S3    | Critical  | HR >140 · BP >180 · Temp >40°C · SpO2 <88% |
| S4    | Emergency | Extreme values across multiple vitals |

### Triage Agent — Actions (with legal mask)

| Action | Label              | Legal States |
|--------|--------------------|--------------|
| A0     | Monitor            | S0, S1, S2   |
| A1     | Treat              | S1, S2       |
| A2     | Escalate           | S1, S2, S3, S4 |
| A3     | Emergency Response | S2, S3, S4   |

### Vitals → State Mapping

Each vital is scored 0–4 independently. Final state = max score across all vitals.

| Vital | Score 0 | Score 1 | Score 2 | Score 3 | Score 4 |
|-------|---------|---------|---------|---------|---------|
| HR | 60–100 | — | 100–120 | 120–140 | >140 |
| BP Sys | 90–140 | — | 140–160 | 160–180 | >180 |
| SpO2 | ≥95% | 92–95% | 88–92% | 85–88% | <85% |
| Temp | 36–38°C | — | 38–39°C | 39–40°C | >40°C |

### Reward Function

| Transition | Reward |
|------------|--------|
| Patient improves N states | +N × 10 |
| No change | 0 |
| Patient worsens N states | −N × 10 |
| Stuck at S4 → S4 | −30 |
| Over-escalation (S2 + Emergency) | −15 |
| S4 → S2 or better (saved) | +25 |

### Supervisor Agent — Ward States W0–W4

| Ward | Label      | Condition |
|------|------------|-----------|
| W0   | Calm       | All patients ≤ S1 |
| W1   | Active     | count(S2) ≥ 1 |
| W2   | Busy       | count(S2) ≥ 3 OR count(S3) = 1 |
| W3   | Overloaded | count(S3) ≥ 2 OR count(S4) = 1 |
| W4   | Crisis     | count(S4) ≥ 2 |

### Supervisor Agent — Actions

| Action | Label           | Legal Wards |
|--------|-----------------|-------------|
| B0     | Standby         | W0, W1, W2  |
| B1     | Reallocate      | W1, W2, W3  |
| B2     | Override Triage | W2, W3, W4  |
| B3     | Request Backup  | W2, W3, W4  |

### Trained Q-Table (after 3000 episodes)

| Ward State  | B0 Standby | B1 Reallocate | B2 Override | B3 Backup |
|-------------|------------|---------------|-------------|-----------|
| W0 Calm     | -6.03      | —             | —           | —         |
| W1 Active   | 3.27       | 3.71          | —           | —         |
| W2 Busy     | 12.49      | 12.28         | 13.28       | 12.29     |
| W3 Overloaded | —        | -1.56         | 16.85       | **21.21** |
| W4 Crisis   | —          | —             | 6.03        | **18.59** |

**Key insight:** Request Backup at Crisis (18.59) >> Override (6.03) — the agent independently learned that bringing new resources outperforms reshuffling existing ones during a crisis. Clinically correct, discovered with zero hardcoded rules.

---

## 🚀 Setup & Run

### Prerequisites
- Python 3.11+
- Node.js 18+
- Anthropic API key → [console.anthropic.com](https://console.anthropic.com)

### 1. Clone
```bash
git clone https://github.com/Nsk246/hospital-triage-ai
cd hospital-triage-ai
```

### 2. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Mac/Linux
pip install -r requirements.txt
```

### 3. Environment
```bash
# Create backend/.env
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env
```

### 4. Run backend (Terminal 1)
```bash
cd backend/api
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Run frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```

### 6. Open
http://localhost:5173

### Apple Silicon (M1/M2/M3)
```bash
pip install torch==2.3.0 --index-url https://download.pytorch.org/whl/cpu
```

---

## 🔁 Retraining

```bash
# Retrain Triage Agent (Phase 1) — ~2 min
python backend/training/train_triage.py

# Retrain Supervisor Agent (Phase 2) — ~3 min
python backend/training/train_supervisor.py
```

---

## 🐛 Bug Fixes Applied

| # | Severity | File | Fix |
|---|----------|------|-----|
| 1 | Critical | triage_agent.py | `done=False` always — was `done=next_state==4`, poisoning Q-learning |
| 2 | Critical | supervisor_agent.py | Under-action penalty targets `action==1` not `action==0` (which was masked) |
| 3 | Critical | main.py | Q-table now learns from actual reward, not sampled reward |
| 4 | High | train_triage.py | Removed `step > 15` condition — early exit was poisoning S4 replays |
| 5 | Moderate | Phase1.jsx | Action label fixed: `Emergency` → `Emergency Response` |
| 6 | Moderate | Phase2.jsx | Dead ternary removed — ward flow now shows correct states |
| 7 | Low | supervisor_agent.py | `episode_rewards.append()` now called — metrics endpoint works |
| 8 | Low | llm_layer.py | Robust JSON parsing with regex fallback — no more 500 crashes |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| RL — Phase 1 | PyTorch DQN, Experience Replay, Target Network |
| RL — Phase 2 | Tabular Q-Learning, Epsilon-Greedy |
| LLM | Anthropic Claude API (claude-haiku-4-5) |
| Backend | Python 3.11, FastAPI, Uvicorn |
| Frontend | React, Vite, TailwindCSS |
| Fonts | Inter, JetBrains Mono |

---

## 📄 License

MIT
