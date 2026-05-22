import React from 'react';
import { useCartStore } from '../store/cart';
import { X, ShoppingBag } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Cart() {
  const { items, isCartOpen, setCartOpen, removeItem, updateQuantity, totalItems } = useCartStore();

  const handleWhatsAppCheckout = () => {
    if (items.length === 0) return;
    
    // Format cart items
    const itemList = items.map(item => `${item.name} (x${item.quantity})`).join('%0A- ');
    const message = `Hello Aashirwad Stores, I want to order these items:%0A- ${itemList}`;
    const whatsappUrl = `https://wa.me/919028646863?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
  };

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
          {/* Header */}
          <div className="h-14 bg-white flex items-center px-4 border-b border-gray-100 shrink-0 shadow-sm">
            <button 
              onClick={() => setCartOpen(false)}
              className="p-2 -ml-2 text-gray-600 hover:text-black hover:bg-gray-50 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <div className="ml-3 font-medium text-black">My Cart</div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto pb-32">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white mt-2">
                <ShoppingBag size={64} className="mb-4 opacity-20" />
                <p className="text-lg text-gray-500 font-medium">Your cart is empty!</p>
                <p className="text-sm text-gray-400 mt-2">Add items to it now.</p>
                <button 
                  onClick={() => setCartOpen(false)}
                  className="mt-6 px-10 py-3 bg-brand-blue text-white rounded-sm font-medium shadow-sm hover:shadow-md transition-shadow"
                >
                  Shop Now
                </button>
              </div>
            ) : (
              <div className="bg-white mt-2 shadow-sm">
                {items.map((item, index) => (
                  <div key={item.id} className={cn("p-4 flex gap-4", index !== items.length - 1 && "border-b border-gray-100")}>
                    <div className="w-24 h-24 bg-gray-50 rounded-md overflow-hidden shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-black font-medium line-clamp-2 pr-2">{item.name}</span>
                        {item.price && <span className="text-sm font-semibold text-gray-900 shrink-0">₹{(item.price * item.quantity).toFixed(2)}</span>}
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
                          <span className="text-sm font-medium w-10 text-center">{item.quantity}</span>
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
                          Remove
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
            <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 drop-shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-10 flex justify-between items-center h-20">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">{totalItems()} items</span>
                <span className="text-lg font-bold text-black">
                  ₹{items.reduce((total, item) => total + (item.price || 0) * item.quantity, 0).toFixed(2)}
                </span>
              </div>
              <button 
                onClick={handleWhatsAppCheckout}
                className="w-1/2 max-w-xs py-3 text-white rounded-sm font-bold flex items-center justify-center space-x-2 bg-[#25D366] hover:bg-[#20bd5c] transition-colors shadow-sm"
              >
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span className="truncate">Checkout via WhatsApp</span>
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
