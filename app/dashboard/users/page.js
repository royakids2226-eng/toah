"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";

export default function UsersManagement() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // بيانات المستخدم الجديد
  const [userData, setUserData] = useState({
    usercode: "",
    username: "",
    password: "",
    phone: "",
    position: "موظف",
    permissions: "view_products",
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
        fetchUsers();
      } catch (error) {
        console.error("Error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingUser
        ? `/api/users/${editingUser.userid}`
        : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();
      if (result.success) {
        setShowAddForm(false);
        setEditingUser(null);
        setUserData({
          usercode: "",
          username: "",
          password: "",
          phone: "",
          position: "موظف",
          permissions: "view_products",
        });
        fetchUsers();
        alert(
          editingUser ? "تم تحديث المستخدم بنجاح" : "تم إضافة المستخدم بنجاح"
        );
      } else {
        alert(result.error || "فشل في حفظ المستخدم");
      }
    } catch (error) {
      console.error("Error saving user:", error);
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟")) return;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        fetchUsers();
        alert("تم حذف المستخدم بنجاح");
      } else {
        alert(result.error || "فشل في حذف المستخدم");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.usercode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPositionColor = (position) => {
    switch (position) {
      case "مدير":
        return "bg-purple-100 text-purple-800";
      case "موظف":
        return "bg-blue-100 text-blue-800";
      case "عميل":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
        {/* رأس الصفحة */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                إدارة المستخدمين
              </h1>
              <p className="text-gray-600 mt-2">
                إدارة حسابات الموظفين والعملاء والصلاحيات
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + إضافة مستخدم جديد
            </button>
          </div>
        </div>

        {/* شريط البحث */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="ابحث بالاسم أو الكود أو المنصب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">جميع المناصب</option>
                <option value="مدير">مدير</option>
                <option value="موظف">موظف</option>
                <option value="عميل">عميل</option>
              </select>
            </div>
          </div>
        </div>

        {/* جدول المستخدمين */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المستخدم
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الكود
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الهاتف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المنصب
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاريخ الإنشاء
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.userid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {user.username?.charAt(0) || "U"}
                          </span>
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.username}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.permissions}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.usercode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.phone || "غير محدد"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPositionColor(
                          user.position
                        )}`}
                      >
                        {user.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setUserData({
                              usercode: user.usercode,
                              username: user.username,
                              password: "",
                              phone: user.phone || "",
                              position: user.position,
                              permissions: user.permissions,
                            });
                            setShowAddForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          تعديل
                        </button>
                        {user.position !== "مدير" && (
                          <button
                            onClick={() => handleDelete(user.userid)}
                            className="text-red-600 hover:text-red-900"
                          >
                            حذف
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* نموذج إضافة/تعديل المستخدم */}
        {(showAddForm || editingUser) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingUser ? "تعديل المستخدم" : "إضافة مستخدم جديد"}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingUser(null);
                      setUserData({
                        usercode: "",
                        username: "",
                        password: "",
                        phone: "",
                        position: "موظف",
                        permissions: "view_products",
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      كود المستخدم *
                    </label>
                    <input
                      type="text"
                      required
                      value={userData.usercode}
                      onChange={(e) =>
                        setUserData({ ...userData, usercode: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      اسم المستخدم *
                    </label>
                    <input
                      type="text"
                      required
                      value={userData.username}
                      onChange={(e) =>
                        setUserData({ ...userData, username: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      كلمة المرور {!editingUser && "*"}
                    </label>
                    <input
                      type="password"
                      required={!editingUser}
                      value={userData.password}
                      onChange={(e) =>
                        setUserData({ ...userData, password: e.target.value })
                      }
                      placeholder={
                        editingUser
                          ? "اتركه فارغاً للحفاظ على كلمة المرور الحالية"
                          : ""
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      value={userData.phone}
                      onChange={(e) =>
                        setUserData({ ...userData, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      المنصب *
                    </label>
                    <select
                      value={userData.position}
                      onChange={(e) =>
                        setUserData({ ...userData, position: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="موظف">موظف</option>
                      <option value="مدير">مدير</option>
                      <option value="عميل">عميل</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الصلاحيات
                    </label>
                    <select
                      value={userData.permissions}
                      onChange={(e) =>
                        setUserData({
                          ...userData,
                          permissions: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="view_products">عرض المنتجات فقط</option>
                      <option value="manage_products">إدارة المنتجات</option>
                      <option value="full_access">صلاحيات كاملة</option>
                    </select>
                  </div>

                  <div className="flex gap-4 justify-end pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingUser(null);
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {editingUser ? "تحديث" : "إضافة"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
