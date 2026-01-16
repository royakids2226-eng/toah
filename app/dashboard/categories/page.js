"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";

export default function CategoriesManagement() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    image: "",
    kind: "جنس", // القيمة الافتراضية
    sub: "",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/categories");
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ الحصول على التصنيفات الرئيسية (نوع "جنس") فقط
  const getParentCategories = () => {
    return categories.filter((category) => category.kind === "جنس");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingCategory ? "/api/categories" : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";

      // ✅ إذا كان النوع "جنس"، نضع sub كقيمة فارغة
      const submitData = {
        ...formData,
        sub: formData.kind === "جنس" ? "" : formData.sub,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingCategory
            ? { id: editingCategory.id, ...submitData }
            : submitData
        ),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        setShowForm(false);
        setEditingCategory(null);
        setFormData({ name: "", image: "", kind: "جنس", sub: "" });
        fetchCategories();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("فشل في حفظ التصنيف");
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      image: category.image || "",
      kind: category.kind,
      sub: category.sub || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذا التصنيف؟")) return;

    try {
      const response = await fetch(`/api/categories?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        fetchCategories();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("فشل في حذف التصنيف");
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: "", image: "", kind: "جنس", sub: "" });
  };

  // ✅ عند تغيير نوع التصنيف، نعيد تعيين التصنيف الفرعي
  const handleKindChange = (kind) => {
    setFormData({
      ...formData,
      kind,
      sub: kind === "جنس" ? "" : formData.sub,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* رأس الصفحة */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                إدارة التصنيفات
              </h1>
              <p className="text-gray-600 mt-2">إضافة، تعديل وحذف التصنيفات</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + إضافة تصنيف جديد
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* قائمة التصنيفات */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  التصنيفات ({categories.length})
                </h2>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">جاري تحميل التصنيفات...</p>
                </div>
              ) : categories.length > 0 ? (
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          التصنيف
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          النوع
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          التصنيف الرئيسي
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الإجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {categories.map((category) => (
                        <tr key={category.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {category.image && (
                                <img
                                  src={category.image}
                                  alt={category.name}
                                  className="w-10 h-10 rounded-lg object-cover ml-3"
                                />
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {category.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ID: {category.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                category.kind === "جنس"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {category.kind}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {category.sub ? (
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                                {category.sub}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(category)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={() => handleDelete(category.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">📁</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    لا توجد تصنيفات
                  </h3>
                  <p className="text-gray-600">
                    ابدأ بإضافة تصنيفات جديدة للمتجر
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* نموذج الإضافة/التعديل */}
          {showForm && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingCategory ? "تعديل التصنيف" : "إضافة تصنيف جديد"}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      اسم التصنيف *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="أدخل اسم التصنيف"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رابط الصورة
                    </label>
                    <input
                      type="url"
                      value={formData.image}
                      onChange={(e) =>
                        setFormData({ ...formData, image: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  {/* ✅ حقل النوع المحدث - خيارين فقط */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      النوع *
                    </label>
                    <select
                      required
                      value={formData.kind}
                      onChange={(e) => handleKindChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="جنس">جنس (تصنيف رئيسي)</option>
                      <option value="نوع">نوع (تصنيف فرعي)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.kind === "جنس"
                        ? "التصنيفات الرئيسية مثل: أولاد، بنات"
                        : "التصنيفات الفرعية مثل: تيشيرت، بنطلون"}
                    </p>
                  </div>

                  {/* ✅ حقل التصنيف الفرعي المحدث */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.kind === "نوع"
                        ? "التصنيف الرئيسي *"
                        : "التصنيف الرئيسي"}
                    </label>
                    <select
                      value={formData.sub}
                      onChange={(e) =>
                        setFormData({ ...formData, sub: e.target.value })
                      }
                      disabled={formData.kind === "جنس"}
                      required={formData.kind === "نوع"}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formData.kind === "جنس"
                          ? "bg-gray-100 text-gray-500"
                          : ""
                      }`}
                    >
                      <option value="">
                        {formData.kind === "جنس"
                          ? "غير مطلوب للتصنيفات الرئيسية"
                          : "اختر التصنيف الرئيسي"}
                      </option>
                      {getParentCategories().map((parent) => (
                        <option key={parent.id} value={parent.name}>
                          {parent.name}
                        </option>
                      ))}
                    </select>
                    {formData.kind === "جنس" && (
                      <p className="text-xs text-gray-500 mt-1">
                        التصنيفات الرئيسية لا تحتاج إلى تصنيف أب
                      </p>
                    )}
                    {formData.kind === "نوع" && (
                      <p className="text-xs text-gray-500 mt-1">
                        اختر التصنيف الرئيسي الذي يندرج تحته هذا النوع
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {editingCategory ? "تحديث" : "إضافة"}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
