// app/categories/[id]/loading.tsx
import Header from "@/app/components/Header";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header /> {/* الحفاظ على الهيدر ثابتاً أثناء التحميل */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Skeleton Loader / شكل مبدئي للصفحة */}
        <div className="flex justify-between items-center mb-6">
          <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>

        {/* عنوان التصنيف */}
        <div className="text-center mb-8">
          <div className="h-8 w-64 bg-gray-200 rounded mx-auto mb-2 animate-pulse"></div>
          <div className="h-4 w-40 bg-gray-200 rounded mx-auto animate-pulse"></div>
        </div>

        {/* شبكة المنتجات وهمية */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-4 border border-gray-100 h-80 flex flex-col"
            >
              <div className="flex-1 bg-gray-200 rounded-xl mb-4 animate-pulse"></div>
              <div className="h-4 w-3/4 bg-gray-200 rounded mb-2 animate-pulse"></div>
              <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
