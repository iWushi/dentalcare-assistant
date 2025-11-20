import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION, MODEL_NAME } from "../constants";

let client: GoogleGenAI | null = null;
let chatInstance: Chat | null = null;

const getClient = (): GoogleGenAI => {
  if (!client) {
    // Safety check for process to prevent browser crashes if env is not polyfilled
    const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : '';
    
    if (!apiKey) {
      console.error("❌ ERRO CRÍTICO: A API Key do Gemini NÃO foi detectada. O chat não funcionará.");
      console.info("Dica: Se não tens um ficheiro .env, verifica as definições do teu editor ou injeta a chave manualmente.");
    } else {
      console.log("✅ Sucesso: API Key do Gemini detectada e configurada.");
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
  message: string,
  dataContext?: string
): Promise<AsyncIterable<GenerateContentResponse>> => {
  if (!chatInstance) {
    await initializeChat();
  }
  if (!chatInstance) {
    throw new Error("Chat instance is not initialized");
  }

  // Se houver contexto de dados, injetamos de forma "invisível" para o utilizador final no histórico,
  // mas visível para o modelo na mensagem actual.
  let finalMessage = message;
  if (dataContext) {
    finalMessage = `${message}\n\n[DATABASE_CONTEXT]\n${dataContext}\n\n[INSTRUCTION]\nUse the context above to answer the user query if needed.`;
  }

  return chatInstance.sendMessageStream({ message: finalMessage });
};