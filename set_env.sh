#!/bin/bash

# --- CONFIGURATION ---
# Replace "your-gcp-project-id" with your actual Google Cloud Project ID.
export PROJECT_ID="./backend/deploy_backend.sh"

# You can change the region if you want, but us-central1 is a good default.
export REGION="us-central1"

# These are the names your services will have in Cloud Run.
export BACKEND_SERVICE="echo-backend"
export FRONTEND_SERVICE="echo-frontend"

echo "Project variables set."