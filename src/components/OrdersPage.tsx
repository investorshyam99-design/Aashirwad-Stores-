import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import { Package, Truck, CheckCircle, XCircle, AlertTriangle, Printer, Trash2, Plus, Minus, ShoppingBag, Loader2, Store } from 'lucide-react';
import { formatNumberIntl } from '../i18n/translations';
import { useI18nStore, Language } from '../store/i18n';
import { useAuthStore, getGuestId } from '../store/auth';

const ADMIN_TABS = [
  { id: 'Order Received', label: 'New', icon: Package },
  { id: 'Preparing Order', label: 'Preparing', icon: Loader2 },
  { id: 'Ready For Pickup', label: 'Ready', icon: ShoppingBag },
  { id: 'Completed', label: 'Completed', icon: CheckCircle },
  { id: 'Cancelled', label: 'Cancelled', icon: XCircle },
  { id: 'Fake', label: 'Fake Orders', icon: AlertTriangle }
];

const CUSTOMER_STATUSES = [
  'Order Received',
  'Preparing Order',
  'Ready For Pickup',
  'Completed',
  'Cancelled'
];

function CustomerOrderItemCard({ order, language }: { key?: React.Key | null, order: any, language: Language }) {
  const currentStatusIndex = Math.max(0, CUSTOMER_STATUSES.indexOf(order.status));
  const isCancelled = order.status === 'Cancelled';

  return (
    <div className="bg-white p-5 md:p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-50 pb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 leading-tight">Order #{order.orderId || order.id.slice(0,8).toUpperCase()}</h3>
          <p className="text-sm text-gray-500 mt-1">Placed on {format(order.createdAt, 'PP p')}</p>
        </div>
        <div className="text-right flex flex-col items-start md:items-end w-full md:w-auto">
          <div className={`mt-1 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider inline-flex ${isCancelled ? 'bg-red-50 text-red-600' : 'bg-brand-blue/10 text-brand-blue'}`}>
            {order.status}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <h4 className="font-semibold text-gray-800 text-sm tracking-wide uppercase">Items</h4>
          {(order.items || []).map((item: any, i: number) => (
            <div key={i} className="flex flex-row items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100/50">
              <div className="flex-1 min-w-0">
                <h5 className="font-medium text-gray-900 truncate">{item.name}</h5>
                <p className="text-sm text-gray-500 mt-0.5">Qty: {item.quantity}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-[#f8faff] border border-blue-100 p-5 rounded-xl">
            <div className="flex items-center gap-3 text-brand-blue mb-3">
              <Store size={20} />
              <h4 className="font-semibold tracking-wide">Store Pickup</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">Please visit the store to collect your order.</p>
            
            <div className="space-y-4">
              {CUSTOMER_STATUSES.slice(0, 4).map((status, index) => {
                const isActive = index <= currentStatusIndex && !isCancelled;
                const isCurrent = index === currentStatusIndex && !isCancelled;
                return (
                 <div key={status} className="flex relative">
                   {index < 3 && (
                     <div className={`absolute top-6 left-2.5 w-0.5 h-full -translate-x-1/2 ${isActive ? 'bg-brand-blue' : 'bg-gray-200'}`} />
                   )}
                   <div className={`w-5 h-5 rounded-full shrink-0 mt-0.5 z-10 flex items-center justify-center ${isActive ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/30' : 'bg-gray-200'} `}>
                     {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                   </div>
                   <div className="ml-4 flex-1">
                     <p className={`text-sm ${isCurrent ? 'font-bold text-gray-900' : isActive ? 'font-medium text-gray-800' : 'text-gray-400'}`}>{status}</p>
                     {isCurrent && <p className="text-xs text-brand-blue mt-0.5">Current status</p>}
                   </div>
                 </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminOrderItemCard({ order, language, updateStatus }: { key?: React.Key | null, order: any, language: Language, updateStatus: (id: string, s: string) => Promise<void> | void }) {
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
    
    (order.items || []).forEach((item: any) => {
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
            <span className="text-xs text-brand-blue font-mono tracking-wider bg-blue-50 px-2 py-1 rounded inline-block mb-1">
              {order.orderId || '#' + order.id.slice(0,8).toUpperCase()}
            </span>
            <h3 className="text-lg font-bold text-gray-900 leading-tight flex items-center gap-2">
              {order.customerName}
            </h3>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-brand-blue">₹{formatNumberIntl(order.totalAmount, language)}</div>
            <div className="text-xs text-gray-400 mt-1">{order.status}</div>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
          <p><strong>Phone:</strong> {order.customerPhone || 'N/A'} - <strong>User ID:</strong> {order.userId || 'Guest'}</p>
          <p><strong>Date:</strong> {format(order.createdAt, 'PP p')}</p>
        </div>

        <div className="space-y-2 mb-6">
          {(order.items || []).map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0 group">
              <div className="flex-1 flex items-center pr-2">
                <div className="flex items-center gap-1 mr-3 bg-gray-100 rounded p-0.5 whitespace-nowrap shrink-0">
                  <button onClick={() => handleUpdateQty(i, -1)} className="p-1 hover:bg-white rounded shadow-sm text-gray-600"><Minus size={12} /></button>
                  <span className="text-gray-900 font-medium w-4 text-center">{item.quantity}</span>
                  <button onClick={() => handleUpdateQty(i, 1)} className="p-1 hover:bg-white rounded shadow-sm text-gray-600"><Plus size={12} /></button>
                </div>
                <span className="truncate">{item.name}</span>
              </div>
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
            </div>
          ))}
          {order.status !== 'Cancelled' && order.status !== 'Completed' && (
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
      
      <div className="flex flex-col gap-2 shrink-0 md:w-48 justify-start border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 relative">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Change Status</p>
        
        <select 
          className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-sm font-medium focus:outline-none focus:border-brand-blue"
          value={order.status}
          onChange={(e) => updateStatus(order.id, e.target.value)}
        >
          {ADMIN_TABS.map(tab => (
            <option key={tab.id} value={tab.id}>{tab.label}</option>
          ))}
        </select>

        <div className="flex flex-col gap-2 w-full mt-auto pt-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Print Bill</p>
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
            <Printer size={14} /> Print with Amount
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
            <Printer size={14} /> Print without Amount
          </button>
          
          <div className="mt-2 text-center w-full">
             {showSmsInput ? (
               <div className="flex flex-col gap-2 p-3 bg-brand-blue/5 rounded-lg border border-brand-blue/20">
                 <input
                   type="text"
                   placeholder="Enter Number"
                   value={smsInput}
                   onChange={e => setSmsInput(e.target.value)}
                   className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:border-brand-blue"
                   autoFocus
                 />
                 <div className="flex gap-2">
                   <button onClick={() => setShowSmsInput(false)} className="text-xs flex-1 py-1.5 bg-gray-200 text-gray-700 rounded font-semibold hover:bg-gray-300">Cancel</button>
                   <button onClick={() => handleSendSms(true)} className="text-xs flex-1 py-1.5 bg-brand-blue text-white rounded font-semibold hover:bg-brand-blue-hover">Price</button>
                   <button onClick={() => handleSendSms(false)} className="text-xs flex-1 py-1.5 bg-brand-orange text-white rounded font-semibold hover:bg-brand-orange-hover">No Price</button>
                 </div>
               </div>
             ) : (
               <button onClick={() => setShowSmsInput(true)} className="text-sm font-medium text-brand-blue hover:text-brand-blue-hover transition underline decoration-dashed">
                 Send bill via SMS
               </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Order Received');
  const [searchQuery, setSearchQuery] = useState('');
  const language = useI18nStore(state => state.language);
  const { user, isAdmin, login, isInitializing } = useAuthStore();

  useEffect(() => {
    if (isInitializing) return;

    if (!isAdmin) {
      // Don't wait for user if not admin. Just fetch by user?.uid or guestId
    }

    let q;
    if (isAdmin) {
      q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'orders'), where('userId', '==', user?.uid || getGuestId())); // Removed orderBy to prevent index errors
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (!isAdmin) {
        fetched.sort((a: any, b: any) => b.createdAt - a.createdAt); // Client-side sort
      }
      setOrders(fetched);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isAdmin, user, isInitializing]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus, updatedAt: Date.now() });
    } catch(err) {
      console.error('Error updating order:', err);
    }
  };

  if (isInitializing) {
    return <div className="p-10 flex text-center justify-center text-gray-500"><Loader2 className="animate-spin text-brand-blue" size={32} /></div>;
  }

  const filteredOrders = isAdmin 
    ? orders.filter(o => {
        if (o.status !== filter) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          o.customerName?.toLowerCase().includes(q) ||
          o.orderId?.toLowerCase().includes(q) ||
          o.customerPhone?.toLowerCase().includes(q)
        );
      }) 
    : orders;

  return (
    <div className="flex flex-col p-4 md:p-8 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-900">{isAdmin ? "Admin Dashboard" : "My Orders"}</h1>
        {isAdmin && (
          <input
            type="text"
            placeholder="Search name, phone, or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm w-full md:w-64 focus:outline-none focus:border-brand-blue"
          />
        )}
      </div>
      
      {isAdmin && (
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar shrink-0">
          {ADMIN_TABS.map(tab => {
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
        </div>
      )}

      <div className="grid gap-6">
        {!isAdmin && orders.length === 0 && !loading && (
          <div className="text-center py-20 bg-white border border-dashed border-gray-300 rounded-2xl">
            <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Orders Yet</h3>
            <p className="text-gray-500">You haven't placed any orders. Chat with our AI to build your cart!</p>
          </div>
        )}
        
        {isAdmin && filteredOrders.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-500 bg-white border border-dashed border-gray-300 rounded-2xl">
            No orders found in this category.
          </div>
        )}

        {filteredOrders.map(order => (
          isAdmin 
            ? <AdminOrderItemCard key={order.id} order={order} language={language} updateStatus={updateStatus} />
            : <CustomerOrderItemCard key={order.id} order={order} language={language} />
        ))}
      </div>
    </div>
  );
}
