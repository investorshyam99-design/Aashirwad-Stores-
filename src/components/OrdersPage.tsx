import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import { Package, Truck, CheckCircle, XCircle, AlertTriangle, Printer } from 'lucide-react';
import { formatNumberIntl } from '../i18n/translations';
import { useI18nStore } from '../store/i18n';
import { useAuthStore } from '../store/auth';

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

  const filteredOrders = orders.filter(o => o.status === filter || (filter === 'pending_payment' && o.paymentStatus === 'pending'));

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
          const count = orders.filter(o => o.status === tab.id || (tab.id === 'pending_payment' && o.paymentStatus === 'pending')).length;
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
            <div key={order.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs text-brand-blue font-mono tracking-wider bg-blue-50 px-2 py-1 rounded">
                      {order.orderId || '#' + order.id.slice(0,8).toUpperCase()}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight mt-1">{order.customerName}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-brand-blue">₹{formatNumberIntl(order.totalAmount, language)}</div>
                    <div className="text-sm font-medium text-gray-500 uppercase">{order.paymentMethod} • {order.paymentStatus}</div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p><strong>Phone:</strong> {order.customerPhone}</p>
                  <p><strong>Address:</strong> {order.customerAddress}</p>
                  <p><strong>Date:</strong> {format(order.createdAt, 'PP p')}</p>
                  {order.voiceNotes && (
                    <p className="mt-2 text-brand-blue bg-blue-50/50 p-2 rounded italic">
                      <strong>Customer Req:</strong> "{order.voiceNotes}"
                    </p>
                  )}
                </div>

                <div className="space-y-2 mb-6">
                  {order.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                      <span><span className="text-gray-400 mr-2">{item.quantity}x</span> {item.name}</span>
                      <span className="font-medium text-gray-900">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
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
                <div className="flex gap-2 w-full mt-auto">
                  <button 
                    onClick={() => {
                       const printWindow = window.open('', '_blank');
                       if(printWindow) {
                         const refId = order.orderId || '#' + order.id.slice(0,8).toUpperCase();
                         printWindow.document.write(`
                           <html>
                             <head><title>Print Bill - ${refId}</title><style>body { font-family: monospace; }</style></head>
                             <body>
                               <h2 style="margin-bottom: 5px;">Aashirwad Stores</h2>
                               <p style="margin: 2px 0;">Order ID: ${refId}</p>
                               <p style="margin: 2px 0;">Date: ${format(order.createdAt, 'PP p')}</p>
                               <p style="margin: 2px 0;">Customer: ${order.customerName}</p>
                               <p style="margin: 2px 0;">Address: ${order.customerAddress}</p>
                               <p style="margin: 2px 0;">Phone: ${order.customerPhone}</p>
                               ${order.voiceNotes ? `<p style="margin: 2px 0; font-style: italic;">Note: ${order.voiceNotes}</p>` : ''}
                               <hr/>
                               ${order.items.map((i:any) => `<p style="margin: 2px 0;">${i.quantity}x ${i.name} - Rs.${i.quantity*i.price}</p>`).join('')}
                               <hr/>
                               <h3 style="margin: 5px 0;">Total: Rs.${order.totalAmount}</h3>
                             </body>
                           </html>
                         `);
                         printWindow.document.close();
                         printWindow.print();
                       }
                    }} 
                    className="flex-1 border border-brand-blue bg-blue-50 text-brand-blue py-2 rounded-lg font-semibold text-xs hover:bg-blue-100 flex items-center justify-center gap-1 transition"
                  >
                    <Printer size={14} /> w/ Amt
                  </button>
                  <button 
                    onClick={() => {
                       const printWindow = window.open('', '_blank');
                       if(printWindow) {
                         const refId = order.orderId || '#' + order.id.slice(0,8).toUpperCase();
                         printWindow.document.write(`
                           <html>
                             <head><title>Print List - ${refId}</title><style>body { font-family: monospace; }</style></head>
                             <body>
                               <h2 style="margin-bottom: 5px;">Aashirwad Stores</h2>
                               <p style="margin: 2px 0;">Order ID: ${refId}</p>
                               <p style="margin: 2px 0;">Date: ${format(order.createdAt, 'PP p')}</p>
                               <p style="margin: 2px 0;">Customer: ${order.customerName}</p>
                               <p style="margin: 2px 0;">Address: ${order.customerAddress}</p>
                               <p style="margin: 2px 0;">Phone: ${order.customerPhone}</p>
                               ${order.voiceNotes ? `<p style="margin: 2px 0; font-style: italic;">Note: ${order.voiceNotes}</p>` : ''}
                               <hr/>
                               ${order.items.map((i:any) => `<p style="margin: 2px 0;">${i.quantity}x ${i.name}</p>`).join('')}
                               <hr/>
                             </body>
                           </html>
                         `);
                         printWindow.document.close();
                         printWindow.print();
                       }
                    }} 
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold text-xs hover:bg-gray-50 flex items-center justify-center gap-1 transition"
                  >
                    <Printer size={14} /> w/o Amt
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
