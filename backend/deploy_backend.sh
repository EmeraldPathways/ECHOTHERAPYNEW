#!/bin/bash

# Load environment variables
source ./set_env.sh

echo "Deploying backend service: $BACKEND_SERVICE to region: $REGION"

gcloud run deploy $BACKEND_SERVICE \
  --source ./backend \
  --region $REGION \
  --allow-unauthenticated \
  --project $PROJECT_ID

echo "Backend deployment finished."
echo "Please copy the service URL above for the next step."