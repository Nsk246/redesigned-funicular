"""
train_triage.py
---------------
Train the Triage Agent (Phase 1) over N episodes.
Saves trained model weights to backend/models/saved/triage_agent.pth
Prints reward curve every 100 episodes.
"""

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from agents.triage_agent import TriageAgent, sample_next_state, compute_reward
from utils.state_mapper import STATE_LABELS

EPISODES   = 2000
MAX_STEPS  = 20
SAVE_PATH  = os.path.join(os.path.dirname(__file__), "../models/saved/triage_agent.pth")

os.makedirs(os.path.dirname(SAVE_PATH), exist_ok=True)

agent = TriageAgent(patient_id="TRAIN")
all_rewards = []

for ep in range(EPISODES):
    state = np.random.randint(0, 5)
    ep_reward = 0.0

    for step in range(MAX_STEPS):
        action, next_state, reward, _ = agent.step(state)
        ep_reward += reward
        state = next_state
        if state == 4 and step > 15:
            break

    all_rewards.append(ep_reward)
    agent.episode_rewards.append(ep_reward)

    if (ep + 1) % 100 == 0:
        avg = np.mean(all_rewards[-100:])
        print(f"Episode {ep+1:4d} | Avg Reward (last 100): {avg:7.2f} | Epsilon: {agent.epsilon:.3f}")

agent.save(SAVE_PATH)
print(f"\n✅ Triage Agent trained and saved to {SAVE_PATH}")
