import React, { useState } from 'react';
import { Product } from '../data/products';
import { useCartStore } from '../store/cart';
import { useI18nStore } from '../store/i18n';
import { useAuthStore } from '../store/auth';
import { getTranslation, formatNumberIntl } from '../i18n/translations';
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
  const language = useI18nStore(state => state.language);
  const isAdmin = useAuthStore(state => state.isAdmin);

  const [isEditingQty, setIsEditingQty] = useState(false);
  const [tempQty, setTempQty] = useState('');

  const displayQuantity = cartItem ? cartItem.quantity : localQuantity;

  const hasDiscount = product.mrp && product.price && product.mrp > product.price;
  const savingsPercent = hasDiscount ? Math.round(((product.mrp! - product.price!) / product.mrp!) * 100) : 0;

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

  const handleQtyInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setIsEditingQty(false);
    const parsed = parseInt(tempQty, 10);
    if (!isNaN(parsed) && parsed > 0) {
      if (cartItem) {
        updateQuantity(product.id, parsed);
      } else {
        setLocalQuantity(parsed);
      }
    } else if (parsed === 0 && cartItem) {
      removeItem(product.id);
    }
  };

  const handleQtyInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <motion.div 
      layoutId={`card-${product.id}`}
      onClick={() => setSelectedProductId(product.id)}
      className="group bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[15px] text-gray-900 truncate pr-2 leading-tight">{product.name}</h3>
        {isAdmin && (
          hasDiscount ? (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-gray-500 line-through">₹{formatNumberIntl(product.mrp || 0, language)}</span>
              <p className="text-sm font-semibold text-gray-900">₹{formatNumberIntl(product.price || 0, language)}</p>
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded border border-green-100">{formatNumberIntl(savingsPercent, language)}% OFF</span>
            </div>
          ) : (
            product.price && <p className="text-sm font-semibold text-gray-900 mt-0.5">₹{formatNumberIntl(product.price, language)}</p>
          )
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden h-8 bg-white shrink-0 shadow-sm">
          <button 
            type="button"
            onClick={(e) => handleQuantityChange(e, -1)}
            className="w-7 h-full flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 transition-colors bg-gray-50/50"
          >
            -
          </button>
          
          {isEditingQty ? (
            <input 
              type="number"
              min="0"
              autoFocus
              value={tempQty}
              onChange={(e) => setTempQty(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onBlur={handleQtyInputBlur}
              onKeyDown={handleQtyInputKeyDown}
              className="w-8 sm:w-10 text-center text-sm font-semibold text-black bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          ) : (
            <span 
              onClick={(e) => {
                e.stopPropagation();
                setTempQty(displayQuantity.toString());
                setIsEditingQty(true);
              }}
              className="cursor-pointer text-sm font-semibold px-1 min-w-[24px] sm:min-w-[32px] text-center text-black"
            >
              {formatNumberIntl(displayQuantity, language)}
            </span>
          )}

          <button 
            type="button"
            onClick={(e) => handleQuantityChange(e, 1)}
            className="w-7 h-full flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 transition-colors bg-gray-50/50"
          >
            +
          </button>
        </div>
        
        <button 
          type="button"
          onClick={handleAddToCart}
          className={cn(
            "h-8 px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center shadow-sm min-w-[80px]",
            cartItem 
              ? "bg-brand-blue/10 text-brand-blue border border-brand-blue/20 hover:bg-brand-blue/20" 
              : "bg-brand-blue text-white hover:bg-brand-blue-hover hover:shadow"
          )}
        >
          {cartItem ? (
            <span>{getTranslation(language, 'cart')}</span>
          ) : (
            <span>{getTranslation(language, 'addToCart')}</span>
          )}
        </button>
      </div>
    </motion.div>
  );
}
