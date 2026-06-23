import React, { useState } from 'react';
import { ShoppingCart, Search, Menu, X, Globe } from 'lucide-react';
import { useCartStore } from '../store/cart';
import { useUIStore } from '../store/ui';
import { useI18nStore, Language } from '../store/i18n';
import { useAuthStore } from '../store/auth';
import { getTranslation, formatNumberIntl } from '../i18n/translations';

export function Header() {
  const { items, setCartOpen, searchQuery, setSearchQuery, selectedProductId, setSelectedProductId } = useCartStore();
  const { isSearchOpen, setIsSearchOpen, setActiveTab } = useUIStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language, setLanguage } = useI18nStore();
  const { user, login, logout, isAdmin } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 h-20 flex items-center justify-between px-4 md:px-10 bg-white border-b border-gray-100">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-gray-600 hover:text-brand-blue transition-colors rounded-full flex items-center"
          >
            <Menu size={24} />
          </button>
          
          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
              <div className="absolute left-0 mt-2 w-48 bg-white rounded-md flex flex-col overflow-hidden shadow-lg border border-gray-100 z-50">
                {user ? (
                  <>
                    <div className="px-4 py-3 border-b border-gray-100 flex flex-col items-start mt-2">
                      {user.photoURL && (
                        <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full mb-2" />
                      )}
                      <p className="text-sm font-medium text-gray-900 truncate w-full">{user.displayName || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate w-full">{user.email}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex flex-col border-b border-gray-100">
                        <div className="px-4 py-2 text-xs font-semibold text-brand-blue bg-blue-50">
                          Admin Panel
                        </div>
                        <button 
                          onClick={() => {
                            setActiveTab('chats');
                            setIsMenuOpen(false);
                          }}
                          className="px-4 py-3 text-sm text-left text-gray-800 hover:bg-gray-50 font-medium transition-colors"
                        >
                          Customer Chats
                        </button>
                      </div>
                    )}
                    <button 
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                      className="px-4 py-3 text-sm text-left text-red-600 hover:bg-gray-50 font-medium transition-colors"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      login();
                      setIsMenuOpen(false);
                    }}
                    className="px-4 py-3 text-sm text-left text-brand-blue hover:bg-gray-50 font-medium transition-colors"
                  >
                    Login
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div 
          onClick={() => {
            setSelectedProductId(null);
            setSearchQuery('');
          }}
          className="flex items-center cursor-pointer"
        >
          <img src="https://i.imgur.com/1FXXaKE.jpeg" alt="Logo" className="w-10 h-10 object-contain rounded-md" />
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
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setCartOpen(true)}
                className="p-2 hover:bg-gray-50 rounded-full transition-colors"
              >
                <ShoppingCart size={24} className="text-brand-blue" />
              </button>
              {items.length > 0 && (
                <span className="absolute top-0 right-0 bg-brand-blue text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                  {formatNumberIntl(items.length, language)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
