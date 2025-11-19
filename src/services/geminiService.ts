import { GoogleGenAI, Chat, GenerateContentStreamResult } from "@google/genai";
import { SYSTEM_INSTRUCTION, MODEL_NAME } from "../constants";

let client: GoogleGenAI | null = null;
let chatInstance: Chat | null = null;

const getClient = (): GoogleGenAI => {
  if (!client) {
    // Safety check for process to prevent browser crashes if env is not polyfilled
    const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : '';
    
    if (!apiKey) {
      console.warn("API Key is missing. Chat features will not work.");
      // We allow it to fail gracefully later rather than crashing app load
    }
    
    client = new GoogleGenAI({ apiKey: apiKey || 'dummy_key' });
  }
  return client;
};

export const initializeChat = async (): Promise<void> => {
  try {
    const ai = getClient();
    chatInstance = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });
  } catch (error) {
    console.error("Failed to initialize chat:", error);
    throw error;
  }
};

export const sendMessageStream = async (
  message: string
): Promise<GenerateContentStreamResult> => {
  if (!chatInstance) {
    await initializeChat();
  }
  if (!chatInstance) {
    throw new Error("Chat instance is not initialized");
  }
  return chatInstance.sendMessageStream({ message });
};