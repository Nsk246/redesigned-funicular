"""
main.py
-------
FastAPI backend — REST API for the frontend.

Endpoints:
    POST /api/parse-patient     : LLM parses natural language → vitals + state
    POST /api/triage-step       : Run one Triage Agent step
    POST /api/supervisor-step   : Run one Supervisor step (Phase 2)
    POST /api/ward-report       : Generate LLM ward report
    GET  /api/q-values/{state}  : Get Q-values for visualization
    GET  /api/q-table           : Get full Supervisor Q-table
    POST /api/train             : Trigger training run
    GET  /api/metrics           : Get agent performance metrics
"""

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np

from agents.triage_agent import TriageAgent
from agents.supervisor_agent import SupervisorAgent
from agents.llm_layer import parse_patient_input, generate_triage_explanation, generate_ward_report
from utils.state_mapper import vitals_to_state, patients_to_ward_state, STATE_LABELS

app = FastAPI(title="Hospital Triage Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Initialize agents ──────────────────────────────────────────
triage_agent     = TriageAgent(patient_id="P1")
triage_agents_p2 = [TriageAgent(patient_id=f"P{i+1}") for i in range(3)]
supervisor_agent = SupervisorAgent()

TRIAGE_PATH     = os.path.join(os.path.dirname(__file__), "../models/saved/triage_agent.pth")
SUPERVISOR_PATH = os.path.join(os.path.dirname(__file__), "../models/saved/supervisor_qtable.npy")

# Load saved models if they exist
if os.path.exists(TRIAGE_PATH):
    triage_agent.load(TRIAGE_PATH)
    for ta in triage_agents_p2:
        ta.load(TRIAGE_PATH)
    print("✅ Loaded pre-trained Triage Agent")

if os.path.exists(SUPERVISOR_PATH):
    supervisor_agent.load(SUPERVISOR_PATH)
    print("✅ Loaded pre-trained Supervisor Agent")


# ── Request / Response Models ───────────────────────────────────
class NaturalLanguageInput(BaseModel):
    text: str

class ManualVitalsInput(BaseModel):
    hr: float
    bp_sys: float
    bp_dia: float
    temp: float
    spo2: float
    age: int
    conditions: int

class TriageStepInput(BaseModel):
    state: int
    use_llm: bool = True

class SupervisorStepInput(BaseModel):
    patient_states: List[int]
    use_llm: bool = True


# ── Endpoints ──────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "message": "Hospital Triage Agent API running"}


@app.post("/api/parse-patient")
def parse_patient(body: NaturalLanguageInput):
    """LLM parses natural language description into vitals + state."""
    try:
        vitals  = parse_patient_input(body.text)
        state   = vitals_to_state(**vitals)
        return {
            "vitals": vitals,
            "state": state,
            "state_label": STATE_LABELS[state],
            "raw_input": body.text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/vitals-to-state")
def vitals_to_state_endpoint(body: ManualVitalsInput):
    """Convert manual vitals input to state."""
    state = vitals_to_state(
        body.hr, body.bp_sys, body.bp_dia,
        body.temp, body.spo2, body.age, body.conditions
    )
    return {"state": state, "state_label": STATE_LABELS[state]}


@app.post("/api/triage-step")
def triage_step(body: TriageStepInput):
    """Run one Triage Agent step and optionally get LLM explanation."""
    if body.state < 0 or body.state > 4:
        raise HTTPException(status_code=400, detail="State must be 0-4")
    try:
        action, next_state, reward, info = triage_agent.step(body.state)
        explanation = ""
        if body.use_llm:
            explanation = generate_triage_explanation(info)
        q_values = triage_agent.get_q_values(body.state)
        return {
            **info,
            "explanation": explanation,
            "q_values": q_values,
            "epsilon": round(triage_agent.epsilon, 3)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/supervisor-step")
def supervisor_step(body: SupervisorStepInput):
    """Run one full Phase 2 step (Supervisor + all Triage Agents)."""
    if len(body.patient_states) != 3:
        raise HTTPException(status_code=400, detail="Must provide exactly 3 patient states")
    try:
        # Snapshot patient states BEFORE actions run
        states_before = list(body.patient_states)

        sup_result = supervisor_agent.step(body.patient_states)

        triage_results = []
        for i, ta in enumerate(triage_agents_p2):
            forced = None
            if sup_result["override_target"] == i:
                forced = sup_result["override_action"]
            _, _, _, info = ta.step(states_before[i], forced_action=forced)
            info["state_before_step"] = states_before[i]
            triage_results.append(info)

        # Re-derive next_ward_state from ACTUAL patient states after actions
        from utils.state_mapper import patients_to_ward_state
        from agents.supervisor_agent import compute_ward_reward
        actual_next_states = [t["next_state"] for t in triage_results]
        actual_next_ward   = int(patients_to_ward_state(actual_next_states))
        actual_reward      = compute_ward_reward(sup_result["ward_state"], sup_result["action"], actual_next_ward)
        sup_result["next_ward_state"]       = actual_next_ward
        sup_result["next_ward_state_label"] = ["Calm","Active","Busy","Overloaded","Crisis"][actual_next_ward]
        sup_result["reward"]                = actual_reward
        sup_result["ward_state_input"]      = states_before

        ward_report = ""
        if body.use_llm:
            ward_report = generate_ward_report(sup_result, triage_results)

        return {
            "supervisor": sup_result,
            "triage_agents": triage_results,
            "ward_report": ward_report,
            "q_table": supervisor_agent.get_q_table()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/q-values/{state}")
def get_q_values(state: int):
    """Get Q-values for a specific state (for visualization)."""
    if state < 0 or state > 4:
        raise HTTPException(status_code=400, detail="State must be 0-4")
    return {
        "state": state,
        "state_label": STATE_LABELS[state],
        "q_values": triage_agent.get_q_values(state)
    }


@app.get("/api/q-table")
def get_q_table():
    """Get full Supervisor Q-table."""
    return supervisor_agent.get_q_table()


@app.get("/api/metrics")
def get_metrics():
    """Get performance metrics for both agents."""
    return {
        "triage": {
            "total_reward": round(triage_agent.total_reward, 2),
            "epsilon": round(triage_agent.epsilon, 3),
            "steps": triage_agent.steps,
            "episode_rewards": triage_agent.episode_rewards[-50:]
        },
        "supervisor": {
            "total_reward": round(supervisor_agent.total_reward, 2),
            "epsilon": round(supervisor_agent.q_table.epsilon, 3),
            "override_count": supervisor_agent.override_count,
            "episode_rewards": supervisor_agent.episode_rewards[-50:]
        }
    }

class ExplainRequest(BaseModel):
    patient_id: int = 1
    state: int
    state_label: str
    action: int
    action_label: str
    next_state: int
    next_state_label: str
    overridden: bool = False

@app.post("/api/explain-step")
async def explain_step(body: ExplainRequest):
    from agents.llm_layer import generate_triage_explanation
    explanation = generate_triage_explanation({
        "patient_id":       body.patient_id,
        "state":            body.state,
        "state_label":      body.state_label,
        "action":           body.action,
        "action_label":     body.action_label,
        "next_state":       body.next_state,
        "next_state_label": body.next_state_label,
        "overridden":       body.overridden,
    })
    return {"explanation": explanation}
