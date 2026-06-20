export type Product = {
  id: string;
  name: string;
  description: string;
  image: string;
  price?: number;
  mrp?: number;
  categoryId?: string;
  unit?: string;
  stock?: number;
  inStock?: boolean;
};
