/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Header } from './components/Header';
import { ProductGrid } from './components/ProductGrid';
import { ProductPage } from './components/ProductPage';
import { Footer } from './components/Footer';
import { Cart } from './components/Cart';
import { useCartStore } from './store/cart';
import { useProductsStore } from './store/products';

export default function App() {
  const selectedProductId = useCartStore(state => state.selectedProductId);
  const fetchProducts = useProductsStore(state => state.fetchProducts);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="flex flex-col min-h-screen bg-white relative">
      <Header />
      {selectedProductId ? <ProductPage /> : <ProductGrid />}
      <Cart />
      <Footer />
    </div>
  );
}

