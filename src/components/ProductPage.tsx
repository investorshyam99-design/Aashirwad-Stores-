import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { useCartStore } from '../store/cart';
import { useProductsStore } from '../store/products';
import { ProductCard } from './ProductCard';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function ProductPage() {
  const { selectedProductId, setSelectedProductId, addItem, setCartOpen, items, updateQuantity, removeItem } = useCartStore();
  const { products } = useProductsStore();
  const [localQuantity, setLocalQuantity] = useState(1);
  
  useEffect(() => {
    setLocalQuantity(1);
    window.scrollTo(0, 0);
  }, [selectedProductId]);

  const product = products.find(p => p.id === selectedProductId);
  
  if (!product) return null;

  const cartItem = items.find(i => i.id === product.id);
  const displayQuantity = cartItem ? cartItem.quantity : localQuantity;

  const handleQuantityChange = (amount: number) => {
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

  const handleAddToCart = () => {
    if (!cartItem) {
      addItem(product, localQuantity);
    } else {
      setCartOpen(true);
    }
  };

  const otherProducts = products.filter(p => p.id !== selectedProductId);

  return (
    <main className="flex-1 w-full max-w-[1440px] mx-auto bg-white flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-gray-100 shrink-0 sticky top-20 z-40 bg-white shadow-sm">
        <button 
          onClick={() => setSelectedProductId(null)}
          className="p-2 -ml-2 text-gray-600 hover:text-black hover:bg-gray-50 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="ml-3 font-medium truncate text-black">{product.name}</div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 p-4 md:p-10 border-b border-gray-100">
        <div className="w-full md:w-1/2 aspect-[4/5] sm:aspect-auto sm:h-[600px] bg-white border border-gray-100 rounded-2xl overflow-hidden relative p-4 flex flex-col items-center justify-center">
          <motion.img 
            layoutId={`image-${product.id}`}
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-contain mix-blend-multiply"
          />
        </div>

        <div className="w-full md:w-1/2 flex flex-col justify-start pt-4 md:py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{product.name}</h1>
          {product.price && <p className="text-xl font-medium text-brand-blue mt-2">₹{product.price}</p>}
          
          <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center mb-8 md:mb-0">
            <div className="flex items-center justify-between p-1 border border-gray-200 rounded-xl w-full sm:w-32 bg-gray-50 shrink-0 h-14">
              <button 
                onClick={() => handleQuantityChange(-1)}
                className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors text-lg"
              >
                -
              </button>
              <span className="font-medium text-gray-900">{displayQuantity}</span>
              <button 
                onClick={() => handleQuantityChange(1)}
                className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors text-lg"
              >
                +
              </button>
            </div>
            
            <button 
              onClick={handleAddToCart}
              className={cn(
                "w-full sm:flex-1 flex items-center justify-center gap-2 py-4 h-14 rounded-xl font-medium transition-all duration-300",
                cartItem 
                  ? "bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/20"
                  : "bg-brand-blue hover:bg-brand-blue-hover text-white"
              )}
            >
              {cartItem ? (
                <>
                  <CheckCircle2 size={20} />
                  View in Cart
                </>
              ) : (
                <>
                  <ShoppingBag size={20} />
                  Add {displayQuantity} to Cart
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-10 py-10">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Explore More Products</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
          {otherProducts.map((p) => (
             <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </main>
  );
}
