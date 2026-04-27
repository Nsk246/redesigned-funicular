"""
triage_agent.py
---------------
Triage RL Agent — Phase 1 core.

Wraps the MDP environment (transition probabilities, reward function)
and the DQN model. Handles training, inference, and state transitions.

MDP Definition:
    States  : S0 Healthy -> S4 Emergency
    Actions : A0 Monitor, A1 Treat, A2 Escalate, A3 Emergency Response
    P(s'|s,a): Defined in TRANSITION_PROBS
    R(s,a,s'): Computed by compute_reward()
"""

import torch
import torch.optim as optim
import torch.nn.functional as F
import numpy as np
import random
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.dqn_model import DQN, ReplayBuffer, ACTION_MASK, apply_action_mask
from utils.state_mapper import STATE_LABELS, ACTION_LABELS


# ─────────────────────────────────────────────
# TRANSITION PROBABILITIES  P(s' | s, a)
# Each row: [->S0, ->S1, ->S2, ->S3, ->S4]
# ─────────────────────────────────────────────
TRANSITION_PROBS = {
    # S0 Healthy
    (0, 0): [0.85, 0.12, 0.03, 0.00, 0.00],  # Monitor

    # S1 At Risk
    (1, 0): [0.20, 0.50, 0.25, 0.05, 0.00],  # Monitor
    (1, 1): [0.50, 0.35, 0.12, 0.03, 0.00],  # Treat
    (1, 2): [0.60, 0.30, 0.08, 0.02, 0.00],  # Escalate

    # S2 Unstable
    (2, 0): [0.05, 0.15, 0.40, 0.30, 0.10],  # Monitor
    (2, 1): [0.15, 0.35, 0.35, 0.12, 0.03],  # Treat
    (2, 2): [0.25, 0.40, 0.25, 0.08, 0.02],  # Escalate
    (2, 3): [0.20, 0.30, 0.30, 0.15, 0.05],  # Emergency (over-escalation)

    # S3 Critical
    (3, 2): [0.15, 0.30, 0.30, 0.20, 0.05],  # Escalate
    (3, 3): [0.25, 0.35, 0.25, 0.12, 0.03],  # Emergency

    # S4 Emergency
    (4, 2): [0.00, 0.00, 0.25, 0.45, 0.30],  # Escalate
    (4, 3): [0.00, 0.00, 0.45, 0.35, 0.20],  # Emergency
}


def sample_next_state(state: int, action: int) -> int:
    """Sample next state from transition probabilities."""
    probs = TRANSITION_PROBS.get((state, action))
    if probs is None:
        raise ValueError(f"Illegal action A{action} in state S{state}")
    return int(np.random.choice(5, p=probs))


def compute_reward(state: int, action: int, next_state: int) -> float:
    """R(s, a, s') reward function."""
    delta  = state - next_state
    reward = delta * 10.0

    # Stuck in emergency
    if False:  # removed: state == 4 early exit
        reward -= 30.0

    # Under-action on critical/emergency
    if state >= 3 and action <= 1:
        reward -= 20.0

    # Over-escalation on healthy/at-risk
    if state <= 1 and action == 3:
        reward -= 15.0

    # Save bonus: pulled back from emergency
    if state == 4 and action == 3 and next_state <= 2:
        reward += 25.0

    return reward


class TriageAgent:
    """DQN-based Triage Agent."""

    def __init__(self, patient_id: str = "P1",
                 lr: float = 1e-3, gamma: float = 0.95,
                 epsilon: float = 1.0, epsilon_min: float = 0.05,
                 epsilon_decay: float = 0.995,
                 batch_size: int = 32, target_update: int = 50):

        self.patient_id    = patient_id
        self.gamma         = gamma
        self.epsilon       = epsilon
        self.epsilon_min   = epsilon_min
        self.epsilon_decay = epsilon_decay
        self.batch_size    = batch_size
        self.target_update = target_update
        self.steps         = 0

        self.policy_net = DQN(n_states=5, n_actions=4)
        self.target_net = DQN(n_states=5, n_actions=4)
        self.target_net.load_state_dict(self.policy_net.state_dict())
        self.target_net.eval()

        self.optimizer = optim.Adam(self.policy_net.parameters(), lr=lr)
        self.memory    = ReplayBuffer(capacity=10000, state_dim=5)

        self.total_reward    = 0.0
        self.episode_rewards = []
        self.current_state   = 0
        self.last_action     = None
        self.last_transition = None

    def state_to_tensor(self, state: int) -> torch.Tensor:
        t = torch.zeros(5)
        t[state] = 1.0
        return t

    def select_action(self, state: int) -> int:
        """Epsilon-greedy with action masking."""
        legal = [a for a, ok in enumerate(ACTION_MASK[state]) if ok]
        if random.random() < self.epsilon:
            return random.choice(legal)
        with torch.no_grad():
            q_vals = self.policy_net(self.state_to_tensor(state))
            masked = apply_action_mask(q_vals, state)
            return int(masked.argmax().item())

    def step(self, state: int, forced_action: int = None):
        """Execute one environment step."""
        action     = forced_action if forced_action is not None else self.select_action(state)
        next_state = sample_next_state(state, action)
        reward     = compute_reward(state, action, next_state)

        if forced_action is None:
            self.memory.push(
                self.state_to_tensor(state).numpy(),
                action, reward,
                self.state_to_tensor(next_state).numpy(),
                False
            )
            self._learn()
            self._decay_epsilon()

        self.total_reward    += reward
        self.last_action      = action
        self.last_transition  = (state, action, next_state, reward)
        self.current_state    = next_state

        return action, next_state, reward, {
            "patient_id":       self.patient_id,
            "state":            state,
            "state_label":      STATE_LABELS[state],
            "action":           action,
            "action_label":     ACTION_LABELS[action],
            "next_state":       next_state,
            "next_state_label": STATE_LABELS[next_state],
            "reward":           reward,
            "overridden":       forced_action is not None
        }

    def _learn(self):
        if len(self.memory) < self.batch_size:
            return
        states, actions, rewards, next_states, dones = self.memory.sample(self.batch_size)

        current_q = self.policy_net(states).gather(1, actions.unsqueeze(1)).squeeze(1)
        with torch.no_grad():
            next_q   = self.target_net(next_states).max(1)[0]
            target_q = rewards + self.gamma * next_q * (1 - dones)

        loss = F.mse_loss(current_q, target_q)
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()

        self.steps += 1
        if self.steps % self.target_update == 0:
            self.target_net.load_state_dict(self.policy_net.state_dict())

    def _decay_epsilon(self):
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay

    def get_q_values(self, state: int) -> dict:
        """
        Return Q-values for all actions in a state.
        Illegal actions return None instead of -inf (JSON safe).
        """
        with torch.no_grad():
            q_vals = self.policy_net(self.state_to_tensor(state))
            masked = apply_action_mask(q_vals, state)

        result = {}
        for a in range(4):
            val = float(masked[a])
            # Replace -inf (illegal actions) with None for JSON safety
            result[ACTION_LABELS[a]] = None if val == float('-inf') else round(val, 3)
        return result

    def save(self, path: str):
        torch.save(self.policy_net.state_dict(), path)

    def load(self, path: str):
        self.policy_net.load_state_dict(torch.load(path, weights_only=True))
        self.target_net.load_state_dict(self.policy_net.state_dict())
        self.epsilon = self.epsilon_min
