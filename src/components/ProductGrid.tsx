import React from 'react';
import { ProductCard } from './ProductCard';
import { useCartStore } from '../store/cart';
import { useProductsStore } from '../store/products';
import { useUIStore } from '../store/ui';
import { useI18nStore } from '../store/i18n';
import { getTranslation } from '../i18n/translations';
import { X } from 'lucide-react';

export function ProductGrid() {
  const searchQuery = useCartStore(state => state.searchQuery);
  const { products, isLoading, error } = useProductsStore();
  const activeCategoryId = useUIStore(state => state.activeCategoryId);
  const setActiveCategoryId = useUIStore(state => state.setActiveCategoryId);
  const language = useI18nStore(state => state.language);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategoryId ? product.categoryId === activeCategoryId : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-10 py-10">
      
      {activeCategoryId && (
        <div className="mb-4 flex items-center gap-2">
          <span className="font-bold text-lg text-gray-800">Category Filter</span>
          <button 
            onClick={() => setActiveCategoryId(null)}
            className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition"
          >
            Clear <X size={14} />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">
          {error}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {filteredProducts.map((product) => (
               <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              {getTranslation(language, 'noProductsFound')} "{searchQuery}"
            </div>
          )}
        </>
      )}
    </main>
  );
}
