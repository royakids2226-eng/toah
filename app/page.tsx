"use client";

import React from "react";
import Header from "./components/Header";
import ProductCard from "./components/ProductCard";
import Footer from "./components/Footer";
import { useProducts } from "./../context/ProductsContext";
import { useCart } from "./../context/CartContext";
import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from "react";

export default function Home() {
  const { products, categories, searchTerm, loading, error, refetchData } =
    useProducts();

  const { getCartItemsCount } = useCart();
  const cartCount = getCartItemsCount();
  const [randomProducts, setRandomProducts] = useState([]);
  const [filteredRandomProducts, setFilteredRandomProducts] = useState([]);

  // ✅ استخدام useMemo لتحسين الأداء
  const isEmployee = useMemo(() => {
    try {
      const employee = localStorage.getItem("employee");
      const employeeToken = localStorage.getItem("employeeToken");
      return !!(employee && employeeToken);
    } catch (error) {
      return false;
    }
  }, []);

  const employee = isEmployee;

  // ✅ استخدام useCallback
  const handleRetry = useCallback(() => {
    refetchData();
  }, [refetchData]);

  // ✅ تحسين اختيار المنتجات العشوائية
  useEffect(() => {
    if (products.length > 0) {
      const shuffled = [...products].sort(() => 0.5 - Math.random());
      setRandomProducts(shuffled.slice(0, 12));
    }
  }, [products]);

  // ✅ تحسين التصفية
  useEffect(() => {
    if (searchTerm) {
      const filtered = randomProducts.filter(
        (product) =>
          product.description
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          product.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.group_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRandomProducts(filtered);
    } else {
      setFilteredRandomProducts(randomProducts);
    }
  }, [searchTerm, randomProducts]);

  // ✅ استخدام useMemo للتصنيفات
  const displayCategories = useMemo(() => {
    return categories
      .filter((cat) => cat.kind === "جنس" && cat.name !== "خلفية" && cat.image)
      .slice(0, 8);
  }, [categories]);

  // ✅ استخدام useMemo للصورة الرئيسية
  const heroImage = useMemo(() => {
    return categories.find((cat) => cat.name === "خلفية")?.image || "";
  }, [categories]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-[99vw] mx-auto py-8 px-2">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">
                جاري تحميل المنتجات من قاعدة البيانات...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-[99vw] mx-auto py-8 px-2">
          <div className="flex justify-center items-center h-64">
            <div className="text-center max-w-md">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                خطأ في تحميل البيانات
              </h3>
              <p className="text-gray-700 mb-4">{error}</p>
              <div className="space-y-3">
                <button
                  onClick={handleRetry}
                  className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  إعادة المحاولة
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* ✅ Hero Section - تم إزالة النصوص والضبابية */}
      <section
        className="relative w-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: heroImage
            ? `url(${heroImage})` // ✅ الصورة فقط بدون تدرج لوني
            : "linear-gradient(to right, #3b82f6, #8b5cf6)",
          aspectRatio: "3 / 1",
        }}
      >
        {/* تم إزالة طبقة التعتيم والنصوص من هنا */}
      </section>

      {/* ✅ قسم التصنيف مع تحسين الأداء */}
      {displayCategories.length > 0 && (
        <CategoriesSection categories={displayCategories} />
      )}

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* قسم أحدث الموديلات */}
        <section className="w-full">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                أحدث الموديلات
              </h1>
              <p className="text-gray-600 mt-1">
                {searchTerm ? (
                  <>
                    عرض {filteredRandomProducts.length} منتج من نتائج البحث "
                    {searchTerm}"
                  </>
                ) : (
                  <>
                    عرض {filteredRandomProducts.length} منتج من أصل{" "}
                    {products.length} منتج
                  </>
                )}
              </p>
            </div>

            {employee && (
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                👨‍💼 وضع الموظف
              </div>
            )}
          </div>

          {filteredRandomProducts.length > 0 ? (
            <ProductsGrid products={filteredRandomProducts} />
          ) : (
            <EmptyProductsState searchTerm={searchTerm} products={products} />
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

// ✅ فصل مكون التصنيفات لتحسين الأداء
const CategoriesSection = ({ categories }) => (
  <section className="py-16 bg-[#fdf6f8]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 text-center mb-12">
        التصنيف حسب النوع
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 justify-items-center">
        {categories.map((category, index) => (
          <CategoryCard key={category.id} category={category} index={index} />
        ))}
      </div>
    </div>
  </section>
);

// ✅ مكون بطاقة التصنيف المنفصل
const CategoryCard = React.memo(({ category, index }) => (
  <Link href={`/categories/${category.id}`} className="group text-center block">
    <div
      className="bg-white rounded-[60px_20px_60px_20px] p-4 shadow-lg w-40 h-48 md:w-64 md:h-72 flex flex-col justify-end items-center overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:scale-105 relative"
      style={{
        transform: `rotate(${index % 2 === 0 ? "-5deg" : "-5deg"})`,
      }}
    >
      {/* ✅ الحاوية الرئيسية للصورة */}
      <div
        className="absolute inset-0 w-full h-full flex justify-center items-center transition-transform duration-300 group-hover:scale-110"
        style={{
          transform: `rotate(${index % 2 === 0 ? "5deg" : "5deg"})`,
        }}
      >
        {/* ✅ الصورة */}
        <div className="w-full h-full relative">
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-cover rounded-2xl"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/300x400/EFEFEF/666666?text=No+Image";
            }}
          />
          {/* ✅ طبقة تظليل للصورة */}
          <div className="absolute inset-0 bg-black opacity-20 rounded-2xl group-hover:opacity-10 transition-opacity duration-300"></div>
        </div>
      </div>

      {/* ✅ النص */}
      <div
        className="relative z-10 w-full pt-32 md:pt-48 transition-transform duration-300 group-hover:scale-105"
        style={{
          transform: `rotate(${index % 2 === 0 ? "5deg" : "5deg"})`,
        }}
      >
        <div className="bg-white/90 backdrop-blur-sm rounded-full mx-4 py-3 px-4 border border-white/50">
          <p className="text-gray-800 text-lg font-bold">{category.name}</p>
          <p className="text-gray-600 text-sm mt-1">اكتشف المزيد</p>
        </div>
      </div>

      {/* ✅ تأثير hover إضافي */}
      <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-blue-300 transition-all duration-300"></div>
    </div>
  </Link>
));

CategoryCard.displayName = "CategoryCard";

// ✅ مكون شبكة المنتجات المنفصل
const ProductsGrid = React.memo(({ products }) => (
  <div
    className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
    style={{
      transform: "translateZ(0)",
      willChange: "transform",
    }}
  >
    {products.map((product) => (
      <ProductCard key={product.modelId} product={product} />
    ))}
  </div>
));

ProductsGrid.displayName = "ProductsGrid";

// ✅ مكون الحالة الفارغة للمنتجات
const EmptyProductsState = React.memo(({ searchTerm, products }) => (
  <div className="text-center py-12">
    <div className="text-gray-400 text-6xl mb-4">🔍</div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      {searchTerm ? "لا توجد نتائج للبحث" : "لا توجد منتجات"}
    </h3>
    <p className="text-gray-600 mb-4">
      {searchTerm
        ? `لم نعثر على منتجات تطابق "${searchTerm}"`
        : products.length === 0
        ? "لم يتم العثور على أي منتجات في قاعدة البيانات"
        : "جاري تحميل المنتجات العشوائية..."}
    </p>
  </div>
));

EmptyProductsState.displayName = "EmptyProductsState";