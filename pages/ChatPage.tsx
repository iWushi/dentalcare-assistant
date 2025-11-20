
import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles, ArrowLeft, Mic, MicOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Message, Role } from '../types';
import { sendMessageStream, initializeChat } from '../services/geminiService';
import ChatMessage from '../components/ChatMessage';
import ReferencePanel from '../components/ReferencePanel';
import { useData } from '../context/DataContext';

const INITIAL_MESSAGE: Message = {
  id: 'init-1',
  role: Role.MODEL,
  text: `Olá Dra. Shamila! 👋\n\nSou a **DentalCare Assistant**, pronta para gerir as suas consultas na Sommerschield.\n\n**COMO USAR:**\n\n1. **Registo rápido:** "Consulta dia 18/11, paciente João Silva, A2 e D1"\n2. **Consultar dados:** "Quanto facturei este mês?"\n3. **Gerir pacientes:** "Histórico do João Silva"\n\nComo posso ajudar hoje? 🦷`,
  timestamp: new Date(),
};

const QUICK_PROMPTS = [
  "Nova consulta",
  "Quanto facturei este mês?",
  "Histórico do...",
  "Procedimentos do tipo...",
  "Pacientes com lab pendente",
  "Catalogar nova consulta: data + paciente + procedimentos + clínica"
];

const ChatPage: React.FC = () => {
  const { consultations, patients } = useData(); // Hook into DB data
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatInitialized, setChatInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize chat on mount to set system instruction
    const init = async () => {
       try {
         await initializeChat();
         setChatInitialized(true);
       } catch (e) {
         console.error("Initialization error", e);
         // Não mostramos erro visual no init, apenas quando o user tenta enviar msg
       }
    }
    init();
  }, []);

  // Speech Recognition Setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        setSpeechSupported(true);
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = 'pt-PT';

          recognition.onresult = (event: any) => {
              const transcript = event.results[0][0].transcript;
              setInputValue(prev => prev ? `${prev} ${transcript}` : transcript);
              setIsListening(false);
          };

          recognition.onerror = (event: any) => {
              console.error('Speech recognition error', event.error);
              setIsListening(false);
              if (event.error === 'not-allowed') {
                  alert("Por favor permita o acesso ao microfone para usar o ditado.");
              }
          };
          
          recognition.onend = () => {
              setIsListening(false);
          };
          
          recognitionRef.current = recognition;

        } catch (e) {
          console.error("Speech API blocked or failed initialization", e);
          setSpeechSupported(false);
        }
    } else {
      setSpeechSupported(false);
    }
  }, []);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
        alert("O ditado por voz não está disponível neste navegador.");
        return;
    }

    try {
      if (isListening) {
          recognitionRef.current.stop();
          setIsListening(false);
      } else {
          setIsListening(true);
          recognitionRef.current.start();
      }
    } catch (e) {
      console.error("Failed to start/stop speech", e);
      setIsListening(false);
    }
  };

  // Prepare DB Context
  const prepareDatabaseContext = () => {
    // Simplify data to save tokens, but keep essential fields
    const simpleConsultations = consultations.map(c => ({
      date: c.date,
      patient: c.patientName,
      clinic: c.clinic,
      procedures: c.procedures.map(p => p.code).join(', '),
      commission: c.doctorCommission,
      hasPendingLab: c.hasPendingLab
    }));

    const simplePatients = patients.map(p => ({
      name: p.name,
      phone: p.phone,
      notes: p.notes
    }));

    return JSON.stringify({
      today: new Date().toISOString().split('T')[0],
      summary: `Total Consultations: ${consultations.length}`,
      consultations: simpleConsultations,
      patients: simplePatients
    });
  };

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || inputValue;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: textToSend.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      if (!chatInitialized) await initializeChat();

      // INJECT DATA CONTEXT HERE
      const dbContext = prepareDatabaseContext();

      const result = await sendMessageStream(userMsg.text, dbContext);
      
      // Create a placeholder message for the bot response
      const botMsgId = (Date.now() + 1).toString();
      const botMsg: Message = {
        id: botMsgId,
        role: Role.MODEL,
        text: '', // Start empty
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, botMsg]);

      let fullText = '';
      
      for await (const chunk of result) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
          
          setMessages((prev) => 
            prev.map((msg) => 
              msg.id === botMsgId ? { ...msg, text: fullText } : msg
            )
          );
        }
      }

    } catch (error: any) {
      console.error("Chat Error:", error);
      
      let errorMessage = "Desculpe, ocorreu um erro ao processar o seu pedido. Por favor, tente novamente.";
      
      // Detect specific configuration errors
      const errStr = String(error?.message || error);
      
      if (errStr.includes("API_KEY_MISSING") || errStr.includes("API key not valid") || errStr.includes("400")) {
        errorMessage = "⚠️ **ERRO DE CONFIGURAÇÃO:**\n\nA API Key do Gemini não foi detectada ou é inválida.\n\n**Como corrigir no Vercel:**\n1. Vá a Settings > Environment Variables\n2. Adicione `API_KEY` com a sua chave\n3. Faça **Redeploy** da aplicação.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: Role.MODEL,
          text: errorMessage,
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      // In mobile, we might lose focus, but let's try to keep it
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    if (prompt.includes("...")) {
      // If prompt has "...", just fill input
      setInputValue(prompt.replace("...", " "));
      inputRef.current?.focus();
    } else if (prompt.includes("Catalogar")) {
       setInputValue(prompt);
       inputRef.current?.focus();
    } else {
      // Send immediately
      handleSendMessage(prompt);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] lg:h-[calc(100vh-64px)] bg-gray-50 lg:flex-row pb-safe">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full w-full max-w-5xl mx-auto bg-white lg:shadow-xl lg:my-4 lg:rounded-2xl lg:border lg:border-gray-200 overflow-hidden">
        
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 p-3 pt-safe flex items-center justify-between flex-shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-3">
             <Link to="/" className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg active:scale-95 transition-transform">
               <ArrowLeft size={22} />
            </Link>
            <div className="bg-teal-500 p-2 rounded-lg shadow-sm">
              <Sparkles className="text-white w-4 h-4" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-800 text-base leading-tight">Assistente AI</h1>
              <p className="text-[10px] text-teal-600 font-medium">Online • Dra. Shamila</p>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide bg-gray-50/50">
          <div className="max-w-3xl mx-auto">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
             {isLoading && (
              <div className="flex justify-start mb-6">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                    <div className="text-xs text-gray-400 animate-pulse">Pensando...</div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Safe Area aware */}
        <div className="bg-white border-t border-gray-100 flex-shrink-0 pb-safe flex flex-col">
          
          {/* Input Container */}
          <div className="p-3 max-w-3xl mx-auto w-full relative flex items-center gap-2">
             {/* Voice Input Button */}
            <button
                onClick={toggleListening}
                className={`p-3 rounded-2xl transition-all active:scale-90 flex-shrink-0 ${
                    isListening 
                    ? 'bg-red-100 text-red-600 animate-pulse' 
                    : !speechSupported 
                        ? 'bg-gray-50 text-gray-300 opacity-50 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title={!speechSupported ? "Microfone não suportado" : "Falar"}
            >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <div className="relative flex-1">
                <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "A ouvir..." : "Escreva aqui..."}
                className="w-full bg-gray-50 text-slate-800 placeholder-gray-400 border border-gray-200 rounded-2xl pl-4 pr-12 py-4 text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all shadow-sm"
                disabled={isLoading}
                />
                <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm active:scale-90"
                >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </div>
          </div>

          {/* Quick Prompts - Below Input as requested */}
          <div className="overflow-x-auto scrollbar-hide px-4 pb-3 max-w-3xl mx-auto w-full">
             <div className="flex gap-2 w-max">
               {QUICK_PROMPTS.map((prompt, idx) => (
                 <button
                   key={idx}
                   onClick={() => handleQuickPrompt(prompt)}
                   className="text-[11px] font-medium bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 active:scale-95 transition-colors border border-gray-200/50 whitespace-nowrap"
                 >
                   {prompt}
                 </button>
               ))}
             </div>
          </div>

        </div>
      </div>

      {/* Desktop Sidebar (Right Panel) */}
      <ReferencePanel />
    </div>
  );
};

export default ChatPage;
