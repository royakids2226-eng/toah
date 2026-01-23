"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import BulkProductsUpload from "@/app/components/BulkProductsUpload";

export default function ProductsManagement() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  
  // ✅ حالات التحديد والترقيم
  const [selectedProducts, setSelectedProducts] = useState([]); 
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50); // عدد المنتجات في كل دفعة
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [productData, setProductData] = useState({
    item_name: "",
    master_code: "",
    item_code: "",
    color: "",
    size: "",
    out_price: "",
    images: "",
    cur_qty: "",
    group_name: "",
    kind_name: "",
  });

  useEffect(() => {
    const checkAdmin = () => {
      try {
        const employee = localStorage.getItem("employee");
        const employeeToken = localStorage.getItem("employeeToken");

        if (!employee || !employeeToken) {
          router.push("/login");
          return;
        }

        const userData = JSON.parse(employee);
        if (userData.position !== "مدير") {
          router.push("/");
          return;
        }

        setUser(userData);
        fetchProducts(1, false); // جلب الصفحة الأولى
      } catch (error) {
        console.error("Error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [router]);

  // ✅ دالة جلب المنتجات (النسخة المصححة)
  const fetchProducts = async (currentPage = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // إرسال limit و page بشكل صريح
      const response = await fetch(`/api/products?page=${currentPage}&limit=${limit}&employee=true`);
      const data = await response.json();
      
      const newProducts = data.products || [];
      
      if (newProducts.length > 0) {
        if (append) {
          // دمج المنتجات الجديدة مع القديمة (مع منع التكرار)
          setProducts(prev => {
            const existingIds = new Set(prev.map(p => p.modelId));
            const uniqueNewProducts = newProducts.filter(p => !existingIds.has(p.modelId));
            return [...prev, ...uniqueNewProducts];
          });
        } else {
          setProducts(newProducts);
        }
        
        // إذا كان عدد المنتجات المرجعة أقل من الحد، فهذا يعني أننا وصلنا للنهاية
        setHasMore(newProducts.length === limit);
        setPage(currentPage);
      } else {
        if (!append) setProducts([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingProduct
        ? `/api/products/${editingProduct.modelId}`
        : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const submitData = {
        ...productData,
        out_price: parseFloat(productData.out_price) || 0,
        cur_qty: parseInt(productData.cur_qty) || 0,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();
      if (result.success) {
        setShowAddForm(false);
        setEditingProduct(null);
        setProductData({ item_name: "", master_code: "", item_code: "", color: "", size: "", out_price: "", images: "", cur_qty: "", group_name: "", kind_name: "" });
        fetchProducts(1, false); // إعادة تحميل من البداية
        alert(editingProduct ? "تم تحديث المنتج بنجاح" : "تم إضافة المنتج بنجاح");
      } else {
        alert(result.error || "فشل في حفظ المنتج");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDelete = async (productId) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    try {
      const response = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      const result = await response.json();
      if (result.success) {
        // حذف المنتج محلياً من المصفوفة لتجنب إعادة التحميل الكامل
        setProducts(prev => prev.filter(p => p.modelId !== productId));
        alert("تم حذف المنتج بنجاح");
      } else {
        alert(result.error || "فشل في حذف المنتج");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("⚠️ تحذير خطير!\nهل أنت متأكد تماماً من حذف جميع المنتجات؟\nهذا الإجراء لا يمكن التراجع عنه!")) return;
    const verification = prompt("للتأكيد، اكتب كلمة 'حذف' في المربع أدناه:");
    if (verification !== "حذف") { alert("إلغاء العملية: الكلمة غير صحيحة."); return; }

    try {
      setIsDeletingAll(true);
      const response = await fetch("/api/products/delete-all", { method: "DELETE" });
      const result = await response.json();
      if (result.success) {
        setProducts([]);
        alert(result.message);
      } else {
        alert(result.error || "فشل في عملية الحذف الجماعي");
      }
    } catch (error) {
      console.error("Error deleting all products:", error);
      alert("حدث خطأ أثناء الاتصال بالسيرفر");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedProducts.length === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedProducts.length} منتج؟`)) return;

    try {
      setIsDeletingSelected(true);
      // حذف المنتجات المحددة بالتتابع
      for (const id of selectedProducts) {
        await fetch(`/api/products/${id}`, { method: "DELETE" });
      }
      
      // تحديث الحالة محلياً
      setProducts(prev => prev.filter(p => !selectedProducts.includes(p.modelId)));
      setSelectedProducts([]);
      alert("تم حذف المنتجات المحددة بنجاح");
    } catch (error) {
      console.error("Error deleting selected:", error);
      alert("حدث خطأ أثناء الحذف");
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = filteredProducts.map(p => p.modelId);
      setSelectedProducts(allIds);
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (id) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter(item => item !== id));
    } else {
      setSelectedProducts([...selectedProducts, id]);
    }
  };

  // فلترة محلية للبحث السريع في المنتجات المحملة حالياً
  const filteredProducts = products.filter(
    (product) =>
      product.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.master_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && page === 1) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري تحميل المنتجات...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-[95%] mx-auto py-8 px-2 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">إدارة المنتجات</h1>
              <p className="text-gray-600 mt-2">إضافة، تعديل وحذف منتجات المتجر</p>
            </div>
            
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <button onClick={() => setShowAddForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex-1 md:flex-none">+ إضافة</button>
              <button onClick={() => setShowBulkUpload(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex-1 md:flex-none">📊 إضافة متعددة</button>
              
              {selectedProducts.length > 0 && (
                <button 
                  onClick={handleDeleteSelected}
                  disabled={isDeletingSelected}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium text-sm flex-1 md:flex-none flex items-center gap-2"
                >
                  {isDeletingSelected ? "جاري الحذف..." : `🗑️ حذف المحدد (${selectedProducts.length})`}
                </button>
              )}

              {products.length > 0 && selectedProducts.length === 0 && (
                <button 
                  onClick={handleDeleteAll} 
                  disabled={isDeletingAll} 
                  className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 transition-colors font-medium text-sm flex-1 md:flex-none"
                >
                  {isDeletingAll ? "جاري الحذف..." : "⚠️ حذف الكل"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="ابحث بالاسم أو الكود..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-sm text-gray-500">
              المعروض: <span className="font-bold">{filteredProducts.length}</span> منتج
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full relative">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-right w-10">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={selectedProducts.length > 0 && selectedProducts.length === filteredProducts.length}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنتج</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكود</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكمية</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التصنيف</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.modelId} className={`hover:bg-gray-50 ${selectedProducts.includes(product.modelId) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        checked={selectedProducts.includes(product.modelId)}
                        onChange={() => handleSelectProduct(product.modelId)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img className="h-10 w-10 rounded-lg object-cover" src={product.variants?.[0]?.imageUrl || "/placeholder.jpg"} alt={product.item_name} onError={(e) => { e.target.style.display = 'none'; }} />
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={product.item_name}>{product.item_name || "بدون اسم"}</div>
                          <div className="text-sm text-gray-500">{product.variants?.length || 0} لون</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{product.master_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{product.price} ج.م</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.cur_qty > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {product.cur_qty}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.group_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button onClick={() => {
                          setEditingProduct(product);
                          setProductData({
                            item_name: product.item_name || "",
                            master_code: product.master_code || "",
                            item_code: product.item_code || "",
                            color: product.variants?.[0]?.color || "",
                            size: product.variants?.[0]?.sizes?.[0] || "",
                            out_price: product.price?.toString() || "0",
                            images: product.variants?.[0]?.imageUrl || "",
                            cur_qty: product.cur_qty?.toString() || "0",
                            group_name: product.group_name || "",
                            kind_name: product.kind_name || "",
                          });
                          setShowAddForm(true);
                        }} className="text-blue-600 hover:text-blue-900">تعديل</button>
                        <button onClick={() => handleDelete(product.modelId)} className="text-red-600 hover:text-red-900">حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* ✅ زر تحميل المزيد (يظهر فقط إذا كان هناك المزيد ولا يوجد بحث نشط) */}
          {hasMore && !searchTerm && (
            <div className="p-4 text-center border-t border-gray-200">
              <button 
                onClick={() => fetchProducts(page + 1, true)}
                disabled={loadingMore}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-full hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                    جاري التحميل...
                  </>
                ) : (
                  "⬇️ تحميل المزيد"
                )}
              </button>
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📦</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد منتجات</h3>
            </div>
          )}
        </div>

        {/* Modal Form remains the same */}
        {(showAddForm || editingProduct) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">{editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</h3>
                  <button onClick={() => { setShowAddForm(false); setEditingProduct(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Fields... */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج *</label><input type="text" required value={productData.item_name} onChange={(e) => setProductData({...productData, item_name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">الكود الرئيسي *</label><input type="text" required value={productData.master_code} onChange={(e) => setProductData({...productData, master_code: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">كود الصنف</label><input type="text" value={productData.item_code} onChange={(e) => setProductData({...productData, item_code: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">السعر *</label><input type="number" required value={productData.out_price} onChange={(e) => setProductData({...productData, out_price: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">الكمية *</label><input type="number" required value={productData.cur_qty} onChange={(e) => setProductData({...productData, cur_qty: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">اللون</label><input type="text" value={productData.color} onChange={(e) => setProductData({...productData, color: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">المقاس</label><input type="text" value={productData.size} onChange={(e) => setProductData({...productData, size: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">رابط الصورة</label><input type="url" value={productData.images} onChange={(e) => setProductData({...productData, images: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label><input type="text" value={productData.group_name} onChange={(e) => setProductData({...productData, group_name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">النوع</label><input type="text" value={productData.kind_name} onChange={(e) => setProductData({...productData, kind_name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                  </div>
                  <div className="flex gap-4 justify-end pt-6 border-t border-gray-200">
                    <button type="button" onClick={() => { setShowAddForm(false); setEditingProduct(null); }} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">إلغاء</button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingProduct ? "تحديث" : "إضافة"}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showBulkUpload && (
          <BulkProductsUpload onClose={() => setShowBulkUpload(false)} onSuccess={() => { fetchProducts(1, false); setShowBulkUpload(false); }} />
        )}
      </div>
    </div>
  );
}