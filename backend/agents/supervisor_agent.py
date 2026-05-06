"""
supervisor_agent.py — fixed NaN override target bug
"""

import numpy as np
from collections import deque
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.q_table import QTable, WARD_ACTION_MASK
from utils.state_mapper import patients_to_ward_state, WARD_LABELS, WARD_ACTION_LABELS


WARD_TRANSITION_PROBS = {
    (0, 0): [0.80, 0.15, 0.04, 0.01, 0.00],
    (1, 0): [0.30, 0.45, 0.20, 0.05, 0.00],
    (1, 1): [0.45, 0.40, 0.12, 0.03, 0.00],
    (2, 0): [0.05, 0.20, 0.40, 0.25, 0.10],
    (2, 1): [0.15, 0.35, 0.35, 0.12, 0.03],
    (2, 2): [0.20, 0.40, 0.28, 0.10, 0.02],
    (2, 3): [0.25, 0.40, 0.25, 0.08, 0.02],
    (3, 1): [0.00, 0.15, 0.30, 0.35, 0.20],
    (3, 2): [0.00, 0.20, 0.35, 0.30, 0.15],
    (3, 3): [0.00, 0.35, 0.35, 0.20, 0.10],
    (4, 2): [0.00, 0.00, 0.20, 0.45, 0.35],
    (4, 3): [0.00, 0.00, 0.40, 0.40, 0.20],
}


def sample_next_ward_state(ward_state: int, action: int) -> int:
    probs = WARD_TRANSITION_PROBS.get((ward_state, action))
    if probs is None:
        raise ValueError(f"Illegal action B{action} in ward state W{ward_state}")
    return int(np.random.choice(5, p=probs))


def compute_ward_reward(ward_state: int, action: int, next_ward_state: int) -> float:
    delta  = ward_state - next_ward_state
    reward = delta * 10.0
    if ward_state == 4 and next_ward_state == 4:
        reward -= 30.0
    if ward_state >= 3 and action == 1:
        reward -= 25.0
    if ward_state <= 1 and action == 3:
        reward -= 10.0
    if ward_state == 4 and action == 3 and next_ward_state <= 2:
        reward += 25.0
    return float(reward)


def sanitize(val):
    if val is None:
        return None
    v = float(val) if isinstance(val, (np.floating, np.integer)) else val
    if isinstance(v, float) and (v != v or abs(v) == float('inf')):
        return None
    return round(v, 3)


class SupervisorAgent:

    def __init__(self):
        self.q_table = QTable(
            n_states=5, n_actions=4,
            alpha=0.2, gamma=0.95,
            epsilon=1.0, epsilon_min=0.05,
            epsilon_decay=0.998
        )
        self.current_ward_state = 0
        self.total_reward       = 0.0
        self.episode_rewards    = []
        self.override_count     = 0
        self.last_transition    = None

    def observe_ward(self, patient_states: list) -> int:
        return int(patients_to_ward_state(patient_states))

    def step(self, patient_states: list) -> dict:
        # Ensure all patient states are plain Python ints
        clean_states    = [int(s) for s in patient_states]

        ward_state      = self.observe_ward(clean_states)
        action          = int(self.q_table.select_action(ward_state))
        next_ward_state = int(sample_next_ward_state(ward_state, action))
        reward          = compute_ward_reward(ward_state, action, next_ward_state)

        self.q_table.update(ward_state, action, reward, next_ward_state, False)
        self.current_ward_state  = next_ward_state
        self.last_transition     = (ward_state, action, next_ward_state, reward)

        # Override logic — find the most critical patient
        override_target = None
        override_action = None
        if action == 2:  # B2 Override
            self.override_count += 1
            max_state = max(clean_states)          # plain int
            idx       = clean_states.index(max_state)  # guaranteed int
            override_target = int(idx)
            override_action = int(min(max_state + 1, 3))

        return {
            "ward_state":            ward_state,
            "ward_state_label":      WARD_LABELS[ward_state],
            "action":                action,
            "action_label":          WARD_ACTION_LABELS[action],
            "next_ward_state":       next_ward_state,
            "next_ward_state_label": WARD_LABELS[next_ward_state],
            "reward":                reward,
            "override_target":       override_target,   # int or None — never NaN
            "override_action":       override_action,   # int or None
            "patient_states":        clean_states
        }

    def get_q_table(self) -> dict:
        result = {}
        for w in range(5):
            result[WARD_LABELS[w]] = {
                WARD_ACTION_LABELS[a]: sanitize(self.q_table.table[w, a])
                for a in range(4)
            }
        return result

    def save(self, path: str):
        self.q_table.save(path)

    def load(self, path: str):
        self.q_table.load(path)
        self.q_table.epsilon = self.q_table.epsilon_min
