"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Define types for our data
interface Variant {
  id: string;
  imageUrl: string;
}
interface Product {
  modelId: string;
  price: number;
  category: string;
  description: string;
  variants: Variant[];
}
interface StoreData {
  products: Product[];
  categories: any[];
}

async function getStoreData(): Promise<StoreData | null> {
  try {
    const res = await fetch("/api/getAllData");
    if (!res.ok) throw new Error("Failed to fetch data");
    return res.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}

export default function CategoryPage() {
  const params = useParams();
  const categoryName = decodeURIComponent(params.name as string);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      const data = await getStoreData();
      if (data && data.products) {
        // --- ✨✨✨ هذا هو السطر الذي تم تعديله ✨✨✨ ---
        const filtered = data.products.filter(
          (p) => p.category.trim() === categoryName.trim()
        );
        setProducts(filtered);
      }
      setLoading(false);
    }
    if (categoryName) {
      loadProducts();
    }
  }, [categoryName]);

  if (loading)
    return <div className="text-center p-10">جاري تحميل المنتجات...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">قسم: {categoryName}</h1>

      {products.length === 0 ? (
        <p>لا توجد منتجات في هذا القسم حالياً.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const firstVariant = product.variants && product.variants[0];
            if (!firstVariant) return null;

            return (
              <Link
                href={`/product/${product.modelId}`}
                key={product.modelId}
                className="group block border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="relative w-full aspect-square bg-gray-200">
                  <img
                    src={firstVariant.imageUrl}
                    alt={product.modelId}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-4 bg-white">
                  <h3 className="font-semibold text-lg text-gray-800">
                    كود: {product.modelId}
                  </h3>
                  <p className="text-pink-500 font-bold mt-2">
                    {product.price} جنيه
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
