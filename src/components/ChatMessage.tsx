import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot, AlertCircle } from 'lucide-react';
import { Message, Role } from '../types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === Role.USER;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-600 text-white' : 'bg-teal-600 text-white'
        } shadow-md`}>
          {isUser ? <User size={20} /> : <Bot size={20} />}
        </div>

        {/* Message Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-5 py-3 rounded-2xl shadow-sm ${
            isUser 
              ? 'bg-blue-600 text-white rounded-tr-none' 
              : message.isError 
                ? 'bg-red-50 border border-red-200 text-red-800 rounded-tl-none'
                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
          }`}>
            {message.isError && (
              <div className="flex items-center gap-2 mb-2 font-bold text-red-600">
                <AlertCircle size={16} />
                <span>Error</span>
              </div>
            )}
            
            <div className={`prose ${isUser ? 'prose-invert' : ''} max-w-none text-sm md:text-base leading-relaxed break-words`}>
               <ReactMarkdown>{message.text}</ReactMarkdown>
            </div>
          </div>
          
          <span className="text-xs text-gray-400 mt-1 mx-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

      </div>
    </div>
  );
};

export default ChatMessage;
