"""
llm_layer.py
------------
LLM Integration Layer using Anthropic Claude API.

Two responsibilities:
    1. INPUT  : Parse User's natural language -> structured patient vitals
    2. OUTPUT : Translate RL decision -> natural language explanation
"""

import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL  = "claude-haiku-4-5-20251001"


def parse_patient_input(natural_language: str) -> dict:
    """Parse natural language patient description into structured vitals."""

    prompt = f"""Extract patient vitals from the text and return ONLY a JSON object.
No explanation, no markdown, no backticks. Just the raw JSON.

Use these defaults for any missing values:
hr=75, bp_sys=120, bp_dia=80, temp=37.0, spo2=98, age=50, conditions=0

Text: "{natural_language}"

Return exactly this structure:
{{"hr": 75, "bp_sys": 120, "bp_dia": 80, "temp": 37.0, "spo2": 98, "age": 50, "conditions": 0}}"""

    message = client.messages.create(
        model=MODEL,
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()

    # Strip any accidental markdown fences
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    return json.loads(raw)


def generate_triage_explanation(transition: dict) -> str:
    """Generate clinical explanation of the Triage Agent's decision."""

    prompt = f"""You are a clinical decision support assistant explaining an AI triage decision to a doctor.
Be concise — 2-3 sentences maximum.

Patient: {transition['patient_id']}
State before: {transition['state_label']} (S{transition['state']})
Action taken: {transition['action_label']}
Outcome: Patient moved to {transition['next_state_label']} (S{transition['next_state']})
Overridden by Supervisor: {transition.get('overridden', False)}

Write a clinical explanation. Do not mention rewards, Q-values, or AI internals."""

    message = client.messages.create(
        model=MODEL,
        max_tokens=150,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text.strip()


def generate_ward_report(supervisor_result: dict, triage_results: list) -> str:
    """Generate ward-level summary report."""

    patient_summary = "\n".join([
        f"- Patient {t['patient_id']}: {t['state_label']} → {t['next_state_label']} (Action: {t['action_label']})"
        for t in triage_results
    ])

    prompt = f"""You are a hospital ward AI providing a brief status report to the attending physician.
Be concise — 3-4 sentences maximum.

Ward: {supervisor_result['ward_state_label']} → {supervisor_result['next_ward_state_label']}
Supervisor action: {supervisor_result['action_label']}
Override issued: {'Yes, Patient ' + str(supervisor_result['override_target'] + 1) if supervisor_result['override_target'] is not None else 'No'}

Patients:
{patient_summary}

Write a clinical ward report. Do not mention rewards, Q-values, or AI internals."""

    message = client.messages.create(
        model=MODEL,
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text.strip()
