// types/product.ts
export interface Product {
  unique_id: string;
  master_code: string;
  item_code: string;
  item_name: string;
  color: string;
  size: string;
  out_price: number;
  av_price: number;
  images: string;
  type_id?: number;
  group_id?: number;
  class_id?: number;
  kind_id?: number;
  place_id?: number;
  cur_qty?: number;
  group_name?: string;
  kind_name?: string;
  place_name?: string;
  unit_name?: string;
}

export interface ProductVariant {
  id: string;
  item_code: string;
  color: string;
  imageUrl: string;
  sizes: string[];
}

export interface Category {
  id: number;
  name: string;
  image?: string;
  kind: string;
}

export interface CartItem {
  id: string;
  master_code: string;
  item_code: string;
  name: string;
  price: number;
  quantity: number;
  color?: string;
  size?: string;
  image?: string;
}

export interface OrderItem {
  product: string;
  quantity: number;
  price: number;
  color?: string;
  item_code?: string;
}

export interface Order {
  id: string;
  customer_name: string;
  address: string;
  phone: string;
  total_price: number;
  timestamp: Date;
  order_items: OrderItem[];
}
