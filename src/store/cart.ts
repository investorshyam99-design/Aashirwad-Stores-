import { create } from 'zustand';
import { Product } from '../data/products';

export interface CartItem extends Product {
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updatePrice: (productId: string, price: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setCartOpen: (isOpen: boolean) => void;
  totalItems: () => number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedProductId: null,
  setSelectedProductId: (id) => set({ selectedProductId: id }),
  addItem: (product, quantity = 1) =>
    set((state) => {
      const existingItem = state.items.find((item) => item.id === product.id);
      if (existingItem) {
        return {
          items: state.items.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
        };
      }
      return { items: [...state.items, { ...product, quantity }] };
    }),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== productId),
    })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
      ),
    })),
  updatePrice: (productId, price) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === productId ? { ...item, price: Math.max(0, price) } : item
      ),
    })),
  clearCart: () => set({ items: [] }),
  isCartOpen: false,
  setCartOpen: (isOpen) => set({ isCartOpen: isOpen }),
  totalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
}));
