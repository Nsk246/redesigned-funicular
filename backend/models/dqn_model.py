"""
dqn_model.py
------------
PyTorch Deep Q-Network for the Triage Agent.

Architecture:
    Input  : One-hot encoded state (5 neurons)
    Hidden : 64 -> 64 neurons with ReLU
    Output : Q-value per action (4 neurons)

Action masking applied before argmax to block illegal actions.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np


class DQN(nn.Module):
    def __init__(self, n_states: int = 5, n_actions: int = 4):
        super(DQN, self).__init__()
        self.fc1 = nn.Linear(n_states, 64)
        self.fc2 = nn.Linear(64, 64)
        self.fc3 = nn.Linear(64, n_actions)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))
        return self.fc3(x)


class ReplayBuffer:
    """
    Experience replay buffer.
    Stores (state, action, reward, next_state, done) tuples.
    Uses pre-allocated numpy arrays to avoid slow tensor conversion.
    """

    def __init__(self, capacity: int = 10000, state_dim: int = 5):
        self.capacity  = capacity
        self.state_dim = state_dim
        self.position  = 0
        self.size      = 0

        # Pre-allocate numpy arrays — fixes the slow tensor warning
        self.states      = np.zeros((capacity, state_dim), dtype=np.float32)
        self.next_states = np.zeros((capacity, state_dim), dtype=np.float32)
        self.actions     = np.zeros(capacity, dtype=np.int64)
        self.rewards     = np.zeros(capacity, dtype=np.float32)
        self.dones       = np.zeros(capacity, dtype=np.float32)

    def push(self, state, action, reward, next_state, done):
        self.states[self.position]      = state
        self.next_states[self.position] = next_state
        self.actions[self.position]     = action
        self.rewards[self.position]     = reward
        self.dones[self.position]       = float(done)
        self.position = (self.position + 1) % self.capacity
        self.size = min(self.size + 1, self.capacity)

    def sample(self, batch_size: int):
        indices = np.random.choice(self.size, batch_size, replace=False)
        return (
            torch.FloatTensor(self.states[indices]),
            torch.LongTensor(self.actions[indices]),
            torch.FloatTensor(self.rewards[indices]),
            torch.FloatTensor(self.next_states[indices]),
            torch.FloatTensor(self.dones[indices])
        )

    def __len__(self):
        return self.size


# Legal actions per state
# True = legal, False = illegal
ACTION_MASK = {
    0: [True,  False, False, False],   # S0: Monitor only
    1: [True,  True,  True,  False],   # S1: Monitor, Treat, Escalate
    2: [True,  True,  True,  True ],   # S2: All actions
    3: [False, False, True,  True ],   # S3: Escalate, Emergency
    4: [False, False, True,  True ],   # S4: Escalate, Emergency
}


def apply_action_mask(q_values: torch.Tensor, state: int) -> torch.Tensor:
    """Masks illegal actions by setting Q-values to -infinity."""
    mask   = torch.tensor(ACTION_MASK[state], dtype=torch.bool)
    masked = q_values.clone()
    masked[~mask] = float('-inf')
    return masked
