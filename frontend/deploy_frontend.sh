#!/bin/bash

# Load the main environment variables
source ./set_env.sh

# Source the frontend secrets from a local, untracked file
if [ -f ./frontend_secrets.sh ]; then
  source ./frontend_secrets.sh
else
  echo "❌ Error: The frontend_secrets.sh file was not found."
  echo "Please create it in the root directory and add your NEXT_PUBLIC variables before running."
  exit 1
fi

# Check that the backend URL has been set
if [ -z "$BACKEND_URL" ]; then
  echo "❌ Error: The BACKEND_URL environment variable is not set."
  echo "Please set it before running this script."
  echo "Example: export BACKEND_URL=https://your-backend-service-url.a.run.app"
  exit 1
fi

echo "----------------------------------------------------"
echo "Deploying frontend service: $FRONTEND_SERVICE"
echo "Using backend URL: $BACKEND_URL"
echo "----------------------------------------------------"

# Deploy the frontend and pass all public variables to the build process
gcloud run deploy $FRONTEND_SERVICE \
  --source ./frontend \
  --region $REGION \
  --allow-unauthenticated \
  --set-build-env-vars "NEXT_PUBLIC_API_URL=$BACKEND_URL,NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_OPENAI_API_KEY=$NEXT_PUBLIC_OPENAI_API_KEY,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" \
  --project $PROJECT_ID

# Check if the deployment was successful
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Frontend deployment finished successfully."
else
  echo ""
  echo "❌ Frontend deployment failed." >&2
fi
