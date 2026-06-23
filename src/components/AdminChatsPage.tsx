import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/auth';
import { format } from 'date-fns';
import { MessageSquare, Bot, User, Loader2, Send } from 'lucide-react';

export function AdminChatsPage() {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  
  const { user, isAdmin } = useAuthStore();

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'chats'), orderBy('lastUpdated', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChats(fetched);
      if (selectedChat) {
         const updatedCurrent = fetched.find(c => c.id === selectedChat.id);
         if (updatedCurrent) setSelectedChat(updatedCurrent);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedChat) return;
    
    try {
      const msg = { role: 'admin', text: replyText, timestamp: Date.now() };
      await updateDoc(doc(db, 'chats', selectedChat.id), {
        messages: arrayUnion(msg),
        lastUpdated: Date.now()
      });
      setReplyText('');
    } catch (e) {
      console.error(e);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center mt-20">
        <h2 className="text-xl font-bold text-gray-800">Admin Only</h2>
        <p className="text-gray-500">You must be an admin to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#10a37f]" size={32} /></div>;
  }

  return (
    <div className="flex flex-col md:flex-row h-[100vh] pt-[60px] pb-16 md:pb-0 bg-white">
      {/* Sidebar with Chat List */}
      <div className={`w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="text-[#10a37f]" /> All Chats
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <p className="p-4 text-gray-500 text-center">No active chats.</p>
          ) : (
            chats.map((c) => (
              <div 
                key={c.id} 
                onClick={() => setSelectedChat(c)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${selectedChat?.id === c.id ? 'bg-[#10a37f]/5 border-l-4 border-l-[#10a37f]' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-900 truncate pr-2">
                     {c.customerEmail || c.userId.substring(0, 8)}
                  </h3>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                     {c.lastUpdated ? format(c.lastUpdated, 'p') : ''}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {c.messages && c.messages.length > 0 ? c.messages[c.messages.length-1].text : 'No messages'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col h-full bg-[#f9f9f9]">
          <div className="bg-white p-4 border-b border-gray-200 flex items-center shadow-sm">
            <button onClick={() => setSelectedChat(null)} className="md:hidden mr-3 text-gray-500 font-bold">← Back</button>
            <div>
               <h3 className="font-bold text-gray-900">Chat with {selectedChat.customerEmail || selectedChat.userId.substring(0, 8)}</h3>
               <p className="text-xs text-gray-500">Started exactly on {selectedChat.startedAt ? format(selectedChat.startedAt, 'PP p') : 'Unknown Date'}</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
             {selectedChat.messages?.map((msg: any, i: number) => (
               <div key={i} className={`flex w-full ${msg.role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${msg.role === 'admin' ? 'flex-row-reverse' : 'flex-row'}`}>
                   <div className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full mt-1 text-white ${
                     msg.role === 'user' ? 'bg-gray-800' : msg.role === 'admin' ? 'bg-brand-blue' : 'bg-[#10a37f]'
                   }`}>
                     {msg.role === 'user' ? <User size={16} /> : msg.role === 'admin' ? <span className="text-xs font-bold">A</span> : <Bot size={16} />}
                   </div>
                   <div>
                     <div className="mb-1 text-[10px] text-gray-400 uppercase font-semibold mx-1 text-left">
                       {msg.role === 'admin' ? 'Shop Admin' : msg.role === 'user' ? 'Customer' : 'AI Assistant'}
                     </div>
                     <div className={`py-3 px-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                       msg.role === 'admin' 
                         ? 'bg-brand-blue text-white rounded-tr-sm' 
                         : msg.role === 'user'
                           ? 'bg-gray-800 text-white rounded-tl-sm'
                           : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                     }`}>
                       {msg.text}
                     </div>
                   </div>
                 </div>
               </div>
             ))}
          </div>

          <div className="bg-white p-4 md:p-6 border-t border-gray-200">
             <div className="flex gap-2">
               <input 
                 type="text" 
                 value={replyText}
                 onChange={(e) => setReplyText(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                 placeholder="Type message to override AI and reply manually..."
                 className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-3 focus:outline-none focus:border-[#10a37f] text-sm"
               />
               <button 
                 onClick={handleSendReply}
                 disabled={!replyText.trim()}
                 className="bg-[#10a37f] text-white p-3 rounded-full hover:bg-[#0e906f] transition-colors disabled:opacity-50"
               >
                 <Send size={20} />
               </button>
             </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#f9f9f9]">
           <div className="text-center text-gray-400">
             <MessageSquare size={64} className="mx-auto mb-4 opacity-50" />
             <h3 className="text-xl font-medium">Select a conversation</h3>
             <p className="mt-2 text-sm">Monitor AI interactions and step in if needed.</p>
           </div>
        </div>
      )}
    </div>
  );
}
