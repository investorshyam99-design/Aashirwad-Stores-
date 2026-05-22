import React, { useState } from 'react';
import { Product } from '../data/products';
import { useCartStore } from '../store/cart';
import { motion } from 'motion/react';
import { ShoppingBag, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ProductCardProps {
  product: Product;
  key?: string;
}

export function ProductCard({ product }: ProductCardProps) {
  const items = useCartStore((state) => state.items);
  const cartItem = items.find((i) => i.id === product.id);
  const [localQuantity, setLocalQuantity] = useState(1);

  const setSelectedProductId = useCartStore((state) => state.setSelectedProductId);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const setCartOpen = useCartStore((state) => state.setCartOpen);

  const displayQuantity = cartItem ? cartItem.quantity : localQuantity;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cartItem) {
      addItem(product, localQuantity);
    } else {
      setCartOpen(true);
    }
  };

  const handleQuantityChange = (e: React.MouseEvent, amount: number) => {
    e.stopPropagation();
    if (cartItem) {
      const newQty = cartItem.quantity + amount;
      if (newQty <= 0) {
        removeItem(product.id);
      } else {
        updateQuantity(product.id, newQty);
      }
    } else {
      setLocalQuantity(Math.max(1, localQuantity + amount));
    }
  };

  return (
    <motion.div 
      layoutId={`card-${product.id}`}
      whileHover={{ y: -4 }}
      onClick={() => setSelectedProductId(product.id)}
      className="group bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-50 flex flex-col cursor-pointer transition-all duration-300"
    >
      <div className="h-40 sm:h-48 w-full bg-gray-50 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative border border-transparent group-hover:border-gray-100 transition-colors">
        <motion.img 
          layoutId={`image-${product.id}`}
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none" />
      </div>
      
      <h3 className="font-medium text-sm text-gray-900 mt-1 flex-grow line-clamp-2 leading-snug">{product.name}</h3>
      {product.price && <p className="text-sm font-semibold text-gray-900 mt-1">₹{product.price}</p>}

      <div className="mt-4 flex items-center justify-between gap-2 z-10 relative">
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-9 bg-white shrink-0">
          <button 
            type="button"
            onClick={(e) => handleQuantityChange(e, -1)}
            className="w-7 sm:w-8 h-full flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 transition-colors"
          >
            -
          </button>
          <span className="text-xs font-semibold w-5 sm:w-6 text-center text-black">{displayQuantity}</span>
          <button 
            type="button"
            onClick={(e) => handleQuantityChange(e, 1)}
            className="w-7 sm:w-8 h-full flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 transition-colors"
          >
            +
          </button>
        </div>
        
        <button 
          type="button"
          onClick={handleAddToCart}
          className={cn(
            "flex-1 h-9 px-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5",
            cartItem 
              ? "bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/20" 
              : "bg-brand-blue text-white hover:bg-brand-blue-hover"
          )}
        >
          {cartItem ? (
            <>
              <CheckCircle2 size={14} />
              <span className="hidden sm:inline">Added</span>
            </>
          ) : (
            <>
              <ShoppingBag size={14} />
              <span>Add</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
