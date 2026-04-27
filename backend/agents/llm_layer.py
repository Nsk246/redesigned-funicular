import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL  = "claude-haiku-4-5-20251001"

STATE_NAMES  = ['Healthy','At Risk','Unstable','Critical','Emergency']
ACTION_NAMES = ['Monitor','Treat','Escalate','Emergency Response']
WARD_NAMES   = ['Calm','Active','Busy','Overloaded','Crisis']


def parse_patient_input(natural_language: str) -> dict:
    prompt = f"""You are a clinical data extraction assistant for a hospital triage system.

Extract patient vitals from the text. Return ONLY a valid JSON object — no explanation, no markdown, no backticks.

SEVERITY INFERENCE — if no numbers given, use these vitals:
- "coding" / "arresting" / "unresponsive"        → hr:160, bp_sys:200, bp_dia:120, temp:40.2, spo2:82, age:65, conditions:3
- "emergency" / "life threatening" / "crashing"  → hr:150, bp_sys:192, bp_dia:118, temp:40.0, spo2:85, age:60, conditions:2
- "critical" / "very sick" / "severe"            → hr:128, bp_sys:170, bp_dia:100, temp:39.3, spo2:92, age:58, conditions:2
- "serious" / "unstable" / "deteriorating"       → hr:118, bp_sys:158, bp_dia:95,  temp:38.8, spo2:93, age:55, conditions:1
- "at risk" / "concerning" / "unwell"            → hr:102, bp_sys:142, bp_dia:88,  temp:37.8, spo2:95, age:50, conditions:0
- "stable" / "fine" / "normal" / "healthy"       → hr:75,  bp_sys:120, bp_dia:80,  temp:37.0, spo2:98, age:50, conditions:0

DEFAULT (no severity mentioned at all): hr:75, bp_sys:120, bp_dia:80, temp:37.0, spo2:98, age:50, conditions:0

If the text contains actual numbers, extract them directly and ignore the severity inference above.

Text: "{natural_language}"

Return exactly this JSON with no other text:
{{"hr": 0, "bp_sys": 0, "bp_dia": 0, "temp": 0.0, "spo2": 0, "age": 0, "conditions": 0}}"""

    message = client.messages.create(
        model=MODEL,
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


def generate_triage_explanation(transition: dict) -> str:
    s  = int(transition['state'])
    ns = int(transition['next_state'])

    if ns < s:
        outcome_fact = f"the patient IMPROVED from {STATE_NAMES[s]} to {STATE_NAMES[ns]}"
    elif ns > s:
        outcome_fact = f"the patient WORSENED from {STATE_NAMES[s]} to {STATE_NAMES[ns]}"
    else:
        outcome_fact = f"the patient's condition was UNCHANGED, remaining {STATE_NAMES[s]}"

    override_line = ""
    if transition.get('overridden', False):
        override_line = "The Supervisor overrode this decision and forced a stronger intervention than the Triage Agent originally selected."

    prompt = f"""Write exactly 2 clinical sentences about this triage event. Do not add any other text.

INPUT FACTS (do not contradict these):
- Starting condition: {STATE_NAMES[s]} (severity {s}/4)
- Action taken: {transition['action_label']}
- Result: {outcome_fact}
{override_line}

Sentence 1: Why {transition['action_label']} was the right action for a {STATE_NAMES[s]} patient.
Sentence 2: State clearly that {outcome_fact}. If unchanged or worsened, explain this can happen despite correct treatment.

Do NOT mention: rewards, Q-values, AI, machine learning, algorithms, or scores."""

    message = client.messages.create(
        model=MODEL,
        max_tokens=160,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text.strip()


def generate_ward_report(supervisor_result: dict, triage_results: list) -> str:
    ward_before = supervisor_result['ward_state_label']
    ward_after  = supervisor_result['next_ward_state_label']
    ws  = supervisor_result['ward_state']
    wns = supervisor_result['next_ward_state']

    if wns < ws:
        ward_outcome = f"IMPROVED from {ward_before} to {ward_after}"
    elif wns > ws:
        ward_outcome = f"WORSENED from {ward_before} to {ward_after}"
    else:
        ward_outcome = f"REMAINED at {ward_before}"

    patient_lines = []
    for t in triage_results:
        s  = int(t['state'])
        ns = int(t['next_state'])
        if ns < s:
            delta = "improved"
        elif ns > s:
            delta = "worsened"
        else:
            delta = "unchanged"
        override = " [OVERRIDDEN by Supervisor]" if t.get('overridden') else ""
        patient_lines.append(
            f"- Patient {t['patient_id']}: {STATE_NAMES[s]} → {STATE_NAMES[ns]} ({delta}) via {t['action_label']}{override}"
        )

    override_note = ""
    if supervisor_result['override_target'] is not None:
        override_note = f"Supervisor overrode Patient {supervisor_result['override_target']+1}'s action."

    prompt = f"""Write exactly 3 clinical sentences as a ward status report. No other text.

WARD FACTS (do not contradict):
- Ward status: {ward_outcome}
- Supervisor action taken: {supervisor_result['action_label']}
- {override_note if override_note else 'No overrides issued.'}

Patient outcomes:
{chr(10).join(patient_lines)}

Sentence 1: Ward-level summary — what the supervisor decided and why given the ward status.
Sentence 2: Patient-by-patient outcomes — who improved, who worsened, who was unchanged.
Sentence 3: Recommended immediate next steps for the attending physician.

Do NOT mention: rewards, Q-values, AI, machine learning, algorithms, or scores."""

    message = client.messages.create(
        model=MODEL,
        max_tokens=220,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text.strip()
