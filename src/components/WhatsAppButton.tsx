import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  SendHorizontal, 
  X, 
  Sparkles, 
  ChevronRight, 
  HelpCircle, 
  PhoneCall,
  RefreshCw,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
}

export default function WhatsAppButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Local current time for the chat simulation
  const getFormattedTime = () => {
    return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Selamat datang di Layanan Informasi Resmi SDN Cibojong 1 Padarincang! 🏫\n\nSilakan klik salah satu pertanyaan populer atau hubungi langsung admin sekolah untuk bantuan pendaftaran (SPMB) & akademik.",
      timestamp: getFormattedTime()
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when chat updates or typing state changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping]);

  const admins = [
    {
      name: "Izmayati Hermana, S.Pd",
      role: "Humas & SPMB SDN Cibojong 1",
      number: "6287710206067",
      avatar: "👩‍🏫",
      color: "from-emerald-500 to-teal-600"
    },
    {
      name: "Nurul Uyun, S.Pd",
      role: "Kesiswaan & Akademik",
      number: "6283873508737",
      avatar: "👩‍💻",
      color: "from-blue-500 to-indigo-600"
    }
  ];

  const popularQa: Record<string, string> = {
    "Bagaimana syarat umur daftar kelas 1?": 
      "Syarat usia calon peserta didik baru kelas 1 SD adalah minimal 6 tahun pada tanggal 1 Juli tahun berjalan. Prioritas utama diberikan kepada anak yang telah berusia 7 tahun.",
    "Kapan batas pendaftaran online ditutup?": 
      "Pendaftaran online gelombang pertama dibuka hingga tanggal 10 Juli 2026. Berkas fisik dapat dibawa ke panitia sekolah untuk verifikasi pada jam kerja (08:00 - 12:00 WIB).",
    "Bagaimana cara upload berkas SPMB?": 
      "Anda dapat mengunggah berkas penunjang seperti foto Akta Kelahiran, Kartu Keluarga, dan KIP/PIP di Langkah 4 Formulir Online ini. Pastikan file berupa foto/gambar (JPG/PNG) atau PDF beresolusi jelas."
  };

  // Predefined prompts mapping
  const handleFaqClick = (question: string) => {
    // Avoid double clicks while bot is typing
    if (isTyping) return;

    const userTime = getFormattedTime();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: question,
      timestamp: userTime
    };

    setChatHistory(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const answer = popularQa[question] || "Tentu, kami siap menjawab pertanyaan Anda. Silakan hubungi nomor WhatsApp admin di bawah ini untuk detail lengkap.";
      const botTime = getFormattedTime();
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: answer,
        timestamp: botTime
      };

      setChatHistory(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 850);
  };

  const handleCustomSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isTyping) return;

    const userText = message;
    const userTime = getFormattedTime();
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: userTime
    };

    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);

    setTimeout(() => {
      const botTime = getFormattedTime();
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `Terima kasih atas pertanyaannya! 💬\n\nUntuk mendapatkan respon langsung, silakan hubungi admin sekolah di bawah ini menggunakan pesan tersebut. Kami akan langsung mengarahkan Anda ke ruang obrolan WhatsApp.`,
        timestamp: botTime
      };

      setChatHistory(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 750);
  };

  // Build WhatsApp URL helper
  const getWhatsAppLink = (number: string, textPayload: string) => {
    const defaultText = textPayload || "Halo Admin SDN Cibojong 1 Padarincang, saya ingin bertanya perihal pendaftaran sekolah.";
    return `https://wa.me/${number}?text=${encodeURIComponent(defaultText)}`;
  };

  // Helper to trace last user-sent message text to prefill WhatsApp
  const getLastUserMessage = () => {
    const userMsgs = chatHistory.filter(m => m.sender === 'user');
    if (userMsgs.length > 0) {
      return userMsgs[userMsgs.length - 1].text;
    }
    return "Halo Admin SDN Cibojong 1, saya membutuhkan bantuan informasi pendaftaran siswa baru.";
  };

  // Reset chat logic
  const handleResetChat = () => {
    setChatHistory([
      {
        id: 'welcome',
        sender: 'bot',
        text: "Layanan informasi berhasil di-restart. Silakan ajukan pertanyaan baru atau pilih kontak admin sekolah di bawah ini:",
        timestamp: getFormattedTime()
      }
    ]);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-7 sm:right-7 z-[999] no-print flex flex-col items-end pb-safe select-none">
      
      {/* WhatsApp Chat Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 240 }}
            className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-100/80 w-[92vw] sm:w-[380px] max-w-sm h-[78vh] max-h-[580px] mb-4 overflow-hidden flex flex-col relative z-[999]"
          >
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 px-4 py-3 shrink-0 text-white shadow-md relative z-10 flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center text-lg shadow-inner border border-white/20 select-none">
                    🏫
                  </div>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-emerald-600 flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sm tracking-wide flex items-center gap-1.5 leading-snug">
                    Hubungi Chat Admin
                    <span className="bg-emerald-500 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border border-emerald-400 animate-pulse">
                      AKTIF
                    </span>
                  </h4>
                  <p className="text-[11px] text-emerald-100 font-mono tracking-tight flex items-center gap-1">
                    <Clock className="h-3 w-3 inline shrink-0" /> Bantuan SPMB & Akademik
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 z-20 shrink-0">
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Mulai Ulang Percakapan"
                  className="p-1.5 bg-white/10 hover:bg-white/20 active:scale-90 rounded-full transition-all text-white/90"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 bg-white/10 hover:bg-red-500/80 active:scale-90 rounded-full transition-all text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content (Messages, FAQs, and Admins are unified in a single scrollable area to prevent scroll collapse/overlap) */}
            <div className="flex-1 overflow-y-auto scrollbar-thin hover:scrollbar-thumb-slate-300 scrollbar-thumb-slate-200 scrollbar-track-transparent p-4 space-y-5 bg-slate-50/45">
              
              {/* Dynamic messages */}
              <div className="space-y-3">
                {chatHistory.map((item) => {
                  const isBot = item.sender === 'bot';
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.25 }}
                      className={`flex flex-col max-w-[85%] ${ isBot ? 'self-start items-start' : 'self-end items-end ml-auto' }`}
                    >
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs relative ${ isBot ? 'bg-white text-slate-800 rounded-tl-none border border-slate-100' : 'bg-emerald-600 text-white rounded-tr-none' }`}>
                        <p className="whitespace-pre-line font-medium">{item.text}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-1 px-1 flex items-center gap-1">
                        {isBot ? '🤖 Sistem' : '👤 Anda'} • {item.timestamp}
                      </span>
                    </motion.div>
                  );
                })}

                {/* Bot typing simulator */}
                {isTyping && (
                  <div className="flex flex-col max-w-[85%] self-start items-start">
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-xs flex items-center space-x-1">
                      <span className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200/50 my-3" />

              {/* Interactive FAQs Section */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 select-none leading-none">
                  <HelpCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Pertanyaan Populer
                </p>
                <div className="flex flex-col gap-2">
                  {Object.keys(popularQa).map((q, idx) => (
                    <motion.button
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                      key={idx}
                      type="button"
                      onClick={() => handleFaqClick(q)}
                      className="block w-full text-left p-2.5 rounded-xl bg-white hover:bg-emerald-50/60 border border-slate-200/60 hover:border-emerald-200 text-xs text-slate-700 font-semibold transition-all shadow-xs flex items-center justify-between group"
                    >
                      <span className="truncate pr-2 group-hover:text-emerald-700">{q}</span>
                      <ChevronRight className="h-3 w-3 text-slate-400 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200/50 my-3" />

              {/* School Real Admin Directory (WhatsApp Direct Link) */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 select-none leading-none">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-500 animate-pulse shrink-0" /> Kontak WhatsApp Admin Resmi
                </p>

                <div className="flex flex-col gap-2.5">
                  {admins.map((admin, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.015 }}
                      className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-100 bg-white hover:bg-emerald-50/10 hover:border-emerald-100 transition-all shadow-xs gap-2"
                    >
                      <div className="flex items-center min-w-0 gap-2.5">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-slate-50 flex items-center justify-center text-lg shadow-inner border border-slate-100 select-none">
                          {admin.avatar}
                        </div>
                        <div className="text-left min-w-0">
                          <div className="text-xs font-bold text-slate-900 leading-snug flex items-center gap-1 flex-wrap">
                            <span className="truncate">{admin.name}</span>
                            <span className="inline-flex items-center bg-emerald-100 text-emerald-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                              <span className="h-1 w-1 bg-emerald-500 rounded-full mr-1 animate-pulse" />
                              Aktif
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate leading-none">{admin.role}</p>
                        </div>
                      </div>

                      <a
                        href={getWhatsAppLink(admin.number, getLastUserMessage())}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] uppercase tracking-wide transition-all shadow-xs hover:shadow cursor-pointer shrink-0"
                      >
                        <PhoneCall className="h-3 w-3 animate-pulse" />
                        Chat
                      </a>
                    </motion.div>
                  ))}
                </div>
              </div>

            </div>

            {/* Form Footer Custom Text Input */}
            <form 
              onSubmit={handleCustomSend} 
              className="p-3 bg-white border-t border-slate-150 shrink-0 flex items-center space-x-2 z-10"
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tulis pertanyaan custom..."
                className="flex-1 bg-slate-50 text-xs text-slate-800 rounded-full border border-slate-200 px-4 h-11 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="bg-emerald-600 text-white hover:bg-emerald-500 rounded-full h-11 w-11 transition-colors shrink-0 shadow-md shadow-emerald-600/20 flex items-center justify-center cursor-pointer"
              >
                <SendHorizontal className="h-4 w-4" />
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button with elegant custom Framer Motion dynamics */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        animate={isOpen ? {} : {
          y: [0, -6, 0],
        }}
        transition={isOpen ? {} : {
          repeat: Infinity,
          duration: 3,
          ease: "easeInOut"
        }}
        className="flex items-center justify-center space-x-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl hover:shadow-emerald-200/80 transition-all tracking-wide cursor-pointer z-[999] group relative border border-emerald-400/20"
        title="Tanya Admin SDN Cibojong 1"
      >
        <motion.div
          animate={isOpen ? { rotate: 90 } : { rotate: [0, 8, -8, 0] }}
          transition={isOpen ? { duration: 0.25 } : {
            repeat: Infinity,
            repeatDelay: 5.5,
            duration: 0.8,
            ease: "easeInOut"
          }}
          className="shrink-0"
        >
          {isOpen ? (
            <X className="h-5.5 w-5.5 text-white" />
          ) : (
            <MessageCircle className="h-5.5 w-5.5 fill-white" />
          )}
        </motion.div>
        
        {!isOpen && (
          <span className="hidden sm:inline text-xs font-bold font-sans tracking-wider uppercase select-none">
            Tanya Admin
          </span>
        )}

        {/* Pulse effect on floating trigger */}
        {!isOpen && (
          <span className="absolute -inset-1 rounded-full border border-emerald-400/30 pointer-events-none animate-ping opacity-25" />
        )}
      </motion.button>
    </div>
  );
}
