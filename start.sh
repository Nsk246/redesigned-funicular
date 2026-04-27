#!/bin/bash
echo "Updating API URLs..."
NEW_URL="https://$CODESPACE_NAME-8000.app.github.dev"
find frontend/src/pages -name "*.jsx" -exec sed -i "s|https://.*-8000\.app\.github\.dev|$NEW_URL|g" {} \;
echo "Backend URL set to: $NEW_URL"
echo ""
echo "Now run in two terminals:"
echo ""
echo "Terminal 1 (backend):"
echo "  source venv/bin/activate && cd backend/api && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "Terminal 2 (frontend):"
echo "  cd frontend && npm run dev -- --host 0.0.0.0 --port 5173"
