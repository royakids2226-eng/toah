"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface Product {
  modelId: string;
  price: number;
  category: string;
  description: string;
  group_name?: string;
  kind_name?: string;
  item_name?: string;
  master_code?: string;
  variants: Array<{
    id: string;
    color: string;
    imageUrl: string;
    sizes: string[];
    cur_qty?: number;
    stor_id?: number;
  }>;
  cur_qty?: number;
  stor_id?: number;
  item_code?: string;
  unique_id?: string;
}

interface Category {
  id: number;
  name: string;
  image: string;
  kind: string;
  sub?: string;
}

interface ProductsContextType {
  products: Product[];
  categories: Category[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  loading: boolean;
  error: string;
  refetchData: () => void;
}

const ProductsContext = createContext<ProductsContextType | undefined>(
  undefined
);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ دالة للتحقق من حالة الموظف من localStorage مباشرة
  const checkIsEmployee = () => {
    try {
      const employee = localStorage.getItem("employee");
      const employeeToken = localStorage.getItem("employeeToken");
      return !!(employee && employeeToken);
    } catch (error) {
      console.error("Error checking employee status:", error);
      return false;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      // ✅ التحقق من حالة الموظف من localStorage مباشرة
      const isEmployee = checkIsEmployee();

      console.log("🔄 جلب البيانات - حالة الموظف:", isEmployee);

      // ✅ استخدام API مختلف للموظفين
      const endpoint = isEmployee ? "/api/products/employee" : "/api/products";

      console.log("🌐 جلب البيانات من:", endpoint);

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`فشل في جلب البيانات: ${response.status}`);
      }

      const data = await response.json();

      // ✅ تحويل البيانات من الـ API إلى الشكل المطلوب
      const formattedProducts: Product[] = data.products.map(
        (product: any) => ({
          modelId: product.modelId,
          price: product.price,
          category: product.category,
          description: product.description,
          group_name: product.group_name,
          kind_name: product.kind_name,
          item_name: product.item_name,
          master_code: product.master_code,
          variants: product.variants,
          // ✅ الآن هذه الحقول تأتي من البيانات الحقيقية
          cur_qty: product.cur_qty || 0,
          stor_id: product.stor_id || 0,
          item_code: product.item_code || "",
          unique_id: product.unique_id || "",
        })
      );

      console.log(
        "📦 المنتجات المحملة:",
        formattedProducts.length,
        "منتج - للموظف:",
        isEmployee,
        "المنتج الأول:",
        formattedProducts[0]
          ? {
              name: formattedProducts[0].item_name,
              cur_qty: formattedProducts[0].cur_qty,
              variants: formattedProducts[0].variants.map((v) => ({
                color: v.color,
                cur_qty: v.cur_qty,
              })),
            }
          : "لا توجد منتجات"
      );

      setProducts(formattedProducts);
      setCategories(data.categories || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("حدث خطأ في تحميل البيانات من الخادم");

      // ✅ استخدام البيانات الافتراضية كنسخة احتياطية
      const fallbackProducts: Product[] = [
        {
          modelId: "fallback-1",
          price: 199,
          category: "إلكترونيات",
          description: "منتج تجريبي - سماعات رأس",
          group_name: "إلكترونيات",
          kind_name: "سماعات",
          master_code: "FB001",
          cur_qty: 15,
          stor_id: 0,
          item_code: "FB001",
          unique_id: "fallback-1",
          variants: [
            {
              id: "var-fb-1",
              color: "أسود",
              imageUrl:
                "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
              sizes: ["ONE SIZE"],
              cur_qty: 15,
              stor_id: 0,
            },
          ],
        },
        {
          modelId: "fallback-2",
          price: 299,
          category: "ملابس",
          description: "منتج تجريبي - تيشيرت",
          group_name: "ملابس",
          kind_name: "تيشيرت",
          master_code: "FB002",
          cur_qty: 0,
          stor_id: 0,
          item_code: "FB002",
          unique_id: "fallback-2",
          variants: [
            {
              id: "var-fb-2",
              color: "أزرق",
              imageUrl:
                "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500",
              sizes: ["M", "L", "XL"],
              cur_qty: 0,
              stor_id: 0,
            },
          ],
        },
      ];

      const fallbackCategories: Category[] = [
        { id: 1, name: "إلكترونيات", image: "", kind: "جنس" },
        { id: 2, name: "ملابس", image: "", kind: "جنس" },
      ];

      setProducts(fallbackProducts);
      setCategories(fallbackCategories);
    } finally {
      setLoading(false);
    }
  };

  const refetchData = () => {
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []); // ✅ إزالة الاعتماد على isEmployee

  // ✅ إعادة جلب البيانات عند تغيير حالة المستخدم
  useEffect(() => {
    const handleStorageChange = () => {
      console.log("🔄 تغيير في localStorage، إعادة جلب البيانات...");
      fetchData();
    };

    // الاستماع لتغييرات localStorage من نوافذ أخرى
    window.addEventListener("storage", handleStorageChange);

    // الاستماع لأحداث التخزين في نفس النافذة
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
      originalSetItem.apply(this, [key, value]);
      if (
        key === "employee" ||
        key === "employeeToken" ||
        key === "customer" ||
        key === "customerToken"
      ) {
        setTimeout(handleStorageChange, 100);
      }
    };

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      localStorage.setItem = originalSetItem;
    };
  }, []);

  const value: ProductsContextType = {
    products,
    categories,
    searchTerm,
    setSearchTerm,
    loading,
    error,
    refetchData,
  };

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductsProvider");
  }
  return context;
}
