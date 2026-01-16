"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Link from "next/link";

interface Order {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  total_price: number;
  status: string;
  timestamp: string;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });

  useEffect(() => {
    const checkCustomer = () => {
      try {
        const customerData = localStorage.getItem("customer");
        const customerToken = localStorage.getItem("customerToken");

        if (!customerData || !customerToken) {
          router.push("/login");
          return;
        }

        const userData = JSON.parse(customerData);
        setCustomer(userData);
        fetchCustomerOrders(userData.phone);
      } catch (error) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkCustomer();
  }, [router]);

  const fetchCustomerOrders = async (phone: string) => {
    try {
      const response = await fetch("/api/orders");
      const allOrders = await response.json();

      // تصفية الطلبات الخاصة بالعميل فقط
      const customerOrders = allOrders.filter(
        (order: Order) => order.phone === phone
      );
      setOrders(customerOrders);

      setStats({
        totalOrders: customerOrders.length,
        pendingOrders: customerOrders.filter((o: Order) => o.status === "جاري")
          .length,
        completedOrders: customerOrders.filter((o: Order) => o.status === "تم")
          .length,
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("customer");
    localStorage.removeItem("customerToken");
    router.push("/");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* رأس الداشبورد */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                لوحة تحكم العميل
              </h1>
              <p className="text-gray-600 mt-2">
                مرحباً بعودتك، {customer?.username} 👋
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                👤 عميل
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalOrders}
            </div>
            <div className="text-sm text-gray-600">إجمالي الطلبات</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {stats.pendingOrders}
            </div>
            <div className="text-sm text-gray-600">طلبات قيد التنفيذ</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.completedOrders}
            </div>
            <div className="text-sm text-gray-600">طلبات مكتملة</div>
          </div>
        </div>

        {/* بطاقات الإجراءات */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link href="/customer/orders" className="block group">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 hover:border-blue-300 h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">📋</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                طلباتي
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                عرض وتتبع جميع طلباتك السابقة والحالية
              </p>
            </div>
          </Link>

          <Link href="/" className="block group">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 hover:border-green-300 h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🛒</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                متابعة التسوق
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                العودة للمتجر ومشاهدة أحدث المنتجات والعروض
              </p>
            </div>
          </Link>
        </div>

        {/* آخر الطلبات */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">آخر الطلبات</h3>
            <Link
              href="/customer/orders"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              عرض الكل
            </Link>
          </div>

          {orders.slice(0, 5).map((order) => (
            <div
              key={order.id}
              className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0"
            >
              <div>
                <div className="font-medium text-gray-900">{order.id}</div>
                <div className="text-sm text-gray-500">{order.address}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">
                  {formatCurrency(order.total_price)}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    order.status === "تم"
                      ? "bg-green-100 text-green-800"
                      : "bg-orange-100 text-orange-800"
                  }`}
                >
                  {order.status}
                </span>
              </div>
            </div>
          ))}

          {orders.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-3">📦</div>
              <p className="text-gray-600">لا توجد طلبات حتى الآن</p>
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block"
              >
                ابدأ التسوق الآن
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
