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
import { useI18nStore } from './store/i18n';
import { getTranslation } from './i18n/translations';

export default function App() {
  const selectedProductId = useCartStore(state => state.selectedProductId);
  const fetchProducts = useProductsStore(state => state.fetchProducts);
  const language = useI18nStore(state => state.language);

  useEffect(() => {
    fetchProducts(language);
    document.title = getTranslation(language, 'websiteName');
  }, [fetchProducts, language]);

  return (
    <div className="flex flex-col min-h-screen bg-white relative">
      <Header />
      <div className="bg-brand-blue py-2 shadow-sm z-40 w-full overflow-hidden flex">
        <div className="flex whitespace-nowrap animate-marquee w-max">
          {/* Create two identical blocks, each with multiple repetitions to fill wide screens */}
          {[1, 2].map((blockId) => (
            <div key={blockId} className="flex shrink-0">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 text-xs md:text-sm font-medium text-white shrink-0">
                  <span>MRP is shown here You get the product at a lower price</span>
                  <span className="text-white/50">•</span>
                  <span>यह MRP प्राइस है आपको प्रोडक्ट कम रेट में मिलेगा</span>
                  <span className="text-white/50">•</span>
                  <span>हा MRP रेट आहे तुम्हाला प्रोडक्ट कमी किमतीत मिळेल</span>
                  <span className="text-white/50 inline-block ml-4">•</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {selectedProductId ? <ProductPage /> : <ProductGrid />}
      <Cart />
      <Footer />
    </div>
  );
}

