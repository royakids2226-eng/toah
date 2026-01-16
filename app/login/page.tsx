"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";

export default function UnifiedLogin() {
  const [userType, setUserType] = useState<"customer" | "employee">("customer");
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    usercode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { login } = useAuth();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "userType") {
      setUserType(value as "customer" | "employee");
      setError("");
      setFormData({
        phone: "",
        password: "",
        usercode: "",
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let response;
      let endpoint = "";

      if (userType === "employee") {
        // تحقق من بيانات الموظف
        if (!formData.usercode || !formData.password) {
          setError("كود الموظف وكلمة المرور مطلوبان");
          setLoading(false);
          return;
        }

        endpoint = "/api/employee/login";
        console.log("🔄 إرسال طلب تسجيل دخول موظف:", {
          usercode: formData.usercode,
        });

        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            usercode: formData.usercode,
            password: formData.password,
          }),
        });

        console.log("📨 استجابة API:", response.status);
      } else {
        // تحقق من بيانات العميل
        if (!formData.phone || !formData.password) {
          setError("رقم الهاتف وكلمة المرور مطلوبان");
          setLoading(false);
          return;
        }

        endpoint = "/api/customer/login";
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: formData.phone,
            password: formData.password,
          }),
        });
      }

      const data = await response.json();
      console.log("📊 بيانات الاستجابة:", data);

      if (response.ok && data.success) {
        // ✅ استخدام دالة login من AuthContext
        login(data.user, data.token, userType);

        console.log("✅ تسجيل دخول ناجح، إعادة التوجيه إلى الصفحة الرئيسية");
        router.push("/");
      } else {
        setError(data.error || "فشل في تسجيل الدخول");
        console.log("❌ خطأ في تسجيل الدخول:", data.error);
      }
    } catch (err) {
      setError("حدث خطأ في الاتصال بالخادم");
      console.error("❌ Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    if (userType === "employee") {
      return formData.usercode.trim() && formData.password.trim();
    } else {
      return formData.phone.trim() && formData.password.trim();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-md mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* العنوان */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            تسجيل الدخول
          </h1>
          <p className="text-gray-600">اختر نوع الحساب وأدخل بيانات الدخول</p>
        </div>

        {/* نموذج تسجيل الدخول */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm text-center">{error}</p>
              </div>
            )}

            {/* نوع المستخدم */}
            <div>
              <label
                htmlFor="userType"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                نوع الحساب
              </label>
              <select
                id="userType"
                name="userType"
                value={userType}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg bg-white"
              >
                <option value="customer">عميل</option>
                <option value="employee">موظف</option>
              </select>
            </div>

            {/* حقول الإدخال حسب نوع المستخدم */}
            {userType === "employee" ? (
              /* حقول الموظف */
              <>
                <div>
                  <label
                    htmlFor="usercode"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    كود الموظف
                  </label>
                  <input
                    type="text"
                    id="usercode"
                    name="usercode"
                    value={formData.usercode}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    placeholder="أدخل كود الموظف"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    كلمة المرور
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    placeholder="أدخل كلمة المرور"
                  />
                </div>
              </>
            ) : (
              /* حقول العميل */
              <>
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    placeholder="أدخل رقم الهاتف"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    كلمة المرور
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    placeholder="أدخل كلمة المرور"
                  />
                </div>
              </>
            )}

            {/* زر تسجيل الدخول */}
            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  جاري تسجيل الدخول...
                </span>
              ) : (
                "تسجيل الدخول"
              )}
            </button>
          </form>

          {/* روابط إضافية */}
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
            <p className="text-sm text-gray-600 text-center">
              ليس لديك حساب؟{" "}
              <Link
                href="/register"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                سجل الآن
              </Link>
            </p>

            {userType === "customer" && (
              <p className="text-sm text-gray-600 text-center">
                <Link
                  href="/forgot-password"
                  className="text-blue-600 hover:text-blue-700"
                >
                  نسيت كلمة المرور؟
                </Link>
              </p>
            )}

            {userType === "employee" && (
              <p className="text-sm text-gray-500 text-center">
                للاستفسارات، يرجى التواصل مع المدير المسؤول
              </p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
