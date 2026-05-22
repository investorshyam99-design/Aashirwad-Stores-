import React from 'react';
import { ProductCard } from './ProductCard';
import { useCartStore } from '../store/cart';
import { useProductsStore } from '../store/products';

export function ProductGrid() {
  const searchQuery = useCartStore(state => state.searchQuery);
  const { products, isLoading, error } = useProductsStore();

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    product.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-10 py-10">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
            {filteredProducts.map((product) => (
               <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              No products found matching "{searchQuery}"
            </div>
          )}
        </>
      )}
    </main>
  );
}
