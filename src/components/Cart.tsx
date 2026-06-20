import React, { useState, useEffect } from 'react';
import { useCartStore } from '../store/cart';
import { useI18nStore } from '../store/i18n';
import { useAuthStore } from '../store/auth';
import { getTranslation, formatNumberIntl } from '../i18n/translations';
import { X, ShoppingBag, Printer, MessageSquare, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Cart() {
  const { items, isCartOpen, setCartOpen, removeItem, updateQuantity, updatePrice, totalItems } = useCartStore();
  const language = useI18nStore(state => state.language);
  const isAdmin = useAuthStore(state => state.isAdmin);
  const [showContacts, setShowContacts] = useState(false);
  
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [tempQty, setTempQty] = useState('');

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState('');

  const [checkoutAction, setCheckoutAction] = useState<'none' | 'sms' | 'print'>('none');
  const [adminInputValue, setAdminInputValue] = useState('');
  const [printCustomerName, setPrintCustomerName] = useState('');

  // Setup print styles dynamically to hide everything else
  useEffect(() => {
    if (checkoutAction === 'print' && printCustomerName) {
      const style = document.createElement('style');
      style.innerHTML = `
        @media print {
          body * { visibility: hidden; }
          #print-bill, #print-bill * { visibility: visible; }
          #print-bill { 
            display: block !important;
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            border: none; 
            padding: 20px; 
            box-shadow: none; 
          }
        }
      `;
      document.head.appendChild(style);
      
      // Delay slightly to let styles apply
      const timer = setTimeout(() => {
        window.print();
        setCheckoutAction('none');
        setPrintCustomerName('');
        setAdminInputValue('');
      }, 300);

      return () => {
        clearTimeout(timer);
        document.head.removeChild(style);
      };
    }
  }, [checkoutAction, printCustomerName]);

  const handleWhatsAppCheckout = (phone: string) => {
    if (items.length === 0) return;
    
    const itemList = items.map((item, index) => {
      const formattedIndex = formatNumberIntl(index + 1, language);
      const qtyText = formatNumberIntl(item.quantity, language);
      return `${formattedIndex}. ${item.name}%0A   x  ${qtyText}`;
    }).join('%0A%0A');
    
    const message = `${getTranslation(language, 'orderMessage')}%0A%0A${itemList}`;
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
    setShowContacts(false);
  };

  const handleSmsSend = () => {
    if (!adminInputValue) return;
    const itemList = items.map((item, index) => {
      const priceText = item.price ? `Rs.${item.price.toFixed(2)} ` : '';
      return `${index + 1}. ${item.name}\n${priceText}x ${item.quantity}`;
    }).join('\n');
    
    const message = `Bill:\n${itemList}\nTotal: Rs.${totalPrice}`;
    window.open(`sms:${adminInputValue}?body=${encodeURIComponent(message)}`, '_self');
    setCheckoutAction('none');
    setAdminInputValue('');
  };

  const handleQtyInputBlur = (itemId: string) => {
    setEditingQtyId(null);
    const parsed = parseInt(tempQty, 10);
    if (!isNaN(parsed) && parsed > 0) {
      updateQuantity(itemId, parsed);
    } else if (parsed === 0) {
      removeItem(itemId);
    }
  };

  const handleQtyInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, itemId: string) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handlePriceInputBlur = (itemId: string) => {
    setEditingPriceId(null);
    const parsed = parseFloat(tempPrice);
    if (!isNaN(parsed) && parsed >= 0) {
      updatePrice(itemId, parsed);
    }
  };

  const handlePriceInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, itemId: string) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const totalPrice = items.reduce((total, item) => total + (item.price || 0) * item.quantity, 0).toFixed(2);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <motion.div 
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[100] bg-gray-50 flex flex-col overflow-hidden"
        >
          {/* Print Template */}
          <div id="print-bill" className="hidden">
            <div className="flex justify-between items-end border-b pb-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold">Aashirvaad Stores</h1>
                <p className="text-gray-600 mt-1">Customer: <span className="font-semibold text-black">{printCustomerName}</span></p>
              </div>
              <p className="text-gray-500 text-sm">{new Date().toLocaleDateString()}</p>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-3 text-sm">{item.name}</td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right">₹{item.price?.toFixed(2) || '0.00'}</td>
                    <td className="py-3 text-right">₹{((item.price || 0) * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-6">
              <div className="text-xl font-bold">Grand Total: ₹{totalPrice}</div>
            </div>
          </div>

          {/* Header */}
          <div className="h-14 bg-white flex items-center px-4 border-b border-gray-100 shrink-0 shadow-sm print:hidden">
            <button 
              onClick={() => setCartOpen(false)}
              className="p-2 -ml-2 text-gray-600 hover:text-black hover:bg-gray-50 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <div className="ml-3 font-medium text-black">{getTranslation(language, 'cart')}</div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto pb-40 print:hidden">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white mt-2">
                <ShoppingBag size={64} className="mb-4 opacity-20" />
                <p className="text-lg text-gray-500 font-medium">{getTranslation(language, 'emptyCart')}</p>
                <p className="text-sm text-gray-400 mt-2">{getTranslation(language, 'addItemsToCart')}</p>
                <button 
                  onClick={() => setCartOpen(false)}
                  className="mt-6 px-10 py-3 bg-brand-blue text-white rounded-sm font-medium shadow-sm hover:shadow-md transition-shadow"
                >
                  {getTranslation(language, 'continueShopping')}
                </button>
              </div>
            ) : (
              <div className="bg-white mt-2 shadow-sm">
                {items.map((item, index) => (
                  <div key={item.id} className={cn("p-4 flex gap-4", index !== items.length - 1 && "border-b border-gray-100")}>
                    <div className="flex flex-col flex-1">
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-black font-medium pr-2">{item.name}</span>
                        {isAdmin && item.price !== undefined && (
                          <div className="flex flex-col items-end shrink-0 pl-2">
                            {editingPriceId === item.id ? (
                              <div className="flex items-center text-sm font-semibold text-gray-900 border-b border-gray-400">
                                <span className="mr-0.5">₹</span>
                                <input 
                                  type="number" 
                                  min="0"
                                  step="any"
                                  autoFocus
                                  value={tempPrice}
                                  onChange={(e) => setTempPrice(e.target.value)}
                                  onBlur={() => handlePriceInputBlur(item.id)}
                                  onKeyDown={(e) => handlePriceInputKeyDown(e, item.id)}
                                  className="w-12 text-right bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            ) : (
                              <span 
                                onClick={() => {
                                  setTempPrice(item.price ? item.price.toString() : '0');
                                  setEditingPriceId(item.id);
                                }}
                                className="cursor-pointer text-sm font-semibold text-gray-900 border-b border-transparent hover:border-gray-400"
                              >
                                ₹{formatNumberIntl((item.price || 0).toFixed(2), language)} (ea)
                              </span>
                            )}
                            <span className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
                              Total: ₹{formatNumberIntl(((item.price || 0) * item.quantity).toFixed(2), language)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex items-center gap-4">
                        <div className="flex items-center border border-gray-200 rounded-sm bg-white shrink-0">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white text-black hover:bg-gray-50 transition-colors border-r border-gray-200 text-lg"
                            disabled={item.quantity <= 1}
                          >
                            -
                          </button>
                          
                          {editingQtyId === item.id ? (
                            <input
                              type="number"
                              min="0"
                              autoFocus
                              value={tempQty}
                              onChange={(e) => setTempQty(e.target.value)}
                              onBlur={() => handleQtyInputBlur(item.id)}
                              onKeyDown={(e) => handleQtyInputKeyDown(e, item.id)}
                              className="w-10 text-center text-sm font-medium text-black bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          ) : (
                            <span 
                              onClick={() => {
                                setTempQty(item.quantity.toString());
                                setEditingQtyId(item.id);
                              }}
                              className="text-sm font-medium w-10 text-center cursor-pointer"
                            >
                              {formatNumberIntl(item.quantity, language)}
                            </span>
                          )}

                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white text-black hover:bg-gray-50 transition-colors border-l border-gray-200 text-lg"
                          >
                            +
                          </button>
                        </div>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-sm font-medium text-black hover:text-red-500 transition-colors ml-auto px-4 py-2 hover:bg-red-50 rounded-sm"
                        >
                          {getTranslation(language, 'remove')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Fixed Action Bar */}
          {items.length > 0 && (
            <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 drop-shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-10 flex flex-col justify-center min-h-[5rem] print:hidden">
              <div className="flex justify-between items-center w-full mb-3">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500 font-medium">{formatNumberIntl(items.length, language)} {getTranslation(language, 'items')}</span>
                  {isAdmin && (
                    <span className="text-lg font-bold text-black">
                      ₹{formatNumberIntl(totalPrice, language)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="w-full">
                {isAdmin ? (
                  checkoutAction === 'sms' ? (
                    <div className="flex gap-2 w-full animate-in fade-in slide-in-from-bottom-2">
                      <input 
                        type="tel" 
                        value={adminInputValue} 
                        onChange={e => setAdminInputValue(e.target.value)}
                        placeholder="Phone Number" 
                        className="flex-1 bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-sm outline-none focus:border-brand-blue"
                        autoFocus
                      />
                      <button 
                        onClick={handleSmsSend}
                        className="bg-brand-blue text-white px-5 rounded-sm font-semibold flex items-center gap-2 hover:bg-blue-700 transition"
                      >
                        <Send size={18} /> Send
                      </button>
                      <button 
                        onClick={() => { setCheckoutAction('none'); setAdminInputValue(''); setPrintCustomerName(''); }}
                        className="p-2 border border-gray-200 rounded-sm text-gray-500 hover:bg-gray-100"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : checkoutAction === 'print' ? (
                    <div className="flex gap-2 w-full animate-in fade-in slide-in-from-bottom-2">
                      <input 
                        type="text" 
                        value={adminInputValue} 
                        onChange={e => setAdminInputValue(e.target.value)}
                        placeholder="Customer Name" 
                        className="flex-1 bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-sm outline-none focus:border-gray-800"
                        autoFocus
                      />
                      <button 
                        onClick={() => {
                          if (!adminInputValue.trim()) {
                            alert('Please enter a customer name before printing');
                            return;
                          }
                          setPrintCustomerName(adminInputValue);
                        }}
                        className="bg-gray-800 text-white px-5 rounded-sm font-semibold flex items-center gap-2 hover:bg-black transition"
                      >
                        <Printer size={18} /> Print
                      </button>
                      <button 
                        onClick={() => { setCheckoutAction('none'); setAdminInputValue(''); setPrintCustomerName(''); }}
                        className="p-2 border border-gray-200 rounded-sm text-gray-500 hover:bg-gray-100"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <button 
                        onClick={() => setCheckoutAction('sms')}
                        className="flex-1 py-3 text-white rounded-sm font-bold flex items-center justify-center space-x-2 bg-brand-blue hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        <MessageSquare size={20} />
                        <span>Send via SMS</span>
                      </button>
                      <button 
                        onClick={() => setCheckoutAction('print')}
                        className="flex-1 py-3 text-white rounded-sm font-bold flex items-center justify-center space-x-2 bg-gray-800 hover:bg-black transition-colors shadow-sm"
                      >
                        <Printer size={20} />
                        <span>Print Bill</span>
                      </button>
                    </div>
                  )
                ) : (
                  <div className="relative w-full">
                    <button 
                      onClick={() => setCheckoutAction('checkout')}
                      className="w-full py-3 text-white rounded-sm font-bold flex items-center justify-center space-x-2 bg-brand-blue hover:bg-brand-blue-hover transition-colors shadow-sm"
                    >
                      <ShoppingBag className="w-5 h-5 shrink-0" />
                      <span className="truncate">Proceed to Checkout</span>
                    </button>
                    
                    {checkoutAction === 'checkout' && (
                       <div className="fixed inset-0 z-[110] bg-white flex flex-col p-4 animate-in fade-in slide-in-from-bottom">
                         <div className="flex items-center justify-between border-b pb-3 mb-4">
                            <h2 className="text-xl font-bold">Checkout</h2>
                            <button onClick={() => setCheckoutAction('none')}><X size={24}/></button>
                         </div>
                         <form className="flex flex-col flex-1" onSubmit={async (e) => {
                             e.preventDefault();
                             const formData = new FormData(e.currentTarget);
                             const customerName = (formData.get('name') as string).trim();
                             
                             if (!customerName) {
                               alert('Please enter a name');
                               return;
                             }
                             const customerPhone = formData.get('phone') as string;
                             const customerAddress = (formData.get('address') as string) || '';
                             const paymentMethod = formData.get('payment') as string || 'cod';
                             
                             try {
                               const { addDoc, collection } = await import('firebase/firestore');
                               const { db } = await import('../lib/firebase');
                               const orderId = `AASH-${Math.floor(100000 + Math.random() * 900000)}`;

                               await addDoc(collection(db, 'orders'), {
                                 orderId,
                                 customerName,
                                 customerPhone,
                                 customerAddress,
                                 items: items.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price, image: i.image })),
                                 totalAmount: parseFloat(totalPrice),
                                 status: 'new',
                                 paymentMethod,
                                 paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
                                 createdAt: Date.now(),
                                 updatedAt: Date.now()
                               });
                               
                               // Mock sending email to Gmail
                               fetch('/api/health').catch(() => {});
                               
                               alert(`Order placed successfully! Your Order ID is ${orderId}`);
                               useCartStore.getState().clearCart();
                               setCheckoutAction('none');
                               setCartOpen(false);
                               import('../store/ui').then(({ useUIStore }) => {
                                 useUIStore.getState().setActiveTab('orders');
                               });
                             } catch(err) {
                               console.error(err);
                               alert('Error placing order.');
                             }
                           }}>
                             <div className="space-y-4 flex-1 pt-4">
                             <div>
                               <label className="text-sm font-medium text-gray-700">Name</label>
                               <input name="name" required className="w-full mt-1 border border-gray-200 rounded p-3 outline-none focus:border-brand-blue" placeholder="Full Name" />
                             </div>
                             <div>
                               <label className="text-sm font-medium text-gray-700">Phone Number</label>
                               <input name="phone" required type="tel" className="w-full mt-1 border border-gray-200 rounded p-3 outline-none focus:border-brand-blue" placeholder="Mobile Number" />
                             </div>
                           </div>
                           <div className="mt-8 pb-4">
                             <button type="submit" className="w-full py-4 text-white rounded-lg font-bold bg-brand-blue hover:bg-brand-blue-hover text-lg shadow-sm animate-pulse-slow">
                               Place Order • ₹{totalPrice}
                             </button>
                           </div>
                         </form>
                       </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

