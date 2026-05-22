import { create } from 'zustand';
import { Product } from '../data/products';

interface ProductsStore {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
}

export const useProductsStore = create<ProductsStore>((set) => ({
  products: [],
  isLoading: false,
  error: null,
  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('https://jki1kx-1r.myshopify.com/api/2024-01/graphql.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': 'd369742f3c35780529319ab1106e58ff'
        },
        body: JSON.stringify({
          query: `
            {
              products(first: 50) {
                edges {
                  node {
                    id
                    title
                    description
                    images(first: 1) {
                      edges {
                        node {
                          url
                        }
                      }
                    }
                    variants(first: 1) {
                      edges {
                        node {
                          price {
                            amount
                            currencyCode
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          `
        })
      });

      const { data } = await response.json();
      
      const products: Product[] = data.products.edges.map((edge: any) => {
        const node = edge.node;
        return {
          id: node.id,
          name: node.title,
          description: node.description || '',
          image: node.images.edges[0]?.node.url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop',
          price: parseFloat(node.variants.edges[0]?.node.price.amount || "0"),
        };
      });

      set({ products, isLoading: false });
    } catch (error) {
      console.error("Error fetching products from Shopify:", error);
      set({ error: 'Failed to load products', isLoading: false });
    }
  },
}));
