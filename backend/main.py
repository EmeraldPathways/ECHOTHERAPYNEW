from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel
from typing import Optional, List, Tuple
import asyncio
import time
import stripe
from fastapi import Request, Header, HTTPException, Depends
from supabase import create_client, Client
import sys 
from contextlib import asynccontextmanager # Import asynccontextmanager
from supabase.lib.client_options import ClientOptions # Import ClientOptions

# Load environment variables first
load_dotenv()

# Then initialize FastAPI and other clients
app = FastAPI()

# --- Environment Variable Validation ---
# This block checks for all required secrets at startup.
# If any are missing, it will print a clear error and exit.
required_env_vars = [
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "STRIPE_SECRET_KEY",
    "OPENAI_API_KEY"
]

missing_vars = [var for var in required_env_vars if os.getenv(var) is None]

if missing_vars:
    print(f"FATAL ERROR: The following environment variables are not set: {', '.join(missing_vars)}")
    print("The application cannot start.")
    sys.exit(1) # Exit with a non-zero status code to indicate failure
# --- End of Validation Block ---

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
global_supabase_url = os.getenv("SUPABASE_URL")
global_supabase_key = os.getenv("SUPABASE_KEY")
global_supabase: Client = create_client(global_supabase_url, global_supabase_key)

# Initialize OpenAI client safely
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "your_openai_api_key_here":
        return None
    try:
        return OpenAI(api_key=api_key)
    except Exception as e:
        print(f"Warning: Could not initialize OpenAI client: {e}")
        return None

client = get_openai_client()

@asynccontextmanager
async def lifespan_events(app: FastAPI):
    # Startup logic
    assistant_id = os.getenv("OPENAI_ASSISTANT_ID")
    if not assistant_id or assistant_id == "your_assistant_id_here_optional":
        print("⚠️  WARNING: OpenAI Assistant ID not configured in environment variables")
        print("Run setup_assistant.py first to create and configure your Assistant")
    else:
        try:
            if client:
                # Try to retrieve the assistant to verify it exists
                assistant = client.beta.assistants.retrieve(assistant_id)
                print(f"✅ Successfully connected to OpenAI Assistant: {assistant.name} ({assistant.id})")
                print(f"Model: {assistant.model}")
        except Exception as e:
            print(f"Failed to connect to OpenAI Assistant: {e}")
    yield
    # Shutdown logic (if any, currently none)

# Create FastAPI instance
app = FastAPI(
    title="AI Companion Backend",
    description="Backend API for AI Companion application",
    version="1.0.0",
    lifespan=lifespan_events # Use the new lifespan context manager
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Pydantic models
class ChatRequest(BaseModel):
    text: str
    thread_id: Optional[str] = None
    conversation_db_id: Optional[str] = None # Changed to str for UUID

class ChatResponse(BaseModel):
    result: str
    openai_thread_id: str
    conversation_db_id: str # Changed to str for UUID
    explanation: Optional[str] = None

class ConversationResponse(BaseModel):
    id: str # Changed to str for UUID
    user_id: str
    openai_thread_id: str
    title: str
    created_at: str
    updated_at: str

class MessageResponse(BaseModel):
    id: str # Changed to str for UUID
    session_id: str # Changed to str for UUID
    user_id: str
    content: str
    role: str
    created_at: str

# Dependency to get a Supabase client with user context
async def get_supabase_client_with_user_context(authorization: Optional[str] = Header(None)) -> Tuple[Client, str]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is missing")

    token_type, token = authorization.split(" ")
    if token_type.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authorization type must be Bearer")

    try:
        print(f"DEBUG: Attempting to validate token with global client: {token[:50]}...")
        user_response_from_global_client = global_supabase.auth.get_user(token)
        
        print(f"DEBUG: User response from global client: {type(user_response_from_global_client)} - {user_response_from_global_client}")

        if not user_response_from_global_client or not user_response_from_global_client.user or not user_response_from_global_client.user.id:
            raise HTTPException(status_code=401, detail="Invalid authentication token or user not found during initial validation.")
        
        user_id = user_response_from_global_client.user.id

        client_options = ClientOptions(headers={"Authorization": f"Bearer {token}"})
        
        supabase_client_with_context = create_client(global_supabase_url, global_supabase_key, options=client_options)
        print(f"DEBUG: Supabase client created with context: {type(supabase_client_with_context)}")
        
        return supabase_client_with_context, user_id
    except Exception as e:
        print(f"Authentication error in get_supabase_client_with_user_context: {type(e)} - {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


# Root endpoint
@app.get("/")
async def root():
    return {"message": "AI Companion Backend is running"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Check if OpenAI API key is configured
@app.get("/config")
async def config_check():
    openai_key = os.getenv("OPENAI_API_KEY")
    return {
        "openai_configured": bool(openai_key and openai_key != "your_openai_api_key_here"),
        "environment": os.getenv("ENVIRONMENT", "development")
    }

# OPTIONS handler for chat endpoint (CORS preflight)
@app.options("/chat")
async def chat_options():
    return {"message": "OK"}

# Chat endpoint using OpenAI Assistants API
@app.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest, dependency_tuple: Tuple[Client, str] = Depends(get_supabase_client_with_user_context)):
    supabase_client, user_id = dependency_tuple
    try:
        # Retrieve ASSISTANT_ID from environment variable
        assistant_id = os.getenv("OPENAI_ASSISTANT_ID")
        if not assistant_id or assistant_id == "your_assistant_id_here_optional":
            raise HTTPException(status_code=500, detail="OpenAI Assistant ID not configured in environment variables")
        
        # Check if OpenAI client is available
        if not client:
            raise HTTPException(status_code=500, detail="OpenAI client not initialized. Please check your API key.")
        
        effective_thread_id = None
        effective_conversation_db_id = request.conversation_db_id

        # --- Supabase Conversation Management ---
        if effective_conversation_db_id is None:
            # Create a new therapy session if it's a new conversation
            default_title = f"New Session - {time.strftime('%Y-%m-%d %H:%M')}"
            
            # Create a new thread with OpenAI first to get its ID
            thread = client.beta.threads.create()
            effective_thread_id = thread.id

            # Insert into therapy_sessions
            therapy_session_data = {
                "user_id": user_id,
                "title": default_title,
                "openai_thread_id": effective_thread_id,
                "status": "active", # Assuming a default status
                "started_at": time.strftime('%Y-%m-%d %H:%M:%S'),
                "created_at": time.strftime('%Y-%m-%d %H:%M:%S'),
                "updated_at": time.strftime('%Y-%m-%d %H:%M:%S')
            }
            response = supabase_client.table("therapy_sessions").insert(therapy_session_data).execute()
            
            if response.data and len(response.data) > 0: # Check response.data for inserted rows
                effective_conversation_db_id = response.data[0]['id']
                print(f"Created new therapy_session with ID: {effective_conversation_db_id}")
            else:
                raise HTTPException(status_code=500, detail="Failed to create new therapy session in Supabase.")
        else:
            # Use the existing conversation_db_id
            effective_thread_id = request.thread_id # Rely on frontend to send existing thread_id for existing sessions
            # Optionally, update the 'updated_at' for the session if it's active
            supabase_client.table("therapy_sessions").update({"updated_at": time.strftime('%Y-%m-%d %H:%M:%S')}).eq("id", effective_conversation_db_id).execute()


        # Add the user's message to the OpenAI thread
        client.beta.threads.messages.create(
            thread_id=effective_thread_id,
            role="user",
            content=request.text
        )

        # Save user message to chat_messages
        user_chat_message = {
            "session_id": effective_conversation_db_id,
            "user_id": user_id,
            "content": request.text,
            "role": "user",
            "created_at": time.strftime('%Y-%m-%d %H:%M:%S')
        }
        print(f"DEBUG: Inserting user chat_message: session_id={effective_conversation_db_id}, user_id={user_id}") # Debug print for user message
        supabase_client.table("chat_messages").insert(user_chat_message).execute()
        
        # Run the assistant on the thread
        run = client.beta.threads.runs.create(
            thread_id=effective_thread_id,
            assistant_id=assistant_id
        )
        
        # Wait for the run to complete without blocking
        while run.status in ["queued", "in_progress", "cancelling"]:
            await asyncio.sleep(0.5)
            run = client.beta.threads.runs.retrieve(
                thread_id=effective_thread_id,
                run_id=run.id
            )
        
        response_text = "I'm sorry, I couldn't generate a response. Please try again." # Default error message
        if run.status == "completed":
            messages = client.beta.threads.messages.list(
                thread_id=effective_thread_id,
                order="desc", # Get latest message first
                limit=1 # Only need the very latest
            )
            
            assistant_messages = [msg for msg in messages.data if msg.role == "assistant"]
            if assistant_messages and len(assistant_messages) > 0:
                latest_msg = assistant_messages[0]
                if latest_msg.content and len(latest_msg.content) > 0:
                    content_block = latest_msg.content[0]
                    if hasattr(content_block, 'text') and content_block.text: # Check for text attribute and its value
                        response_text = content_block.text.value
                    else:
                        response_text = "I'm sorry, I couldn't extract the text response from the AI."
                else:
                    response_text = "I'm sorry, the AI returned an empty response."
        else:
            error_message = f"Assistant run failed or was cancelled with status: {run.status}"
            if hasattr(run, 'last_error') and run.last_error:
                error_message += f" - {run.last_error.message}"
            response_text = error_message
            print(f"Run failed or cancelled: {error_message}")


        # Save AI message to chat_messages
        ai_chat_message = {
            "session_id": effective_conversation_db_id,
            "user_id": user_id,
            "content": response_text,
            "role": "assistant",
            "created_at": time.strftime('%Y-%m-%d %H:%M:%S')
        }
        print(f"DEBUG: Inserting AI chat_message: session_id={effective_conversation_db_id}, user_id={user_id}") # Debug print for AI message
        supabase_client.table("chat_messages").insert(ai_chat_message).execute()

        return ChatResponse(
            result=response_text,
            openai_thread_id=effective_thread_id,
            conversation_db_id=effective_conversation_db_id
        )
            
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get response from AI assistant: {str(e)}")

# New endpoint for fetching conversations
@app.get("/api/conversations", response_model=List[ConversationResponse])
async def get_conversations(dependency_tuple: Tuple[Client, str] = Depends(get_supabase_client_with_user_context)):
    supabase_client, user_id = dependency_tuple
    try:
        print(f"DEBUG: Fetching conversations for user_id={user_id}")
        response = supabase_client.table("therapy_sessions").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        if response.data:
            return response.data
        else:
            return []
    except Exception as e:
        print(f"Error fetching conversations: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch conversations")

@app.get("/api/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(conversation_id: str, dependency_tuple: Tuple[Client, str] = Depends(get_supabase_client_with_user_context)):
    supabase_client, user_id = dependency_tuple
    try:
        print(f"DEBUG: Fetching messages for conversation_id={conversation_id}, user_id={user_id}")
        # Verify that the conversation belongs to the user
        session_check = supabase_client.table("therapy_sessions").select("id").eq("id", conversation_id).eq("user_id", user_id).execute()
        if not session_check.data or len(session_check.data) == 0:
            raise HTTPException(status_code=403, detail="You do not have permission to access this conversation.")

        response = supabase_client.table("chat_messages").select("*").eq("session_id", conversation_id).order("created_at", desc=False).execute()
        if response.data:
            return response.data
        else:
            return []
    except Exception as e:
        print(f"Error fetching messages for conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch conversation messages")

@app.post("/stripe-webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, os.getenv("STRIPE_WEBHOOK_SECRET")
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {e}")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid signature: {e}")

    event_type = event['type']
    print(f"Stripe Event: {event_type}")

    if event_type == 'checkout.session.completed':
        session = event['data']['object']
        customer_email = session.get('customer_details', {}).get('email')
        # Here you would typically provision the user's subscription in your DB
        print(f"Checkout session completed for {customer_email}")
    elif event_type == 'invoice.payment_succeeded':
        invoice = event['data']['object']
        customer_email = invoice.get('customer_email')
        print(f"Invoice payment succeeded for {customer_email}")
    elif event_type == 'customer.subscription.updated':
        subscription = event['data']['object']
        print(f"Subscription updated for customer {subscription.get('customer')}")
    elif event_type == 'customer.subscription.deleted':
        subscription = event['data']['object']
        print(f"Subscription deleted for customer {subscription.get('customer')}")
    else:
        print(f"Unhandled event type {event_type}")

    return {"status": "success"}

if __name__ == "__main__":
    # Get the port from the environment variable, defaulting to 8000 if not found
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
