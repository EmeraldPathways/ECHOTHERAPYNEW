import React, { useState, useRef, useEffect } from "react";
import { sendMessageToAssistant, fetchConversationMessages } from "../services/api";
import { Message } from "../types";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { useAuth } from "./AuthProvider";

interface ChatWindowProps {
  initialConversationDbId?: number | null;
  initialOpenaiThreadId?: string | null;
  initialMessages?: Message[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({ initialConversationDbId, initialOpenaiThreadId, initialMessages }) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [isLoading, setIsLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(initialOpenaiThreadId || null);
  const [currentConversationDbId, setCurrentConversationDbId] = useState<number | null>(initialConversationDbId || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { session } = useAuth();

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    // Scroll to bottom when new messages arrive, but instantly if user is already near bottom
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100; // If within 100px of bottom
      scrollToBottom(isNearBottom ? "smooth" : "auto");
    } else {
      scrollToBottom("auto"); // Initial load
    }
  }, [messages]);

  useEffect(() => {
    // When initial messages or thread ID change, update state
    if (initialConversationDbId !== null && initialConversationDbId !== undefined) {
      // Only update state if loading a specific past conversation
      // This prevents resetting state for new conversations that don't pass these props
      setMessages(initialMessages || []);
      setCurrentThreadId(initialOpenaiThreadId || null);
      setCurrentConversationDbId(initialConversationDbId);
    }

    const loadMessages = async () => {
      if (initialConversationDbId && session?.access_token) {
        setIsLoading(true);
        try {
          const fetchedMessages = await fetchConversationMessages(initialConversationDbId, session.access_token);
          // Map fetched messages to the Message type expected by ChatWindow
          const formattedMessages: Message[] = fetchedMessages.map((msg: any) => ({
            id: msg.id.toString(),
            text: msg.content,
            sender: msg.role,
          }));
          setMessages(formattedMessages);
          setCurrentThreadId(initialOpenaiThreadId || null); // Ensure thread ID is also set
          setCurrentConversationDbId(initialConversationDbId); // Ensure conversation DB ID is set
        } catch (error) {
          console.error("Failed to load conversation messages:", error);
          setMessages([{
            id: "error",
            text: "Failed to load conversation history.",
            sender: "bot",
          }]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (initialConversationDbId && session?.access_token) {
      loadMessages();
    }
  }, [initialOpenaiThreadId, initialConversationDbId, session?.access_token]); // Added session.access_token as a dependency

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    console.log("Inside handleSendMessage. Current session:", session);
    console.log("Access token from session:", session?.access_token);
    if (!session?.access_token) {
      console.error("No access token available for sending message.");
      return; // Prevent sending message if no token
    }
    
    // --- THIS IS THE FIX ---
    // Safely convert the conversation DB ID from a number to a string for the API call.
    const conversationIdString = currentConversationDbId ? currentConversationDbId.toString() : null;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: "user",
    };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true);

    try {
      // Use the newly created 'conversationIdString' in the function call
      const assistantResponse = await sendMessageToAssistant(text, currentThreadId, conversationIdString, session.access_token);

      if (assistantResponse.openai_thread_id) { // Use openai_thread_id from response
        setCurrentThreadId(assistantResponse.openai_thread_id);
      }
      if (assistantResponse.conversation_db_id) { // Use conversation_db_id from response
        setCurrentConversationDbId(assistantResponse.conversation_db_id);
      }

      const newBotMessage: Message = {
        id: (Date.now() + Math.random()).toString(), // Unique ID
        text: assistantResponse.result, // Use result from response
        sender: "bot",
        m
