import React, { useState, useEffect, useRef } from 'react';
import { Mic, X, Sparkles, Loader2, StopCircle } from 'lucide-react';
import { useCartStore } from '../store/cart';
import { useProductsStore } from '../store/products';

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
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Refs for callbacks
  const transcriptRef = useRef('');
  const isProcessingRef = useRef(false);
  const isOpenRef = useRef(false);
  const messagesRef = useRef<{ role: 'user' | 'assistant', text: string }[]>([]);
  
  const { products } = useProductsStore();
  const { addItem, items, setCartOpen, clearCart } = useCartStore();
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
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, transcript, isProcessing]);

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

      recognition.onend = () => {
        setIsListening(false);
        // User stopped speaking (silence detected by native API)
        if (transcriptRef.current.trim() && !isProcessingRef.current) {
          processTranscript(transcriptRef.current);
        } else if (isOpenRef.current && !isProcessingRef.current) {
          // Restart if they stayed silent but modal is open and we aren't processing
          startRecognition();
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error === 'no-speech' && isOpenRef.current && !isProcessingRef.current) {
          startRecognition();
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startRecognition = () => {
    if (recognitionRef.current && isOpenRef.current && !isProcessingRef.current) {
      try {
        setTranscript('');
        transcriptRef.current = '';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Start recognition error:", e);
      }
    }
  };

  const speak = (text: string) => {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const indianVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN')) || voices[0];
        if (indianVoice) utterance.voice = indianVoice;
        utterance.rate = 1.0;
        utterance.pitch = 1.1; // slightly more friendly
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

  const placeOrderWithoutSpeak = async (customerName?: string) => {
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
        customerName: customerName || 'Voice Assistant Guest',
        customerPhone: 'N/A',
        customerAddress: 'Voice Order',
        voiceNotes: userRequests || '',
        items: currentItems.map((i: any) => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price, image: i.image })),
        totalAmount: currentItems.reduce((acc: number, curr: any) => acc + ((curr.price || 0) * curr.quantity), 0),
        status: 'new',
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

  const processTranscript = async (text: string) => {
    if (!text.trim()) return;
    
    // Manual stop commands
    const lowerText = text.toLowerCase();
    if (lowerText.includes('stop') || lowerText.includes('order complete') || lowerText.includes('bas')) {
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
    
    const newHistory = [...messagesRef.current, { role: 'user' as const, text }];
    setMessages(newHistory);
    messagesRef.current = newHistory;

    try {
      const simplifiedProducts = products.map(p => ({ id: p.id, name: p.name, price: p.price, unit: p.unit }));
      const response = await fetch('/api/gemini/parse-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, products: simplifiedProducts, history: messagesRef.current, cart: itemsRef.current }),
      });
      
      let data;
      if (!response.ok) {
        try {
          const errData = await response.json();
          throw new Error(errData.error || `HTTP error! status: ${response.status}`);
        } catch(e: any) {
          throw new Error(e.message || `HTTP error! status: ${response.status}`);
        }
      } else {
        data = await response.json();
      }
      
      let voiceReply = data.reply;

      if (data.cartUpdates && Array.isArray(data.cartUpdates)) {
        for (const item of data.cartUpdates) {
          const p = products.find(prod => prod.id === item.id);
          if (p) {
            addItem(p, item.quantity || 1);
          } else if (item.name) {
            const customProduct = {
               id: item.id || `custom-${Date.now()}-${Math.random()}`,
               name: item.name,
               price: item.price || 50,
               mrp: item.price || 50,
               description: 'Custom item',
               image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=200&auto=format&fit=crop'
            };
            addItem(customProduct, item.quantity || 1);
          }
        }
      }

      if (data.action === 'place_order') {
         voiceReply = "Aapka order successfully place ho gaya hai. Dhanyawad!";
         await placeOrderWithoutSpeak(data.customerName);
      }

      const updatedHistory = [...messagesRef.current, { role: 'assistant' as const, text: voiceReply }];
      setMessages(updatedHistory);
      messagesRef.current = updatedHistory;
      
      if (voiceReply) {
        await speak(voiceReply);
      }

      if (data.action === 'place_order') {
         setTimeout(() => { 
           setIsOpen(false); 
           import('../store/ui').then(({ useUIStore }) => {
             useUIStore.getState().setActiveTab('orders');
           });
         }, 2000);
         return; // don't resume
      }
      
    } catch (error: any) {
       console.error("Smart ordering error", error);
       let errReply = "Sorry, network issue hai.";
       if (error.message?.includes('AI assistant limit reached')) {
         errReply = "AI assistant quota exceeded. API calls limited for now.";
       }
       setMessages(prev => [...prev, { role: 'assistant', text: errReply }]);
       messagesRef.current = [...messagesRef.current, { role: 'assistant', text: errReply }];
       await speak(errReply);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
      
      // Resume listening
      if (isOpenRef.current) {
         startRecognition();
      }
    }
  };

  return (
    <>
      <button 
        onClick={() => {
          setIsOpen(true);
          if (messages.length === 0) {
            const welcomeText = "Aapko kya chahiye?";
            setMessages([{ role: 'assistant', text: welcomeText }]);
            speak(welcomeText);
          }
        }}
        className="fixed bottom-24 md:bottom-10 right-4 md:right-10 z-[60] bg-brand-blue text-white p-4 rounded-full shadow-lg hover:bg-brand-blue-hover transition-transform hover:scale-105 flex items-center justify-center animate-bounce-slow"
      >
        <Sparkles size={28} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-0 animate-in fade-in">
          <div className="bg-white w-full sm:w-[450px] rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom flex flex-col max-h-[90vh]">
            <button 
              onClick={() => {
                setIsOpen(false);
                window.speechSynthesis.cancel();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1"
            >
              <X size={24} />
            </button>

            <div className="flex-1 overflow-y-auto mt-6 mb-4 space-y-3 min-h-[150px] px-2 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm md:text-base ${
                    msg.role === 'user' 
                      ? 'bg-brand-blue text-white rounded-tr-sm shadow-sm' 
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isListening && transcript && (
                <div className="flex w-full justify-end">
                  <div className="px-4 py-3 rounded-2xl max-w-[85%] text-sm md:text-base bg-blue-50 text-brand-blue border border-blue-100 rounded-tr-sm shadow-sm opacity-70 italic">
                    {transcript}
                  </div>
                </div>
              )}
              {isProcessing && (
                <div className="flex w-full justify-start">
                  <div className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-800 rounded-tl-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 flex flex-col items-center border-t border-gray-100 pt-6">
              <div 
                onClick={toggleListening}
                className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
                  isListening 
                    ? 'bg-brand-blue text-white scale-110 shadow-[0_0_40px_rgba(37,99,235,0.4)]' 
                    : 'bg-blue-50 text-brand-blue hover:bg-blue-100'
                }`}
              >
                {isProcessing ? (
                  <Loader2 size={36} className="animate-spin" />
                ) : isListening ? (
                  <div className="flex gap-1 items-center justify-center h-full">
                    <div className="w-1.5 h-6 bg-white rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-10 bg-white rounded-full animate-pulse delay-75"></div>
                    <div className="w-1.5 h-4 bg-white rounded-full animate-pulse delay-150"></div>
                  </div>
                ) : (
                  <Mic size={36} />
                )}
              </div>
              <p className="text-sm font-medium text-gray-500 mt-4 mb-4">
                {isProcessing ? 'Thinking...' : isListening ? 'Listening...' : 'Tap to speak'}
              </p>

              {!isListening && !isProcessing && (
                <div className="w-full flex items-center gap-2 bg-gray-50 rounded-full p-1 border border-gray-200 focus-within:border-brand-blue focus-within:bg-white transition-colors">
                  <input
                    type="text"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-transparent px-4 py-3 outline-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && transcript.trim()) {
                        processTranscript(transcript);
                      }
                    }}
                  />
                  <button 
                    onClick={() => processTranscript(transcript)}
                    disabled={!transcript.trim()}
                    className="p-3 bg-brand-blue text-white rounded-full disabled:opacity-50 transition-opacity"
                  >
                    <Sparkles size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
