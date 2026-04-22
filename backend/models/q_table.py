"""
q_table.py
----------
Tabular Q-Learning for the Supervisor Agent.

Q-table shape: (5 ward states) x (4 actions)
Update rule: Q(w,b) += alpha * [R + gamma * max Q(w',b') - Q(w,b)]

Key fix: epsilon decay slowed down so agent explores
properly before converging.
"""

import numpy as np

# Legal actions per ward state
WARD_ACTION_MASK = {
    0: [True,  False, False, False],   # W0 Calm:       Standby only
    1: [True,  True,  False, False],   # W1 Active:     Standby, Reallocate
    2: [True,  True,  True,  True ],   # W2 Busy:       All actions
    3: [False, True,  True,  True ],   # W3 Overloaded: Reallocate, Override, Backup
    4: [False, False, True,  True ],   # W4 Crisis:     Override, Backup
}


class QTable:
    """
    Tabular Q-Learning Supervisor Agent.

    Key parameters vs original:
    - alpha raised 0.1 -> 0.2  (learn faster)
    - epsilon_decay slowed 0.995 -> 0.998 (explore longer)
    - epsilon_min kept at 0.05
    """

    def __init__(self, n_states: int = 5, n_actions: int = 4,
                 alpha: float = 0.2, gamma: float = 0.95,
                 epsilon: float = 1.0, epsilon_min: float = 0.05,
                 epsilon_decay: float = 0.998):

        self.n_states     = n_states
        self.n_actions    = n_actions
        self.alpha        = alpha
        self.gamma        = gamma
        self.epsilon      = epsilon
        self.epsilon_min  = epsilon_min
        self.epsilon_decay = epsilon_decay

        # Small optimistic initialization encourages exploration
        self.table = np.ones((n_states, n_actions)) * 5.0

        # Mask illegal actions to 0 at init
        for s in range(n_states):
            for a in range(n_actions):
                if not WARD_ACTION_MASK[s][a]:
                    self.table[s, a] = float('-inf')

    def get_legal_actions(self, state: int) -> list:
        return [a for a, legal in enumerate(WARD_ACTION_MASK[state]) if legal]

    def select_action(self, state: int) -> int:
        """Epsilon-greedy with action masking."""
        legal = self.get_legal_actions(state)
        if np.random.random() < self.epsilon:
            return np.random.choice(legal)
        masked_q = self.table[state].copy()
        for a in range(self.n_actions):
            if a not in legal:
                masked_q[a] = float('-inf')
        return int(np.argmax(masked_q))

    def update(self, state: int, action: int,
               reward: float, next_state: int, done: bool):
        """Standard Q-Learning update."""
        legal_next  = self.get_legal_actions(next_state)
        next_vals   = [self.table[next_state, a] for a in legal_next]
        best_next   = 0.0 if done else max(next_vals)
        target      = reward + self.gamma * best_next
        self.table[state, action] += self.alpha * (target - self.table[state, action])

        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay

    def save(self, path: str):
        np.save(path, self.table)

    def load(self, path: str):
        self.table = np.load(path)

    def display(self):
        """Print Q-table for debugging."""
        from utils.state_mapper import WARD_LABELS, WARD_ACTION_LABELS
        print(f"\n{'Ward State':<15}", end="")
        for a in range(self.n_actions):
            print(f"{WARD_ACTION_LABELS[a]:<20}", end="")
        print()
        print("-" * 95)
        for s in range(self.n_states):
            print(f"{WARD_LABELS[s]:<15}", end="")
            for a in range(self.n_actions):
                val = self.table[s, a]
                print(f"{'---' if val == float('-inf') else f'{val:.2f}':<20}", end="")
            print()
