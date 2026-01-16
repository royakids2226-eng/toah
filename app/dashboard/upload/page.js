"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";

export default function UploadImages() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState([]);
  const [productsWithoutImages, setProductsWithoutImages] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    withImages: 0,
    withoutImages: 0,
  });
  const fileInputRef = useRef(null);

  // جلب المنتجات التي تحتاج صور
  useEffect(() => {
    const fetchProductsWithoutImages = async () => {
      try {
        setLoadingProducts(true);
        const response = await fetch("/api/match-images");
        const data = await response.json();

        if (data.statistics) {
          setProductsWithoutImages(data.productsWithoutImages || []);
          setStats({
            total: data.statistics.totalProducts,
            withImages: data.statistics.productsWithImages,
            withoutImages: data.statistics.productsWithoutImages,
          });
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProductsWithoutImages();
  }, []);

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadResults([]);

    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        results.push({
          fileName: file.name,
          success: result.success,
          message: result.message,
          imageUrl: result.image?.url,
          product: result.product,
          error: result.error,
          itemCode: result.product?.code,
        });

        // تحديث التقدم
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));

        // تحديث قائمة المنتجات بدون صور إذا نجح الرفع
        if (result.success && result.product) {
          setProductsWithoutImages((prev) =>
            prev.filter((p) => p.item_code !== result.product.code)
          );
          setStats((prev) => ({
            ...prev,
            withImages: prev.withImages + 1,
            withoutImages: prev.withoutImages - 1,
          }));
        }
      } catch (error) {
        results.push({
          fileName: file.name,
          success: false,
          message: "فشل في رفع الملف",
          error: error.message,
        });
      }
    }

    setUploadResults(results);
    setUploading(false);
    setUploadProgress(0);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect({ target: { files } });
    }
  };

  const matchImagesWithProducts = async () => {
    try {
      const response = await fetch("/api/match-images", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ تمت المطابقة: ${result.matched} صورة مرتبطة مع المنتجات`);
        // إعادة تحميل القائمة
        const statsResponse = await fetch("/api/match-images");
        const statsData = await statsResponse.json();
        if (statsData.statistics) {
          setProductsWithoutImages(statsData.productsWithoutImages || []);
          setStats({
            total: statsData.statistics.totalProducts,
            withImages: statsData.statistics.productsWithImages,
            withoutImages: statsData.statistics.productsWithoutImages,
          });
        }
      } else {
        alert("❌ فشل في المطابقة: " + result.error);
      }
    } catch (error) {
      alert("❌ خطأ في الاتصال بالسيرفر");
    }
  };

  const refreshProductsList = async () => {
    try {
      setLoadingProducts(true);
      const response = await fetch("/api/match-images");
      const data = await response.json();

      if (data.statistics) {
        setProductsWithoutImages(data.productsWithoutImages || []);
        setStats({
          total: data.statistics.totalProducts,
          withImages: data.statistics.productsWithImages,
          withoutImages: data.statistics.productsWithoutImages,
        });
        alert("✅ تم تحديث قائمة المنتجات");
      }
    } catch (error) {
      alert("❌ خطأ في تحديث القائمة");
    } finally {
      setLoadingProducts(false);
    }
  };

  const clearResults = () => {
    setUploadResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* رأس الصفحة */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            رفع الصور للمنتجات
          </h1>
          <p className="text-gray-600 mt-2">
            ارفع الصور وسيتم ربطها تلقائياً مع المنتجات بناءً على اسم الملف
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* العمود الأيسر - رفع الصور */}
          <div className="lg:col-span-2 space-y-6">
            {/* إحصائيات سريعة */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 text-center border">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.total}
                </div>
                <div className="text-sm text-gray-600">إجمالي المنتجات</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border">
                <div className="text-2xl font-bold text-green-600">
                  {stats.withImages}
                </div>
                <div className="text-sm text-gray-600">بها صور</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.withoutImages}
                </div>
                <div className="text-sm text-gray-600">تحتاج صور</div>
              </div>
            </div>

            {/* منطقة رفع الملفات */}
            <div className="bg-white rounded-xl shadow-sm p-8 border-2 border-dashed border-blue-300">
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="text-center"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*"
                  className="hidden"
                />

                <div className="mb-4">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl">📸</span>
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    اسحب وأفلت الصور هنا
                  </h3>
                  <p className="text-gray-600 mb-4">أو انقر لاختيار الملفات</p>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                >
                  {uploading ? "🔄 جاري الرفع..." : "📁 اختيار الصور"}
                </button>

                <p className="text-xs text-gray-500 mt-4">
                  المدعوم: JPG, PNG, GIF, WebP • اسم الملف يجب أن يطابق كود
                  المنتج
                </p>
              </div>

              {/* شريط التقدم */}
              {uploading && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>جاري رفع الصور...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* نتائج الرفع */}
            {uploadResults.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    نتائج الرفع ({uploadResults.length})
                  </h3>
                  <button
                    onClick={clearResults}
                    className="text-gray-500 hover:text-gray-700 text-sm bg-gray-100 px-3 py-1 rounded"
                  >
                    مسح النتائج
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {uploadResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 ${
                        result.success
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {result.success ? (
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-xl">✅</span>
                              </div>
                            ) : (
                              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-xl">❌</span>
                              </div>
                            )}

                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {result.fileName}
                              </p>
                              {result.product && (
                                <p className="text-sm text-gray-600">
                                  المنتج: {result.product.name} (كود:{" "}
                                  {result.product.code})
                                </p>
                              )}
                            </div>
                          </div>

                          <p
                            className={`text-sm ${
                              result.success ? "text-green-700" : "text-red-700"
                            }`}
                          >
                            {result.message || result.error}
                          </p>

                          {result.success && result.imageUrl && (
                            <div className="mt-3 p-2 bg-white rounded border">
                              <div className="flex items-center gap-3">
                                <img
                                  src={result.imageUrl}
                                  alt={result.fileName}
                                  className="w-16 h-16 object-cover rounded border"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-500">
                                    رابط الصورة:
                                  </p>
                                  <a
                                    href={result.imageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 text-sm hover:underline break-all"
                                  >
                                    {result.imageUrl}
                                  </a>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* إجراءات إضافية */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    إجراءات إضافية
                  </h3>
                  <p className="text-gray-600 text-sm">إدارة الصور والمنتجات</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={refreshProductsList}
                    disabled={loadingProducts}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm"
                  >
                    {loadingProducts ? "🔄 جاري..." : "تحديث القائمة"}
                  </button>
                  <button
                    onClick={matchImagesWithProducts}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    فحص تلقائي
                  </button>
                </div>
              </div>
            </div>

            {/* تعليمات */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-3 text-lg">
                🎯 كيف يعمل النظام؟
              </h4>
              <ul className="text-blue-800 text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>
                    اسم الصورة يجب أن يطابق{" "}
                    <code className="bg-blue-100 px-1 rounded">item_code</code>{" "}
                    للمنتج (مثال: 3001.1.jpg)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>
                    سيتم رفع الصورة إلى{" "}
                    <code className="bg-blue-100 px-1 rounded">
                      /home/mounir/images/
                    </code>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>
                    الرابط سيكون:{" "}
                    <code className="bg-blue-100 px-1 rounded">
                      https://www.royakids.shop/images/اسم-الصورة.jpg
                    </code>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>
                    سيتم ربط الصورة تلقائياً مع المنتج في قاعدة البيانات
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>يمكنك رفع multiple صور مرة واحدة</span>
                </li>
              </ul>
            </div>
          </div>

          {/* العمود الأيمن - المنتجات التي تحتاج صور */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 h-fit">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                المنتجات التي تحتاج صور
              </h3>
              <span className="text-sm text-gray-500">
                {loadingProducts
                  ? "جاري التحميل..."
                  : `${productsWithoutImages.length} منتج`}
              </span>
            </div>

            {loadingProducts ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">جاري تحميل المنتجات...</p>
              </div>
            ) : productsWithoutImages.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {productsWithoutImages.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 bg-white px-2 py-1 rounded text-sm border">
                          {product.item_code}
                        </span>
                        <span className="text-gray-600 text-sm truncate">
                          {product.item_name}
                        </span>
                      </div>
                      {product.unique_id && (
                        <p className="text-xs text-gray-400">
                          ID: {product.unique_id}
                        </p>
                      )}
                    </div>
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                      بدون صورة
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🎉</span>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  أحسنت!
                </h4>
                <p className="text-gray-600 text-sm">
                  جميع المنتجات تحتوي على صور
                </p>
              </div>
            )}

            {/* نسبة التقدم */}
            {!loadingProducts && stats.total > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-gray-600">نسبة الإكمال</span>
                  <span className="font-medium">
                    {Math.round((stats.withImages / stats.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(stats.withImages / stats.total) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
