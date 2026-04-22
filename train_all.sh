#!/bin/bash
source venv/bin/activate
echo "Training Triage Agent (Phase 1)..."
python backend/training/train_triage.py
echo "Training Supervisor Agent (Phase 2)..."
python backend/training/train_supervisor.py
echo "All agents trained!"
