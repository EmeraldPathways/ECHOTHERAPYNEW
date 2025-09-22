#!/bin/bash

# Load environment variables
source ./set_env.sh

echo "Deploying backend service: $BACKEND_SERVICE to region: $REGION"

gcloud run deploy $BACKEND_SERVICE \
  --source ./backend \
  --region $REGION \
  --allow-unauthenticated \
  --set-secrets="SUPABASE_URL=supabase-url:latest,SUPABASE_KEY=supabase-key:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest,OPENAI_API_KEY=openai-api-key:latest" \
  --project $PROJECT_ID

echo "Backend deployment finished."
echo "Please copy the service URL above for the next step."
