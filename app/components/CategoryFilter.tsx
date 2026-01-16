"use client";

import { useState } from "react";

interface Category {
  id: number;
  name: string;
  kind?: string;
}

interface CategoryFilterProps {
  categories: Category[];
  onCategoryChange: (categoryId: number | null, categoryName?: string) => void;
}

export default function CategoryFilter({
  categories,
  onCategoryChange,
}: CategoryFilterProps) {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleCategoryClick = (
    categoryId: number | null,
    categoryName?: string
  ) => {
    setSelectedCategory(categoryId);
    onCategoryChange(categoryId, categoryName);
  };

  // تصفية الفئات - استبعاد فئة "خلفية" وعرض الباقي
  const displayCategories = categories.filter(
    (category) => category.name !== "خلفية" && category.name.trim() !== ""
  );

  // تصفية الفئات حسب البحث
  const filteredCategories = displayCategories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 sticky top-8">
      <h3 className="font-bold text-xl text-gray-900 mb-6 pb-4 border-b border-gray-200">
        التصنيفات
      </h3>

      {/* شريط البحث في الفئات */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="ابحث في التصنيفات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute left-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
        {/* زر عرض الكل */}
        <button
          onClick={() => handleCategoryClick(null)}
          className={`w-full text-right px-4 py-3 rounded-xl transition-all duration-300 border-2 ${
            selectedCategory === null
              ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-300 shadow-md"
              : "text-gray-700 hover:bg-gray-50 border-transparent hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">جميع المنتجات</span>
            <div
              className={`w-2 h-2 rounded-full ${
                selectedCategory === null ? "bg-blue-600" : "bg-gray-300"
              }`}
            ></div>
          </div>
        </button>

        {/* قائمة الفئات الحقيقية من قاعدة البيانات */}
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id, category.name)}
              className={`w-full text-right px-4 py-3 rounded-xl transition-all duration-300 border-2 ${
                selectedCategory === category.id
                  ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-300 shadow-md"
                  : "text-gray-700 hover:bg-gray-50 border-transparent hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{category.name}</span>
                <div
                  className={`w-2 h-2 rounded-full ${
                    selectedCategory === category.id
                      ? "bg-blue-600"
                      : "bg-gray-300"
                  }`}
                ></div>
              </div>
              {category.kind && (
                <div className="text-xs text-gray-500 mt-1 text-left">
                  {category.kind}
                </div>
              )}
            </button>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">
            {categories.length === 0
              ? "جاري تحميل التصنيفات..."
              : "لا توجد تصنيفات تطابق البحث"}
          </div>
        )}
      </div>

      {/* معلومات التصحيح */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <p className="text-xs text-gray-600">
            {displayCategories.length} فئة من أصل {categories.length}
          </p>
        </div>
      )}

      {/* فلتر السعر (إضافي) */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4">فلتر السعر</h4>
        <div className="space-y-3">
          <button className="w-full text-right px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors border-2 border-transparent hover:border-gray-300">
            أقل من 100 ج.م
          </button>
          <button className="w-full text-right px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors border-2 border-transparent hover:border-gray-300">
            100 - 300 ج.م
          </button>
          <button className="w-full text-right px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors border-2 border-transparent hover:border-gray-300">
            300 - 500 ج.م
          </button>
          <button className="w-full text-right px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors border-2 border-transparent hover:border-gray-300">
            أكثر من 500 ج.م
          </button>
        </div>
      </div>

      {/* إحصائيات */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-center text-sm text-gray-600">
          <p>{filteredCategories.length} تصنيف متاح</p>
        </div>
      </div>
    </div>
  );
}
