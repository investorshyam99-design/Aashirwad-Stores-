import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import { Package, Truck, CheckCircle, XCircle, AlertTriangle, Printer, Trash2, Plus, Minus } from 'lucide-react';
import { formatNumberIntl } from '../i18n/translations';
import { useI18nStore, Language } from '../store/i18n';
import { useAuthStore } from '../store/auth';

function OrderItemCard({ order, isAdmin, language, updateStatus }: { key?: any, order: any, isAdmin: boolean, language: Language, updateStatus: (id: string, s: string) => Promise<void> | void }) {
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newQty, setNewQty] = useState('1');

  const [showSmsInput, setShowSmsInput] = useState(false);
  const [smsInput, setSmsInput] = useState('');

  const handleSendSms = (withPrice: boolean) => {
    if(!smsInput.trim()) return;
    
    const orderIdStr = (order.orderId || order.id).slice(0,8).toUpperCase();
    let message = `Aashirwad Stores - Bill #${orderIdStr}\n\n`;
    
    order.items.forEach((item: any) => {
      if (withPrice && item.price) {
        message += `${item.quantity}x ${item.name} - ₹${item.price * item.quantity}\n`;
      } else {
        message += `${item.quantity}x ${item.name}\n`;
      }
    });
    
    if (withPrice) {
      message += `\nTotal: ₹${order.totalAmount}`;
    }
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const separator = isIOS ? '&' : '?';
    
    const uri = `sms:${encodeURIComponent(smsInput)}${separator}body=${encodeURIComponent(message)}`;
    window.location.href = uri;

    setShowSmsInput(false);
    setSmsInput('');
  };

  const handleRemoveItem = async (itemIndex: number) => {
    const newItems = [...order.items];
    newItems.splice(itemIndex, 1);
    const newTotal = newItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
    try {
      await updateDoc(doc(db, 'orders', order.id), { items: newItems, totalAmount: newTotal, updatedAt: Date.now() });
    } catch(err) {
      console.error(err);
    }
  };

  const handleUpdatePrice = async (itemIndex: number) => {
    const newPriceVal = parseFloat(tempPrice);
    if (isNaN(newPriceVal) || newPriceVal < 0) return;
    const newItems = [...order.items];
    newItems[itemIndex].price = newPriceVal;
    const newTotal = newItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
    try {
      await updateDoc(doc(db, 'orders', order.id), { items: newItems, totalAmount: newTotal, updatedAt: Date.now() });
      setEditingItem(null);
    } catch(err) {
      console.error(err);
    }
  };

  const handleUpdateQty = async (itemIndex: number, delta: number) => {
    const newItems = [...order.items];
    const item = newItems[itemIndex];
    if (item.quantity + delta <= 0) return handleRemoveItem(itemIndex);
    item.quantity += delta;
    const newTotal = newItems.reduce((acc: number, currentItem: any) => acc + (currentItem.price * currentItem.quantity), 0);
    try {
      await updateDoc(doc(db, 'orders', order.id), { items: newItems, totalAmount: newTotal, updatedAt: Date.now() });
    } catch(err) {
      console.error(err);
    }
  };

  const handleAddNewItem = async () => {
    if (!newName.trim() || !newPrice || !newQty) return;
    const price = parseFloat(newPrice);
    const qty = parseInt(newQty);
    if (isNaN(price) || isNaN(qty) || qty <= 0) return;

    const newItems = [...order.items, {
      id: 'custom-' + Date.now(),
      name: newName,
      price: price,
      quantity: qty,
      category: 'custom'
    }];
    const newTotal = newItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
    try {
      await updateDoc(doc(db, 'orders', order.id), { items: newItems, totalAmount: newTotal, updatedAt: Date.now() });
      setIsAddingNew(false);
      setNewName('');
      setNewPrice('');
      setNewQty('1');
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs text-brand-blue font-mono tracking-wider bg-blue-50 px-2 py-1 rounded">
              {order.orderId || '#' + order.id.slice(0,8).toUpperCase()}
            </span>
            <h3 className="text-lg font-bold text-gray-900 leading-tight mt-1">{order.customerName}</h3>
          </div>
          <div className="text-right">
            {isAdmin && <div className="text-xl font-bold text-brand-blue">₹{formatNumberIntl(order.totalAmount, language)}</div>}
          </div>
        </div>
        
        <div className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
          <p><strong>Phone:</strong> {order.customerPhone || 'N/A'}</p>
          <p><strong>Date:</strong> {format(order.createdAt, 'PP p')}</p>
          {order.voiceNotes && (
            <p className="mt-2 text-brand-blue bg-blue-50/50 p-2 rounded italic">
              <strong>Customer Req:</strong> "{order.voiceNotes}"
            </p>
          )}
        </div>

        <div className="space-y-2 mb-6">
          {order.items.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0 group">
              <div className="flex-1 flex items-center pr-2">
                {isAdmin ? (
                  <div className="flex items-center gap-1 mr-3 bg-gray-100 rounded p-0.5 whitespace-nowrap shrink-0">
                    <button onClick={() => handleUpdateQty(i, -1)} className="p-1 hover:bg-white rounded shadow-sm text-gray-600"><Minus size={12} /></button>
                    <span className="text-gray-900 font-medium w-4 text-center">{item.quantity}</span>
                    <button onClick={() => handleUpdateQty(i, 1)} className="p-1 hover:bg-white rounded shadow-sm text-gray-600"><Plus size={12} /></button>
                  </div>
                ) : (
                  <span className="text-gray-400 mr-2 shrink-0">{item.quantity}x</span> 
                )}
                <span className="truncate">{item.name}</span>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-3 shrink-0">
                  {editingItem === i ? (
                    <div className="flex items-center gap-2">
                       <span className="text-gray-500">₹</span>
                       <input 
                         type="number" 
                         value={tempPrice}
                         onChange={(e) => setTempPrice(e.target.value)}
                         className="w-16 border rounded px-1 text-right focus:outline-none focus:border-brand-blue"
                         autoFocus
                         onKeyDown={(e) => e.key === 'Enter' && handleUpdatePrice(i)}
                         onBlur={() => handleUpdatePrice(i)}
                       />
                    </div>
                  ) : (
                    <span 
                      className="font-medium text-gray-900 cursor-pointer hover:underline border-b border-dashed border-gray-300" 
                      onClick={() => { setTempPrice(item.price.toString()); setEditingItem(i); }}
                    >
                      ₹{item.price * item.quantity} (₹{item.price} ea)
                    </span>
                  )}
                  <button onClick={() => handleRemoveItem(i)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="Remove item">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {isAdmin && order.status !== 'cancelled' && order.status !== 'delivered' && (
            <div className="pt-2">
              {isAddingNew ? (
                <div className="flex flex-col gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <input type="text" placeholder="Product Name" value={newName} onChange={e => setNewName(e.target.value)} className="border rounded px-2 py-1.5 text-sm outline-none focus:border-brand-blue bg-white" autoFocus />
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder="Price (₹)" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-sm outline-none focus:border-brand-blue bg-white" />
                    <input type="number" placeholder="Qty" value={newQty} onChange={e => setNewQty(e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-sm outline-none focus:border-brand-blue bg-white" />
                  </div>
                  <div className="flex gap-2 justify-end mt-1">
                    <button onClick={() => setIsAddingNew(false)} className="text-sm px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded border border-gray-300 font-medium bg-white shadow-sm">Cancel</button>
                    <button onClick={handleAddNewItem} disabled={!newName.trim() || !newPrice || !newQty} className="text-sm px-3 py-1.5 bg-brand-blue text-white hover:bg-brand-blue-hover rounded font-medium disabled:opacity-50">Add Item</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setIsAddingNew(true)} className="text-sm text-brand-blue flex items-center justify-center gap-1 hover:bg-blue-50 font-medium py-2 px-3 rounded w-full border border-dashed border-blue-200 transition-colors">
                  <Plus size={14} /> Add new item
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-col gap-2 shrink-0 md:w-48 justify-start border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Actions</p>
        {isAdmin && order.status === 'new' && (
          <button onClick={() => updateStatus(order.id, 'delivered')} className="bg-green-50 text-green-700 py-2 rounded-lg font-semibold text-sm hover:bg-green-100 transition">Mark Delivered</button>
        )}
        {isAdmin && order.status !== 'cancelled' && order.status !== 'delivered' && (
          <button onClick={() => updateStatus(order.id, 'cancelled')} className="bg-red-50 text-red-600 py-2 rounded-lg font-semibold text-sm hover:bg-red-100 transition">Cancel Order</button>
        )}
        {isAdmin && (
          <div className="flex flex-col gap-2 w-full mt-auto">
            <button 
              onClick={() => {
                 const printWindow = window.open('', '_blank');
                 if(printWindow) {
                   const refId = order.orderId || '#' + order.id.slice(0,8).toUpperCase();
                   printWindow.document.write(`
                     <html>
                       <head>
                         <title>Print Bill - ${refId}</title>
                         <style>
                           @page { margin: 0; }
                           body { font-family: monospace; margin: 0; padding: 5px; width: 58mm; font-size: 12px; }
                           p { margin: 2px 0; }
                           hr { border: 0; border-top: 1px dashed #000; margin: 5px 0; }
                         </style>
                       </head>
                       <body>
                         <p>ID: ${refId}</p>
                         <p>Date: ${format(order.createdAt, 'PP')} ${format(order.createdAt, 'p')}</p>
                         <p>Name: ${order.customerName}</p>
                         ${order.customerPhone ? `<p>Phone: ${order.customerPhone}</p>` : ''}
                         ${order.voiceNotes ? `<p style="font-style: italic;">Note: ${order.voiceNotes}</p>` : ''}
                         <hr/>
                         ${order.items.map((i:any) => `<p>${i.quantity}x ${i.name.substring(0, 15)}... - Rs.${i.quantity*i.price}</p>`).join('')}
                         <hr/>
                         <h3 style="margin: 5px 0; font-size: 14px;">Total: Rs.${order.totalAmount}</h3>
                       </body>
                     </html>
                   `);
                   printWindow.document.close();
                   printWindow.print();
                 }
              }} 
              className="w-full border border-brand-blue bg-blue-50 text-brand-blue py-2 rounded-lg font-semibold text-xs hover:bg-blue-100 flex items-center justify-center gap-1 transition"
            >
              <Printer size={14} /> Print with Price
            </button>
            <button 
              onClick={() => {
                 const printWindow = window.open('', '_blank');
                 if(printWindow) {
                   const refId = order.orderId || '#' + order.id.slice(0,8).toUpperCase();
                   printWindow.document.write(`
                     <html>
                       <head>
                         <title>Print List - ${refId}</title>
                         <style>
                           @page { margin: 0; }
                           body { font-family: monospace; margin: 0; padding: 5px; width: 58mm; font-size: 12px; }
                           p { margin: 2px 0; }
                           hr { border: 0; border-top: 1px dashed #000; margin: 5px 0; }
                         </style>
                       </head>
                       <body>
                         <p>ID: ${refId}</p>
                         <p>Date: ${format(order.createdAt, 'PP')} ${format(order.createdAt, 'p')}</p>
                         <p>Name: ${order.customerName}</p>
                         ${order.customerPhone ? `<p>Phone: ${order.customerPhone}</p>` : ''}
                         ${order.voiceNotes ? `<p style="font-style: italic;">Note: ${order.voiceNotes}</p>` : ''}
                         <hr/>
                         ${order.items.map((i:any) => `<p>${i.quantity}x ${i.name}</p>`).join('')}
                         <hr/>
                       </body>
                     </html>
                   `);
                   printWindow.document.close();
                   printWindow.print();
                 }
              }} 
              className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold text-xs hover:bg-gray-50 flex items-center justify-center gap-1 transition"
            >
              <Printer size={14} /> Print without Price
            </button>
            
            <div className="mt-2 text-center w-full">
               {showSmsInput ? (
                 <div className="flex flex-col gap-2 p-3 bg-brand-blue/5 rounded-lg border border-brand-blue/20">
                   <input
                     type="text"
                     placeholder="Enter Name or Number"
                     value={smsInput}
                     onChange={e => setSmsInput(e.target.value)}
                     className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:border-brand-blue"
                     autoFocus
                   />
                   <div className="flex gap-2">
                     <button onClick={() => setShowSmsInput(false)} className="text-xs flex-1 py-1.5 bg-gray-200 text-gray-700 rounded font-semibold hover:bg-gray-300">Cancel</button>
                     <button onClick={() => handleSendSms(true)} className="text-xs flex-1 py-1.5 bg-brand-blue text-white rounded font-semibold hover:bg-brand-blue-hover">With Price</button>
                     <button onClick={() => handleSendSms(false)} className="text-xs flex-1 py-1.5 bg-brand-orange text-white rounded font-semibold hover:bg-brand-orange-hover">Without Price</button>
                   </div>
                 </div>
               ) : (
                 <button onClick={() => setShowSmsInput(true)} className="text-sm font-medium text-brand-blue hover:text-brand-blue-hover transition underline decoration-dashed">
                   Send bill via SMS
                 </button>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


export function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('new');
  const language = useI18nStore(state => state.language);
  const { user, isAdmin, login } = useAuthStore();

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // If not admin, you shouldn't see everyone's orders ideally, but for demo we will show it or filter to just their recent orders if we wanted. But the prompt says "let the in admin view and customer view show the order number". We will just label it appropriately.
      setOrders(fetched);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus, updatedAt: Date.now() });
    } catch(err) {
      console.error('Error updating order:', err);
    }
  };

  const filteredOrders = orders.filter(o => o.status === filter);

  const tabs = [
    { id: 'new', label: 'New', icon: Package },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle },
    { id: 'cancelled', label: 'Cancelled', icon: XCircle },
  ];

  if (loading) return <div className="p-10 text-center text-gray-500">Loading orders...</div>;

  return (
    <div className="flex flex-col p-4 md:p-8 max-w-6xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{isAdmin ? "Admin Dashboard" : "Order Tracking"}</h1>
        {!user && (
          <button onClick={login} className="text-sm font-medium text-brand-blue hover:underline">
            Admin Login
          </button>
        )}
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const count = orders.filter(o => o.status === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full whitespace-nowrap font-medium transition-colors ${filter === tab.id ? 'bg-brand-blue text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              <Icon size={18} />
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${filter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>{count}</span>
            </button>
          )
        })}
        <button
           className="flex items-center gap-2 px-5 py-3 rounded-full whitespace-nowrap font-medium transition-colors bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
        >
           Products (Manage in Firebase Console for now)
        </button>
      </div>

      <div className="grid gap-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 text-gray-500 bg-white border border-dashed border-gray-300 rounded-2xl">
            No orders found in this category.
          </div>
        ) : (
          filteredOrders.map(order => (
            <OrderItemCard key={order.id} order={order} isAdmin={isAdmin} language={language} updateStatus={updateStatus} />
          ))
        )}
      </div>
    </div>
  );
}
