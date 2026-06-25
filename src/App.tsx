/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Home, Search, Grid, ClipboardList, ShoppingCart } from 'lucide-react';
import { Header } from './components/Header';
import { ProductGrid } from './components/ProductGrid';
import { ProductPage } from './components/ProductPage';
import { OrdersPage } from './components/OrdersPage';
import { CollectionsPage } from './components/CollectionsPage';
import { AdminChatsPage } from './components/AdminChatsPage';
import { Footer } from './components/Footer';
import { Cart } from './components/Cart';
import { useCartStore } from './store/cart';
import { useProductsStore } from './store/products';
import { useUIStore } from './store/ui';
import { useI18nStore } from './store/i18n';
import { getTranslation } from './i18n/translations';

export default function App() {
  const selectedProductId = useCartStore(state => state.selectedProductId);
  const fetchProducts = useProductsStore(state => state.fetchProducts);
  const language = useI18nStore(state => state.language);
  const { activeTab, setActiveTab, setIsSearchOpen } = useUIStore();

  useEffect(() => {
    fetchProducts(language);
    document.title = getTranslation(language, 'websiteName');
  }, [fetchProducts, language]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-16">
      <Header />
      <main className="flex-grow">
        {activeTab === 'chats' ? <AdminChatsPage /> :
         activeTab === 'orders' ? <OrdersPage /> : 
         activeTab === 'collection' ? <CollectionsPage /> :
         (selectedProductId ? <ProductPage /> : <ProductGrid />)}
      </main>
      <Cart />
      <Footer />
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-40 pb-safe md:hidden">
        <button 
          onClick={() => { 
            setActiveTab('home');
            useCartStore.getState().setSelectedProductId(null);
            setIsSearchOpen(false);
            window.scrollTo(0, 0); 
          }}
          className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'home' && !useUIStore.getState().isSearchOpen ? 'text-brand-blue' : 'text-gray-500 hover:text-brand-blue'}`}
        >
          <Home size={20} />
          <span className="text-[10px] font-medium mt-1 uppercase">Home</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('search');
            useCartStore.getState().setSelectedProductId(null);
            setIsSearchOpen(true);
            window.scrollTo(0, 0);
          }}
          className={`flex flex-col items-center justify-center w-full h-full transition-colors ${useUIStore.getState().isSearchOpen ? 'text-brand-blue' : 'text-gray-500 hover:text-brand-blue'}`}
        >
          <Search size={20} />
          <span className="text-[10px] font-medium mt-1 uppercase">Search</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('collection');
            useCartStore.getState().setSelectedProductId(null);
            setIsSearchOpen(false);
            window.scrollTo(0, 0);
          }}
          className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'collection' && !useUIStore.getState().isSearchOpen ? 'text-brand-blue' : 'text-gray-500 hover:text-brand-blue'}`}
        >
          <Grid size={20} />
          <span className="text-[10px] font-medium mt-1 uppercase">Collection</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('orders');
            setIsSearchOpen(false);
            window.scrollTo(0, 0);
          }}
          className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'orders' ? 'text-brand-blue' : 'text-gray-500 hover:text-brand-blue'}`}
        >
          <ClipboardList size={20} />
          <span className="text-[10px] font-medium mt-1 uppercase">Orders</span>
        </button>

        <button 
          onClick={() => useCartStore.getState().setCartOpen(true)}
          className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-brand-blue transition-colors relative"
        >
          <ShoppingCart size={20} />
          <span className="text-[10px] font-medium mt-1 uppercase">Cart</span>
          {useCartStore.getState().items.length > 0 && (
            <span className="absolute top-2 right-4 bg-brand-blue text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              {useCartStore.getState().items.length}
            </span>
          )}
        </button>
      </nav>
    </div>
  );
}

