import { create } from 'zustand';
import { Product } from '../data/products';

interface ProductsStore {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: (language?: string) => Promise<void>;
}

const productTranslations: Record<string, Record<string, string>> = {
  "Goldex Excel Pen Blue": {
    "HI": "गोल्डेक्स एक्सेल पेन नीला",
    "MR": "गोल्डेक्स एक्सेल पेन निळा"
  },
  "Goldex Klassy Pen Blue": {
    "HI": "गोल्डेक्स क्लासी पेन नीला",
    "MR": "गोल्डेक्स क्लासी पेन निळा"
  }
};

export const useProductsStore = create<ProductsStore>((set) => ({
  products: [],
  isLoading: false,
  error: null,
  fetchProducts: async (language = 'en') => {
    set({ isLoading: true, error: null });
    const shopifyLang = language.toUpperCase(); // EN, HI, MR
    try {
      const response = await fetch('https://jki1kx-1r.myshopify.com/api/2024-01/graphql.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': 'd369742f3c35780529319ab1106e58ff'
        },
        body: JSON.stringify({
          query: `
            query @inContext(language: ${shopifyLang}) {
              products(first: 250) {
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
                          compareAtPrice {
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
        
        let translatedName = node.title;
        if (shopifyLang !== 'EN' && productTranslations[node.title] && productTranslations[node.title][shopifyLang]) {
          translatedName = productTranslations[node.title][shopifyLang];
        } else if (shopifyLang === 'HI') {
           translatedName = node.title.replace(/Goldex/g, "गोल्डेक्स").replace(/Excel/g, "एक्सेल").replace(/Klassy/g, "क्लासी").replace(/Pen/g, "पेन").replace(/Blue/g, "नीला").replace(/Black/g, "काला").replace(/Red/g, "लाल").replace(/\(Stationery\)/g, "(स्टेशनरी)");
        } else if (shopifyLang === 'MR') {
           translatedName = node.title.replace(/Goldex/g, "गोल्डेक्स").replace(/Excel/g, "एक्सेल").replace(/Klassy/g, "क्लासी").replace(/Pen/g, "पेन").replace(/Blue/g, "निळा").replace(/Black/g, "काळा").replace(/Red/g, "लाल").replace(/\(Stationery\)/g, "(स्टेशनरी)");
        }

        return {
          id: node.id,
          name: translatedName,
          description: node.description || '',
          image: node.images.edges[0]?.node.url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop',
          price: parseFloat(node.variants.edges[0]?.node.price.amount || "0"),
          mrp: parseFloat(node.variants.edges[0]?.node.compareAtPrice?.amount || node.variants.edges[0]?.node.price.amount || "0"),
        };
      });

      set({ products, isLoading: false });
    } catch (error) {
      console.error("Error fetching products from Shopify:", error);
      set({ error: 'Failed to load products', isLoading: false });
    }
  },
}));
