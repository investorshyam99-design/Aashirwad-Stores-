import React, { useState } from 'react';
import { ShoppingCart, Search, Menu, X, Globe } from 'lucide-react';
import { useCartStore } from '../store/cart';
import { useI18nStore, Language } from '../store/i18n';
import { getTranslation, formatNumberIntl } from '../i18n/translations';

export function Header() {
  const { totalItems, setCartOpen, searchQuery, setSearchQuery, selectedProductId, setSelectedProductId } = useCartStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { language, setLanguage } = useI18nStore();

  return (
    <header className="sticky top-0 z-50 h-20 flex items-center justify-between px-4 md:px-10 bg-white border-b border-gray-100">
      <div className="flex items-center space-x-3">
        <button className="md:hidden p-2 text-gray-600 hover:text-brand-blue transition-colors">
          <Menu size={24} />
        </button>
        <div 
          onClick={() => {
            setSelectedProductId(null);
            setSearchQuery('');
          }}
          className="flex items-center space-x-3 cursor-pointer"
        >
          <img src="https://i.imgur.com/1FXXaKE.jpeg" alt="Aashirwad Stores Logo" className="w-10 h-10 object-contain rounded-md -mt-1.5" />
          <div className="flex flex-col justify-center">
            <span className="text-base sm:text-lg font-bold tracking-tight text-gray-900 uppercase leading-none">
              {getTranslation(language, 'websiteNameLine1')}
            </span>
            <span className="text-[11px] sm:text-[13px] font-semibold tracking-widest text-brand-blue uppercase leading-tight mt-0.5">
              {getTranslation(language, 'websiteNameLine2')}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Search, Language & Cart */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {!isSearchOpen && (
          <div className="flex items-center gap-1 md:gap-2 bg-gray-50 rounded-full px-2 py-1 md:px-3 md:py-1.5 border border-gray-100">
            <Globe size={16} className="text-brand-blue" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-sm font-medium outline-none text-gray-700 cursor-pointer w-12 md:w-auto"
            >
              <option value="en">Eng</option>
              <option value="hi">हिंदी</option>
              <option value="mr">मराठी</option>
            </select>
          </div>
        )}

        <div className={`flex items-center transition-all duration-300 ${isSearchOpen ? 'w-full absolute inset-0 bg-white px-4 z-50 md:relative md:w-64 md:bg-transparent' : 'w-10'}`}>
          {isSearchOpen ? (
            <>
              <Search size={24} className="text-brand-blue absolute left-8 md:left-3" />
              <input 
                type="text" 
                placeholder={getTranslation(language, 'searchPlaceholder')} 
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (selectedProductId) {
                    setSelectedProductId(null);
                  }
                }}
                className="w-full h-12 md:h-10 pl-12 pr-10 outline-none bg-gray-50 md:bg-gray-50 rounded-full text-black"
                onBlur={() => window.innerWidth > 768 ? null : setIsSearchOpen(false)}
              />
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="absolute right-6 md:hidden p-2 text-brand-blue"
              >
                <X size={24} />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 hover:bg-gray-50 rounded-full transition-colors"
            >
              <Search size={24} className="text-brand-blue" />
            </button>
          )}
        </div>

        {!isSearchOpen && (
          <div className="relative">
            <button 
              onClick={() => setCartOpen(true)}
              className="p-2 hover:bg-gray-50 rounded-full transition-colors"
            >
              <ShoppingCart size={24} className="text-brand-blue" />
            </button>
            {totalItems() > 0 && (
              <span className="absolute top-0 right-0 bg-brand-blue text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {formatNumberIntl(totalItems(), language)}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
