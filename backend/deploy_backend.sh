#!/bin/bash

# Load the environment variables from set_env.sh
source ./set_env.sh

echo "----------------------------------------------------"
echo "Deploying backend service: $BACKEND_SERVICE"
echo "To project: $PROJECT_ID in region: $REGION"
echo "----------------------------------------------------"

# The gcloud command to deploy the service
# Make sure the name on the LEFT of the = for OPENAI_API_KEY matches your python code
gcloud run deploy $BACKEND_SERVICE \
  --source ./backend \
  --region $REGION \
  --allow-unauthenticated \
  --set-secrets="SUPABASE_URL=supabase-url:latest,SUPABASE_KEY=supabase-key:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest,OPENAI_API_KEY=openai-api-key:latest" \
  --project $PROJECT_ID

# Check if the deployment was successful
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Backend deployment finished successfully."
  echo "➡️ Next step: Copy the 'Service URL' from the output above."
else
  echo ""
  echo "❌ Backend deployment failed." >&2
fi
