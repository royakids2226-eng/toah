"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

interface Employee {
  userid: number;
  usercode: string;
  username: string;
  phone: string | null;
  position: string;
  permissions: string;
}

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // التحقق من تسجيل الدخول
    const employeeData = localStorage.getItem("employee");
    const token = localStorage.getItem("employeeToken");

    if (!employeeData || !token) {
      router.push("/employee/login");
      return;
    }

    setEmployee(JSON.parse(employeeData));
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("employee");
    localStorage.removeItem("employeeToken");
    router.push("/employee/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">جاري التحميل...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* شريط التحكم */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                لوحة تحكم الموظفين
              </h1>
              <p className="text-gray-600 mt-1">
                مرحباً بعودتك، {employee?.username}
              </p>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  employee?.position === "مدير"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {employee?.position}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">الطلبات اليوم</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">طلبات مكتملة</p>
                <p className="text-2xl font-bold text-gray-900">8</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">طلبات قيد الانتظار</p>
                <p className="text-2xl font-bold text-gray-900">4</p>
              </div>
            </div>
          </div>
        </div>

        {/* معلومات الحساب */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            معلومات الحساب
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">اسم الموظف</p>
              <p className="text-lg font-medium text-gray-900">
                {employee?.username}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">كود الموظف</p>
              <p className="text-lg font-medium text-gray-900">
                {employee?.usercode}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">رقم الهاتف</p>
              <p className="text-lg font-medium text-gray-900">
                {employee?.phone || "غير محدد"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">الصلاحيات</p>
              <p className="text-lg font-medium text-gray-900">
                {employee?.permissions}
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
