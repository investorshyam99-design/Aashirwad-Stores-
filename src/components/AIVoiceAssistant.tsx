import React, { useState, useEffect, useRef } from 'react';
import { Mic, X, Sparkles, Loader2, StopCircle, Send, Bot, User } from 'lucide-react';
import { useCartStore } from '../store/cart';
import { useProductsStore } from '../store/products';
import { useAuthStore, getGuestId } from '../store/auth';
import { collection, doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: ((this: SpeechRecognition, ev: any) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: any) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition };
    webkitSpeechRecognition: { new (): SpeechRecognition };
  }
}

export function AIVoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // To toggle mini vs ChatGPT mode
  const [isListening, setIsListening] = useState(false);
  const isTypingRef = useRef(false);
  const hasFatalMicErrorRef = useRef(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
  const [chatId, setChatId] = useState<string>('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Refs for callbacks
  const transcriptRef = useRef('');
  const isProcessingRef = useRef(false);
  const isOpenRef = useRef(false);
  const messagesRef = useRef<{ role: 'user' | 'assistant', text: string }[]>([]);
  
  const { products } = useProductsStore();
  const { addItem, items, setCartOpen, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (!isOpen) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
      setIsListening(false);
      setTranscript('');
      transcriptRef.current = '';
    } else {
      // Initialize chat session
      if (!chatId) {
        const newChatId = user ? `chat_${user.uid}_${Date.now()}` : `chat_${getGuestId()}_${Date.now()}`;
        setChatId(newChatId);
        
        // Ensure doc exists
        setDoc(doc(db, 'chats', newChatId), {
          userId: user?.uid || getGuestId(),
          customerEmail: user?.email || 'N/A',
          startedAt: Date.now(),
          lastUpdated: Date.now(),
          messages: []
        }, { merge: true }).catch(console.error);
      }
    }
  }, [isOpen, user, chatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, transcript, isProcessing, isExpanded]);

  // Preload speech synthesis voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false; // Stops automatically on silence
      recognition.interimResults = true;
      recognition.lang = 'hi-IN';

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        transcriptRef.current = currentTranscript;
      };

      let hasError = false;

      recognition.onend = () => {
        setIsListening(false);
        // User stopped speaking (silence detected by native API)
        if (transcriptRef.current.trim() && !isProcessingRef.current && !isTypingRef.current) {
          processTranscript(transcriptRef.current);
        } else if (isOpenRef.current && !isProcessingRef.current && !hasError && !isTypingRef.current) {
          // Restart if they stayed silent but modal is open and we aren't processing
          startRecognition();
        }
        hasError = false;
      };

      recognition.onerror = (event) => {
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          console.error('Speech recognition error', event.error);
        }
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          hasError = true;
          hasFatalMicErrorRef.current = true;
          saveMessageAndState('assistant', "Microphone permission denied. Note: In some browsers, voice recognition does not work inside iframes. Kripya app ko ek naye tab mein open karein, ya type karke message bhejein.");
        } else if (event.error === 'network') {
          hasError = true;
          hasFatalMicErrorRef.current = true;
          saveMessageAndState('assistant', "Speech recognition network error. Kripya app ko naye tab mein open karein (top right icon), ya text se type karein.");
        } else if (event.error === 'aborted') {
          // Benign error, usually when stopped manually
          hasError = true;
        } else if (event.error === 'no-speech' && isOpenRef.current && !isProcessingRef.current) {
          startRecognition();
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const saveMessageAndState = async (role: 'user' | 'assistant', text: string) => {
    const newMsg = { role, text };
    const newHistory = [...messagesRef.current, newMsg];
    setMessages(newHistory);
    messagesRef.current = newHistory;

    if (chatId) {
      try {
        await updateDoc(doc(db, 'chats', chatId), {
          messages: arrayUnion({ role, text, timestamp: Date.now() }),
          lastUpdated: Date.now()
        });
      } catch (err) {
        console.error("Error saving chat msg:", err);
      }
    }
  };

  const startRecognition = async () => {
    if (hasFatalMicErrorRef.current) return;
    if (recognitionRef.current && isOpenRef.current && !isProcessingRef.current) {
      try {
        // Unblock permissions in some contexts by requesting explicitly first
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.warn("getUserMedia failed, speech recognition might fail:", err);
        }

        setTranscript('');
        transcriptRef.current = '';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e: any) {
        if (e && e.name === 'InvalidStateError') {
          // Already started, benign
          setIsListening(true);
        } else {
          console.error("Start recognition error:", e);
        }
      }
    }
  };

  const speak = (text: string, audioBase64?: string) => {
    return new Promise(async (resolve) => {
      if (audioBase64) {
         try {
           const outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
           const binaryString = atob(audioBase64);
           const len = binaryString.length;
           const bytes = new Uint8Array(len);
           for (let i = 0; i < len; i++) {
             bytes[i] = binaryString.charCodeAt(i);
           }
           const buffer = new Int16Array(bytes.buffer);
           const audioBuffer = outputAudioCtx.createBuffer(1, buffer.length, 24000);
           const channelData = audioBuffer.getChannelData(0);
           for (let i = 0; i < buffer.length; i++) {
             channelData[i] = buffer[i] / 32768.0;
           }
           const source = outputAudioCtx.createBufferSource();
           source.buffer = audioBuffer;
           source.connect(outputAudioCtx.destination);
           source.onended = () => resolve(true);
           source.start(0);
           return;
         } catch(e) {
           console.error("PCM playback error", e);
         }
      }
      
      // Fallback to browser TTS if no audioBase64 or playback fails
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'hi-IN';
        const voices = window.speechSynthesis.getVoices();
        const indianVoice = voices.find(v => v.lang === 'hi-IN' || v.lang.includes('hi') || v.lang.includes('IN')) || voices[0];
        if (indianVoice) utterance.voice = indianVoice;
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);
        window.speechSynthesis.speak(utterance);
      } else {
        resolve(false);
      }
    });
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }
    
    hasFatalMicErrorRef.current = false;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (transcriptRef.current.trim()) {
        processTranscript(transcriptRef.current);
      }
    } else {
      startRecognition();
    }
  };

  const placeOrderWithoutSpeak = async (customerName?: string, customerPhone?: string) => {
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const orderId = `AASH-${Math.floor(100000 + Math.random() * 900000)}`;

      const currentItems = useCartStore.getState().items;
      
      const userRequests = messagesRef.current
        .filter(m => m.role === 'user')
        .map(m => m.text)
        .join(' | ');

      await addDoc(collection(db, 'orders'), {
        orderId,
        userId: user?.uid || getGuestId(),
        customerName: customerName || user?.email || 'Voice Assistant Guest',
        customerPhone: customerPhone || 'N/A',
        customerAddress: 'Voice Order',
        voiceNotes: userRequests || '',
        items: currentItems.map((i: any) => ({ id: i.id || '', name: i.name || '', quantity: i.quantity || 1, price: i.price || 0, image: i.image || '' })),
        totalAmount: currentItems.reduce((acc: number, curr: any) => acc + ((curr.price || 0) * curr.quantity), 0),
        status: 'Order Received',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      clearCart();
    } catch(err) {
      console.error(err);
      throw err;
    }
  };

  const processTranscript = async (text: string, isGreeting: boolean = false, isTyped: boolean = false) => {
    isTypingRef.current = false;
    if (!text.trim() && !isGreeting) return;
    
    // Manual stop commands
    const lowerText = text.toLowerCase();
    if (lowerText.includes('stop') || lowerText.includes('order complete') || lowerText.includes('bas') || lowerText.includes('band karo') || lowerText.includes('ho gaya')) {
       setIsOpen(false);
       return;
    }
    
    // Stop listening while processing & speaking
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e){}
    }
    setIsListening(false);
    
    setIsProcessing(true);
    isProcessingRef.current = true;
    setTranscript('');
    transcriptRef.current = '';
    
    if (!isGreeting) {
      await saveMessageAndState('user', text);
    }

    if (isGreeting) {
      const greeting = "नमस्ते जी, आपको क्या चाहिए?";
      try {
        await saveMessageAndState('assistant', greeting);
        // Only speak greeting if not triggered by typed action (though greeting is usually automatic)
        if (!isTyped) await speak(greeting);
      } catch (err) {
        console.warn("Greeting TTS failed:", err);
      } finally {
        setIsProcessing(false);
        isProcessingRef.current = false;
        if (isOpenRef.current) startRecognition();
      }
      return;
    }

    try {
      const simplifiedProducts = products.map((p) => ({ id: p.id, name: p.name, price: p.price }));
      const response = await fetch('/api/voice-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, products: simplifiedProducts, history: messagesRef.current, cart: itemsRef.current, isGreeting: false, isTyped }),
      });
      
      const contentType = response.headers.get("content-type");
      let data;

      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
           const errData = await response.json();
           throw new Error(errData.error || `HTTP error! status: ${response.status}`);
        } else {
           throw new Error(`Server API is missing (Status ${response.status}). If you deployed this, ensure the Node.js backend is running and not just the static frontend!`);
        }
      }

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        throw new Error("Server returned an HTML page instead of JSON. This usually means the Node.js server is not running on your hosting provider (like Vercel).");
      }
      
      let voiceReply = data.reply;

      if (data.cartUpdates && Array.isArray(data.cartUpdates)) {
        let addedAny = false;
        for (const item of data.cartUpdates) {
          let p = null;
          
          if (item.id && typeof item.id === 'string') {
            const matchedProd = products.find(prod => prod.id === item.id);
            if (matchedProd) {
              p = matchedProd;
            }
          }
          if (!p && item.name) {
            // Find by exact name if ID didn't work
            p = products.find(prod => prod.name.trim().toLowerCase() === item.name.trim().toLowerCase());
            
            // Fuzzy search by keywords if exact match fails
            if (!p) {
              const searchWords = item.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 2);
              if (searchWords.length > 0) {
                // Try to find a product that has all search words
                p = products.find(prod => {
                  const prodName = prod.name.toLowerCase();
                  return searchWords.every(w => prodName.includes(w));
                });
                
                // Try to find a product that has any search words if all words fails
                if (!p) {
                   p = products.find(prod => {
                      const prodName = prod.name.toLowerCase();
                      return searchWords.some(w => prodName.includes(w));
                   });
                }
              }
            }
          }

          if (p) {
            addItem(p, item.quantity || 1);
            addedAny = true;
          }
        }
        if (addedAny) {
           // Provide feedback that items are added
        }
      }

      if (data.action === 'place_order') {
         voiceReply = "Aapka order successfully place ho gaya hai. Dhanyawad!";
         await placeOrderWithoutSpeak(data.customerName, data.customerPhone);
      }

      await saveMessageAndState('assistant', voiceReply);
      
      if (voiceReply && !isTyped) {
        await speak(voiceReply, data.audioBase64);
      }

      if (data.action === 'place_order') {
         setTimeout(() => { 
           setIsOpen(false); 
           import('../store/ui').then(({ useUIStore }) => {
             useUIStore.getState().setActiveTab('orders');
           });
         }, 4000);
         return; // don't resume
      }
      
    } catch (error: any) {
       console.error("Smart ordering error", error);
       let errReply = `Network issue: ${error.message || 'unknown'}`;
       if (error.message?.includes('AI assistant limit reached')) {
         errReply = "AI assistant quota exceeded. API calls limited for now.";
       }
       await saveMessageAndState('assistant', errReply);
       if (!isTyped) await speak(errReply);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
      
      // Resume listening
      if (isOpenRef.current && !isTyped) {
         startRecognition();
      }
    }
  };

  return (
    <>
      <button 
        onClick={() => {
          hasFatalMicErrorRef.current = false;
          // Unblock TTS and Media Devices immediately on user gesture
          if ('speechSynthesis' in window) {
            const dummy = new SpeechSynthesisUtterance('');
            dummy.volume = 0;
            window.speechSynthesis.speak(dummy);
          }
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
              .then(stream => stream.getTracks().forEach(t => t.stop()))
              .catch(e => console.warn("Mic unblock error:", e));
          }

          setIsOpen(true);
          setIsExpanded(true);
          if (messages.length === 0) {
            processTranscript("", true);
          } else {
            startRecognition();
          }
        }}
        className="fixed bottom-20 md:bottom-10 right-4 md:right-10 z-[60] bg-[#10a37f] text-white p-4 rounded-full shadow-xl hover:bg-[#0e906f] transition-transform hover:scale-105 flex items-center justify-center"
      >
        <Sparkles size={28} />
      </button>

      {isOpen && (
        <div className={`fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in transition-all ${isExpanded ? 'p-0 sm:p-4' : 'p-4 sm:p-0 items-end sm:items-center'}`}>
          <div className={`bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl relative animate-in slide-in-from-bottom flex flex-col overflow-hidden transition-all duration-300 ${isExpanded ? 'w-full h-full sm:h-[90vh] sm:w-[900px]' : 'w-full sm:w-[450px] max-h-[90vh]'}`}>
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white z-10 shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-[#10a37f] p-2 rounded-full text-white">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 leading-tight">AI Assistant</h3>
                  <p className="text-xs text-gray-500">Always here to help</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-gray-400 hover:text-gray-600 p-2 hidden sm:block"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg> 
                </button>
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    window.speechSynthesis.cancel();
                  }}
                  className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto w-full p-4 md:p-8 bg-[#f9f9f9] custom-scrollbar scroll-smooth relative"
            >
              {messages.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                  <div className="bg-[#10a37f]/10 p-6 rounded-full mb-4">
                    <Sparkles size={48} className="text-[#10a37f]" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-700 mb-2">How can I help you?</h3>
                  <p className="max-w-xs mx-auto text-sm">Ask me to add products to your cart, check availability, or place your order directly.</p>
                </div>
              )}

              <div className="space-y-6 max-w-4xl mx-auto w-full pb-10">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                    <div className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full mt-1 ${msg.role === 'user' ? 'bg-gray-800 text-white' : 'bg-[#10a37f] text-white'}`}>
                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                      </div>
                      <div className={`py-3 px-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-gray-800 text-white rounded-tr-sm' 
                          : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isListening && transcript && (
                  <div className="flex w-full justify-end animate-in fade-in">
                    <div className="flex gap-3 max-w-[85%] sm:max-w-[75%] flex-row-reverse">
                      <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full mt-1 bg-gray-800 opacity-60 text-white">
                        <User size={16} />
                      </div>
                      <div className="py-3 px-4 rounded-2xl text-[15px] leading-relaxed bg-gray-100/80 border border-gray-100 text-gray-600 rounded-tr-sm italic">
                        {transcript}
                        <span className="ml-1 animate-pulse inline-block w-1 h-3 bg-gray-400"></span>
                      </div>
                    </div>
                  </div>
                )}
                
                {isProcessing && (
                  <div className="flex w-full justify-start animate-in fade-in">
                    <div className="flex gap-3 max-w-[85%] sm:max-w-[75%] flex-row">
                      <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full mt-1 bg-[#10a37f]/80 text-white">
                         <Loader2 size={16} className="animate-spin" />
                      </div>
                      <div className="py-4 px-4 rounded-2xl bg-white text-gray-800 rounded-tl-sm border border-gray-100 shadow-sm flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-150"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 border-t border-gray-100 shrink-0">
              <div className="max-w-4xl mx-auto flex items-end gap-3 bg-gray-50 rounded-[28px] p-2 pl-5 border border-gray-200 focus-within:border-gray-300 focus-within:bg-white focus-within:shadow-[0_0_15px_rgba(0,0,0,0.05)] transition-all">
                <textarea
                  value={transcript}
                  onChange={(e) => {
                    isTypingRef.current = true;
                    setTranscript(e.target.value);
                    transcriptRef.current = e.target.value;
                    if (isListening && recognitionRef.current) recognitionRef.current.stop();
                  }}
                  placeholder="Ask for an item or place an order..."
                  className="flex-1 bg-transparent py-3 outline-none text-[15px] text-gray-800 resize-none max-h-32 min-h-[48px] custom-scrollbar"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (transcript.trim()) processTranscript(transcript, false, true);
                    }
                  }}
                  disabled={isProcessing}
                />
                
                <div className="flex gap-2 pb-1 pr-1 shrink-0">
                  <button 
                    onClick={toggleListening}
                    className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${
                      isListening 
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                    }`}
                    title={isListening ? "Stop listening" : "Start Voice Interaction"}
                  >
                    {isListening ? (
                       <span className="relative flex h-3 w-3 items-center justify-center">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                       </span>
                    ) : <Mic size={18} />}
                  </button>
                  <button 
                    onClick={() => transcript.trim() && processTranscript(transcript, false, true)}
                    disabled={!transcript.trim() || isProcessing}
                    className="w-10 h-10 flex items-center justify-center bg-[#10a37f] text-white rounded-full disabled:opacity-50 disabled:bg-gray-300 transition-colors hover:bg-[#0e906f]"
                  >
                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
                  </button>
                </div>
              </div>
              <p className="text-center text-xs text-gray-400 mt-3 hidden sm:block">AI processing can make mistakes. Check your cart before ordering.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

