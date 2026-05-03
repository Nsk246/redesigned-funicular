# Hospital Triage AI

A hybrid Reinforcement Learning and LLM multi-agent system for intelligent patient triage and ward management. Built as an AI Agent course project.

## Live Demo

The application is deployed and accessible without any local setup:

- Frontend: https://delightful-learning-production-7606.up.railway.app
- Backend API: https://redesigned-funicular-production.up.railway.app/docs

---

## Architecture

### Phase 1 — Single Triage Agent (DQN)
- Deep Q-Network trained over 2000 episodes
- Manages a single patient across 5 severity states (S0 Healthy to S4 Emergency)
- Legal action masking prevents clinically invalid actions
- Single step automatically generates a Claude explanation
- Episode run logs all steps, explanations available on demand via Ask button

### Phase 2 — Multi-Agent System (Q-Learning)
- Supervisor Agent (Q-Learning, 3000 episodes) observes the entire ward
- Coordinates 3 independent DQN Triage Agents, one per patient
- Ward state W0-W4 derived by aggregating all three patient states
- Supervisor can override the most critical triage agent when ward is in crisis
- Single step automatically generates a Claude ward report
- Episode run logs all steps, ward reports available on demand via Ask button
- Patient states are assigned directly via dropdown (no NLP input in Phase 2)

### LLM Layer (Claude API)
- Phase 1 only: parses natural language patient descriptions into structured vitals
- Generates clinical triage explanations after every single step
- Generates ward-level supervisor reports covering all three patients
- Strictly separated from RL logic — LLM never selects actions or sees Q-values

---

## Project Structure
hospital-triage-agent/
├── backend/
│   ├── agents/
│   │   ├── triage_agent.py        # DQN agent — Phase 1 and Phase 2
│   │   ├── supervisor_agent.py    # Q-Learning supervisor — Phase 2
│   │   └── llm_layer.py           # Claude API integration
│   ├── api/
│   │   └── main.py                # FastAPI REST endpoints
│   ├── models/
│   │   ├── dqn_model.py           # Neural network + action mask
│   │   ├── q_table.py             # Q-table + ward action mask
│   │   └── saved/
│   │       ├── triage_agent.pth
│   │       └── supervisor_qtable.npy
│   ├── training/
│   │   ├── train_triage.py
│   │   └── train_supervisor.py
│   ├── utils/
│   │   └── state_mapper.py        # Vitals scoring + ward derivation
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── About.jsx
│   │   │   ├── Phase1.jsx
│   │   │   └── Phase2.jsx
│   │   ├── components/
│   │   │   ├── StateBadge.jsx
│   │   │   ├── ActionBadge.jsx
│   │   │   ├── QValueBar.jsx
│   │   │   └── RewardChart.jsx
│   │   └── App.jsx
│   └── package.json
└── README.md

---

## MDP Design

### Triage States S0-S4

| State | Label     | Clinical Description |
|-------|-----------|----------------------|
| S0    | Healthy   | All vitals within normal range |
| S1    | At Risk   | One vital mildly out of range |
| S2    | Unstable  | Multiple vitals elevated |
| S3    | Critical  | Dangerous readings, urgent response needed |
| S4    | Emergency | Life-threatening, immediate intervention required |

### Vitals to State Scoring

Each vital is scored 0 to 3 independently. Scores are summed together with a risk modifier. Final state is determined by total score thresholds.

| Vital      | Score 0      | Score 1            | Score 2              | Score 3              |
|------------|--------------|--------------------|----------------------|----------------------|
| Heart Rate | 60 to 100    | 100-120 or 50-60   | 120-140 or 40-50     | Above 140 or below 40 |
| BP Systolic| 100 to 140   | 140-160 or 90-100  | 160-180 or 80-90     | Above 180 or below 80 |
| SpO2       | 95% or above | 92 to 95%          | 88 to 92%            | Below 88% |
| Temperature| 36 to 38C    | 38 to 39C          | 39 to 40C or below 36| Above 40 or below 35 |

Risk modifiers: age above 70 adds 1, two or more pre-existing conditions adds 1.

State thresholds: total 0 = S0, 1-2 = S1, 3-5 = S2, 6-8 = S3, 9 or above = S4.

### Triage Actions with Legal Mask

| Action | Label              | Legal States   |
|--------|--------------------|----------------|
| A0     | Monitor            | S0, S1, S2     |
| A1     | Treat              | S1, S2         |
| A2     | Escalate           | S1, S2, S3, S4 |
| A3     | Emergency Response | S2, S3, S4     |

### Triage Reward Function

| Condition                          | Reward    |
|------------------------------------|-----------|
| Patient improves N states          | +N x 10   |
| No change                          | 0         |
| Patient worsens N states           | -N x 10   |
| Stuck at S4 to S4                  | -30       |
| Over-escalation (S2 + Emergency)   | -15       |
| Under-action at S3 or S4 (A0, A1)  | -20       |
| S4 saved to S2 or better           | +25       |

### Supervisor Ward States W0-W4

| Ward | Label      | Derivation Rule                        |
|------|------------|----------------------------------------|
| W0   | Calm       | All patients at S0 or S1               |
| W1   | Active     | count(S2) >= 1                         |
| W2   | Busy       | count(S2) >= 3 or count(S3) = 1        |
| W3   | Overloaded | count(S3) >= 2 or count(S4) = 1        |
| W4   | Crisis     | count(S4) >= 2                         |

### Supervisor Actions with Legal Mask

| Action | Label           | Legal Wards    |
|--------|-----------------|----------------|
| B0     | Standby         | W0, W1         |
| B1     | Reallocate      | W1, W2, W3     |
| B2     | Override Triage | W2, W3, W4     |
| B3     | Request Backup  | W2, W3, W4     |

### Trained Q-Table (after 3000 episodes)

| Ward State   | B0 Standby | B1 Reallocate | B2 Override | B3 Backup  |
|--------------|------------|---------------|-------------|------------|
| W0 Calm      | -6.03      | ---           | ---         | ---        |
| W1 Active    | 3.27       | 3.71          | ---         | ---        |
| W2 Busy      | 12.49      | 12.28         | 13.28       | 12.29      |
| W3 Overloaded| ---        | -1.56         | 16.85       | **21.21**  |
| W4 Crisis    | ---        | ---           | 6.03        | **18.59**  |

Key insight: Request Backup at W3 (21.21) vastly outperforms Reallocate (-1.56). The agent learned that bringing new resources outperforms reshuffling existing ones. Discovered with zero hardcoded rules.

---

## API Endpoints

| Method | Endpoint               | Description                              |
|--------|------------------------|------------------------------------------|
| POST   | /api/vitals-to-state   | Map raw vitals to a state integer        |
| POST   | /api/parse-patient     | Parse free text into vitals and state    |
| POST   | /api/triage-step       | Run one Phase 1 agent step               |
| POST   | /api/supervisor-step   | Run one Phase 2 multi-agent step         |
| POST   | /api/explain-step      | Generate LLM explanation for a transition|
| POST   | /api/ward-explain      | Generate ward report for an episode step |
| GET    | /api/metrics           | Get live session performance metrics     |

---

## Setup and Run

### Prerequisites
- Python 3.12
- Node.js 22
- Anthropic API key from console.anthropic.com

### 1. Clone
```bash
git clone https://github.com/Nsk246/redesigned-funicular
cd redesigned-funicular
```

### 2. Backend setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Add API key
```bash
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

## Running in GitHub Codespaces

The browser in a codespace cannot reach localhost:8000 directly. Follow these extra steps:

1. In the VS Code Ports tab at the bottom, right-click port 8000 and set visibility to **Public**
2. Find your codespace name by running `echo $CODESPACE_NAME` in the terminal
3. Create `frontend/.env.local` with the following content, replacing YOUR-CODESPACE-NAME with your actual codespace name:
VITE_API_URL=https://YOUR-CODESPACE-NAME-8000.app.github.dev
4. Restart the frontend dev server

This file is gitignored and does not affect the Railway deployment.

---

## Retraining

Retraining is only needed if the reward function or MDP structure is changed.

```bash
# Retrain Triage Agent (Phase 1) — approximately 2 minutes
python backend/training/train_triage.py

# Retrain Supervisor Agent (Phase 2) — approximately 3 minutes
python backend/training/train_supervisor.py
```

---

## Tech Stack

| Category  | Technology                                      |
|-----------|-------------------------------------------------|
| RL        | PyTorch DQN, Experience Replay, Tabular Q-Learning, Epsilon-Greedy, Legal Action Masking |
| LLM       | Anthropic Claude API (claude-haiku-4-5)         |
| Backend   | Python 3.12, FastAPI, Uvicorn                   |
| Frontend  | React 19, Vite 8, TailwindCSS, Recharts, Axios  |
| Fonts     | Inter, JetBrains Mono                           |
| Deploy    | Railway (backend + frontend)                    |

---

## License

MIT
