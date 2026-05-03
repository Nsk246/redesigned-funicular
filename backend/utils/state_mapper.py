"""
state_mapper.py
---------------
Maps raw patient vitals to a discrete triage state (S0-S4).
Also maps a list of patient states to a ward state (W0-W4)
for the Supervisor Agent.

Triage States:
    S0 - Healthy   : All vitals normal
    S1 - At Risk   : 1 vital mildly off
    S2 - Unstable  : Multiple vitals off
    S3 - Critical  : Dangerous readings
    S4 - Emergency : Life-threatening

Ward States:
    W0 - Calm       : No patients above S1
    W1 - Active     : 1-2 patients at S2
    W2 - Busy       : 3+ at S2, or 1 at S3
    W3 - Overloaded : 2+ at S3, or 1 at S4
    W4 - Crisis     : 2+ at S4, or agents conflicting
"""

def vitals_to_state(hr: float, bp_sys: float, bp_dia: float,
                    temp: float, spo2: float, age: int,
                    conditions: int) -> int:
    # Clamp vitals to clinically valid ranges
    hr       = max(20,  min(250, hr))
    bp_sys   = max(50,  min(250, bp_sys))
    bp_dia   = max(20,  min(160, bp_dia))
    temp     = max(30.0,min(43.0, temp))
    spo2     = max(50,  min(100, spo2))
    """
    Maps patient vitals to a discrete state ID (0-4).

    Args:
        hr        : Heart rate (bpm)
        bp_sys    : Systolic blood pressure (mmHg)
        bp_dia    : Diastolic blood pressure (mmHg)
        temp      : Temperature (Celsius)
        spo2      : Oxygen saturation (%)
        age       : Patient age (years)
        conditions: Number of pre-existing conditions

    Returns:
        int: State ID 0-4
    """
    severity_score = 0

    # Heart rate scoring
    if hr > 140 or hr < 40:
        severity_score += 3
    elif hr > 120 or hr < 50:
        severity_score += 2
    elif hr > 100 or hr < 60:
        severity_score += 1

    # Blood pressure scoring
    if bp_sys > 180 or bp_sys < 80:
        severity_score += 3
    elif bp_sys > 160 or bp_sys < 90:
        severity_score += 2
    elif bp_sys > 140 or bp_sys < 100:
        severity_score += 1

    # Temperature scoring
    if temp > 40.0 or temp < 35.0:
        severity_score += 3
    elif temp > 39.0 or temp < 36.0:
        severity_score += 2
    elif temp > 38.0:
        severity_score += 1

    # SpO2 scoring
    if spo2 < 88:
        severity_score += 3
    elif spo2 < 92:
        severity_score += 2
    elif spo2 < 95:
        severity_score += 1

    # Risk profile modifier
    risk_modifier = 0
    if age > 70:
        risk_modifier += 1
    if conditions >= 2:
        risk_modifier += 1

    total = severity_score + risk_modifier

    # Map total score to state
    if total == 0:
        return 0   # S0 Healthy
    elif total <= 2:
        return 1   # S1 At Risk
    elif total <= 5:
        return 2   # S2 Unstable
    elif total <= 8:
        return 3   # S3 Critical
    else:
        return 4   # S4 Emergency


def patients_to_ward_state(patient_states: list) -> int:
    """
    Derives ward state from a list of individual patient states.

    Args:
        patient_states: List of state IDs (0-4) for all patients

    Returns:
        int: Ward state ID 0-4
    """
    count_s4 = patient_states.count(4)
    count_s3 = patient_states.count(3)
    count_s2 = patient_states.count(2)

    if count_s4 >= 2:
        return 4   # W4 Crisis
    elif count_s4 == 1 or count_s3 >= 2:
        return 3   # W3 Overloaded
    elif count_s3 == 1 or count_s2 >= 3:
        return 2   # W2 Busy
    elif count_s2 >= 1:
        return 1   # W1 Active
    else:
        return 0   # W0 Calm


# Human-readable labels
STATE_LABELS = {
    0: "Healthy",
    1: "At Risk",
    2: "Unstable",
    3: "Critical",
    4: "Emergency"
}

WARD_LABELS = {
    0: "Calm",
    1: "Active",
    2: "Busy",
    3: "Overloaded",
    4: "Crisis"
}

ACTION_LABELS = {
    0: "Monitor",
    1: "Treat",
    2: "Escalate",
    3: "Emergency Response"
}

WARD_ACTION_LABELS = {
    0: "Standby",
    1: "Reallocate Staff",
    2: "Override Triage",
    3: "Request Backup"
}
