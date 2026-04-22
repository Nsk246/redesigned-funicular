"""
train_supervisor.py
-------------------
Train the Supervisor Agent (Phase 2) with 3 simulated Triage Agents.

Key fixes vs original:
- Supervisor reward now includes aggregate patient outcomes
  so it has a meaningful signal tied to its decisions
- More episodes (3000) to compensate for slower epsilon decay
- Q-table displayed at end to verify learning
"""

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from agents.triage_agent import TriageAgent
from agents.supervisor_agent import SupervisorAgent

EPISODES  = 3000
MAX_STEPS = 20
SAVE_PATH = os.path.join(os.path.dirname(__file__), "../models/saved/supervisor_qtable.npy")

os.makedirs(os.path.dirname(SAVE_PATH), exist_ok=True)

triage_agents = [TriageAgent(patient_id=f"P{i+1}") for i in range(3)]
supervisor    = SupervisorAgent()
all_rewards   = []

# Load pre-trained triage agents
triage_path = os.path.join(os.path.dirname(__file__), "../models/saved/triage_agent.pth")
for ta in triage_agents:
    if os.path.exists(triage_path):
        ta.load(triage_path)

for ep in range(EPISODES):
    states    = [np.random.randint(0, 5) for _ in range(3)]
    ep_reward = 0.0

    for step in range(MAX_STEPS):
        # Supervisor observes ward and decides
        sup_result = supervisor.step(states)

        # Each triage agent steps — collect patient outcomes
        new_states      = []
        patient_reward  = 0.0
        for i, ta in enumerate(triage_agents):
            forced = None
            if sup_result["override_target"] == i:
                forced = sup_result["override_action"]
            _, next_state, p_reward, _ = ta.step(states[i], forced_action=forced)
            new_states.append(next_state)
            patient_reward += p_reward

        # Supervisor reward = its own ward reward + share of patient outcomes
        # This gives it a meaningful learning signal
        combined_reward = sup_result["reward"] + (patient_reward * 0.3)
        ep_reward += combined_reward
        states = new_states

    all_rewards.append(ep_reward)
    if (ep + 1) % 100 == 0:
        avg = np.mean(all_rewards[-100:])
        print(f"Episode {ep+1:4d} | Avg Reward (last 100): {avg:8.2f} | Epsilon: {supervisor.q_table.epsilon:.3f}")

supervisor.save(SAVE_PATH)
print(f"\nSupervisor Agent trained and saved to {SAVE_PATH}")
print("\nFinal Q-Table:")
supervisor.q_table.display()
