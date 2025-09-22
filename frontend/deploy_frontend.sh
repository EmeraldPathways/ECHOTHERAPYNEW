#!/bin/bash

# Load environment variables
source ./set_env.sh

# Check if BACKEND_URL is set
if [ -z "$BACKEND_URL" ]; then
  echo "Error: BACKEND_URL environment variable is not set."
  echo "Please set it to your deployed backend's URL."
  echo "Example: export BACKEND_URL=https://your-backend-service-url.a.run.app"
  exit 1
fi

echo "Deploying frontend service: $FRONTEND_SERVICE to region: $REGION"
echo "Using backend URL: $BACKEND_URL"

gcloud run deploy $FRONTEND_SERVICE \
  --source ./frontend \
  --region $REGION \
  --allow-unauthenticated \
  --build-env-vars "NEXT_PUBLIC_API_URL=$BACKEND_URL" \
  --project $PROJECT_ID

echo "Frontend deployment finished."