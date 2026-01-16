"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import OrdersTable from "@/app/components/OrdersTable";

export default function OrdersManagement() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0); // ✅ جديد: trigger للتحديث

  useEffect(() => {
    const checkEmployee = () => {
      try {
        const employee = localStorage.getItem("employee");
        const employeeToken = localStorage.getItem("employeeToken");

        if (!employee || !employeeToken) {
          router.push("/login");
          return;
        }

        const userData = JSON.parse(employee);

        if (userData.position !== "موظف" && userData.position !== "مدير") {
          router.push("/");
          return;
        }

        setUser(userData);
        fetchOrders();
      } catch (error) {
        console.error("Error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkEmployee();
  }, [router, refreshTrigger]); // ✅ إضافة refreshTrigger ك dependency

  const fetchOrders = async () => {
    try {
      console.log("🔄 جاري جلب البيانات من الخادم...");
      const response = await fetch("/api/orders");

      if (!response.ok) {
        throw new Error(`خطأ في الخادم: ${response.status}`);
      }

      const data = await response.json();
      console.log("📦 البيانات المستلمة:", data.length, "طلب");

      setOrders(data || []);
      setFilteredOrders(data || []);
    } catch (error) {
      console.error("❌ Error fetching orders:", error);
      // إذا فشل جلب البيانات، نستخدم بيانات وهمية للعرض
      setOrders(getMockOrders());
    }
  };

  // ✅ دالة جديدة لإجبار التحديث
  const forceRefresh = () => {
    console.log("🔄 إجبار تحديث البيانات...");
    setRefreshTrigger((prev) => prev + 1);
  };

  // بيانات وهمية احتياطية
  const getMockOrders = () => {
    return [
      {
        id: "ORD-001",
        customer_name: "أحمد محمد",
        phone: "0123456789",
        address: "العنوان التجريبي ١",
        total_price: 450,
        status: "جاري",
        printed_by: null,
        printed_at: null,
        exported_by: null,
        exported_at: null,
        timestamp: new Date("2024-01-15").toISOString(),
        items: [
          {
            product: "قميص أولادي 3001 - اللون: أخضر - المقاس: M",
            quantity: 2,
            price: 150,
            color: "أخضر",
            item_code: "3001.1",
          },
        ],
      },
      {
        id: "ORD-002",
        customer_name: "فاطمة أحمد",
        phone: "0111222333",
        address: "العنوان التجريبي ٢",
        total_price: 320,
        status: "تم",
        printed_by: "محمد أحمد",
        printed_at: new Date("2024-01-14").toISOString(),
        exported_by: null,
        exported_at: null,
        timestamp: new Date("2024-01-14").toISOString(),
        items: [
          {
            product: "فساتين أطفال 4002 - اللون: وردي - المقاس: L",
            quantity: 1,
            price: 200,
            color: "وردي",
            item_code: "4002.3",
          },
        ],
      },
    ];
  };

  // ✅ دوال جديدة للطباعة والتصدير - محدثة
  const handlePrint = async (orderId) => {
    try {
      console.log("🖨️ بدء عملية الطباعة للطلب:", orderId);

      const response = await fetch("/api/orders/print", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          printedBy: user.username,
        }),
      });

      const result = await response.json();
      console.log("📄 استجابة API الطباعة:", result);

      if (result.success) {
        alert("✅ تم تحديث حالة الطلب إلى 'تم' وتسجيل عملية الطباعة");

        // ✅ تحديث فوري للواجهة بدون انتظار
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  status: "تم",
                  printed_by: user.username,
                  printed_at: new Date().toISOString(),
                }
              : order
          )
        );

        // ✅ أيضاً نجلب البيانات من الخادم للتأكد
        setTimeout(() => {
          forceRefresh();
        }, 500);
      } else {
        alert("❌ فشل في تحديث حالة الطلب: " + result.error);
      }
    } catch (error) {
      console.error("❌ خطأ في الاتصال:", error);
      alert("❌ خطأ في الاتصال");
    }
  };

  const handleExport = async (orderId) => {
    try {
      const response = await fetch("/api/orders/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          exportedBy: user.username,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ تم تسجيل عملية التصدير بنجاح");

        // ✅ تحديث فوري للواجهة
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  exported_by: user.username,
                  exported_at: new Date().toISOString(),
                }
              : order
          )
        );
      } else {
        alert("❌ فشل في تسجيل التصدير: " + result.error);
      }
    } catch (error) {
      alert("❌ خطأ في الاتصال");
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      console.log("🔄 تغيير حالة الطلب:", orderId, "إلى:", newStatus);

      const response = await fetch("/api/orders/status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          status: newStatus,
        }),
      });

      const result = await response.json();
      console.log("📄 استجابة API تغيير الحالة:", result);

      if (result.success) {
        alert("✅ تم تحديث حالة الطلب بنجاح");

        // ✅ تحديث فوري للواجهة
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
      } else {
        alert("❌ فشل في تحديث الحالة: " + result.error);
      }
    } catch (error) {
      console.error("❌ خطأ في الاتصال:", error);
      alert("❌ خطأ في الاتصال");
    }
  };

  // ✅ تصفية الطلبات - محدث
  useEffect(() => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.customer_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.phone?.includes(searchTerm)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [searchTerm, statusFilter, orders]); // ✅ إضافة orders ك dependency

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
        {/* رأس الصفحة - محدث */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                إدارة الطلبات
              </h1>
              <p className="text-gray-600 mt-2">
                عرض، طباعة، وتصدير طلبات العملاء
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {user?.position} 👨‍💼
              </div>
              <button
                onClick={forceRefresh} // ✅ استخدام forceRefresh بدلاً من fetchOrders مباشرة
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                🔄 تحديث البيانات
              </button>
            </div>
          </div>
        </div>

        {/* إحصائيات سريعة - محدثة */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {orders.length}
            </div>
            <div className="text-sm text-gray-600">إجمالي الطلبات</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {orders.filter((o) => o.status === "جاري").length}
            </div>
            <div className="text-sm text-gray-600">جاري</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-green-600">
              {orders.filter((o) => o.status === "تم").length}
            </div>
            <div className="text-sm text-gray-600">تم</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {orders.filter((o) => o.printed_by).length}
            </div>
            <div className="text-sm text-gray-600">مطبوع</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {orders.filter((o) => o.exported_by).length}
            </div>
            <div className="text-sm text-gray-600">مُصدر</div>
          </div>
        </div>

        {/* شريط البحث والإجراءات */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="ابحث باسم العميل، رقم الهاتف، أو رقم الطلب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">جميع الحالات</option>
                <option value="جاري">جاري</option>
                <option value="تم">تم</option>
              </select>
            </div>
          </div>
        </div>

        {/* ✅ استبدال الجدول القديم بالمكون الجديد */}
        <OrdersTable
          orders={filteredOrders}
          onPrint={handlePrint}
          onExport={handleExport}
          onStatusChange={handleStatusChange}
          currentUser={user}
          onRefresh={forceRefresh} // ✅ تمرير دالة التحديث
        />
      </div>
    </div>
  );
}
