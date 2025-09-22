import type { ChatServiceRequest, ChatServiceResponse } from '@/types'; // Using the more specific types

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const sendMessageToAssistant = async (
  text: string,
  openaiThreadId: string | null, // OpenAI's Thread ID
  conversationDbId: string | null,  // Your Supabase DB's conversation ID
  token: string // Add token parameter
): Promise<ChatServiceResponse> => {
  
  const requestBody: ChatServiceRequest = {
    text: text,
    thread_id: openaiThreadId, // This is the OpenAI thread_id
    // 'conversation_db_id' is sent so the backend knows if it's a new conversation
    // in *your* database or an existing one.
    conversation_db_id: conversationDbId 
  };

  try {
    // The backend endpoint is now just /chat (as per the conceptual API route)
    // The specific assistant is determined by ASSISTANT_ID on the backend.
    const response = await fetch(`${API_BASE_URL}/chat`, { 
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorDetail = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        // OpenAI errors often come in an 'error: { message: "..." }' structure
        // Your API route might also return errors in a 'detail' field or 'error.message'
        errorDetail = errorData?.error?.message || errorData?.detail || errorData?.message || errorDetail;
      } catch (e) {
        // If parsing error JSON fails, use the status text
        errorDetail = response.statusText || errorDetail;
      }
      throw new Error(errorDetail);
    }

    const data: ChatServiceResponse = await response.json();
    return data;

  } catch (error) {
    console.error("Error calling chat API service:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown network error occurred.";
    // Return a structure that matches ChatServiceResponse for consistency in error handling
    return {
        result: `Error: Could not get a response. ${errorMessage}`,
        openai_thread_id: openaiThreadId || "", // Return current or empty thread_id on error
        conversation_db_id: conversationDbId || "", // Return current or 0/null on error
        explanation: "Please check if the backend server is running or try again later."
    };
  }
};

// --- API functions for Profile ---
export const fetchUserProfile = async (token: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/profile`, { // Assuming API route is /api/profile
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch profile');
  }
  return response.json();
};

export const updateUserProfile = async (profileData: any, token: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/profile`, { // Assuming API route is /api/profile
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update profile');
  }
  return response.json();
};


// --- API functions for Conversations History ---
export const fetchUserConversations = async (token: string): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/api/conversations`, { // Assuming API route is /api/conversations
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch conversations');
  }
  return response.json();
};

export const fetchConversationMessages = async (conversationId: number, token: string): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch conversation messages');
  }
  return response.json();
};