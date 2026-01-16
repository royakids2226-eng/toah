import * as XLSX from "xlsx";

export const exportToExcel = (orders, fileName = "الطلبات") => {
  // تحضير البيانات للتصدير بنفس شكل الطباعة
  const excelData = [];

  orders.forEach((order) => {
    // إضافة رأس الطلب
    excelData.push({
      "نوع البيانات": "معلومات الطلب",
      "القيمة 1": `رقم الطلب: ${order.id}`,
      "القيمة 2": `التاريخ: ${new Date(order.timestamp).toLocaleDateString(
        "ar-EG"
      )}`,
      "القيمة 3": "",
      "القيمة 4": "",
      "القيمة 5": "",
      "القيمة 6": "",
    });

    // إضافة معلومات العميل
    excelData.push({
      "نوع البيانات": "معلومات العميل",
      "القيمة 1": `الاسم: ${order.customer_name}`,
      "القيمة 2": `الهاتف: ${order.phone}`,
      "القيمة 3": `العنوان: ${order.address}`,
      "القيمة 4": "",
      "القيمة 5": "",
      "القيمة 6": "",
    });

    // إضافة معلومات الطلب
    excelData.push({
      "نوع البيانات": "معلومات الطلب",
      "القيمة 1": `الحالة: ${order.status}`,
      "القيمة 2": `المبلغ الإجمالي: ${order.total_price} ج.م`,
      "القيمة 3": order.printed_by
        ? `تم الطباعة بواسطة: ${order.printed_by}`
        : "",
      "القيمة 4": order.printed_at
        ? `تاريخ الطباعة: ${new Date(order.printed_at).toLocaleDateString(
            "ar-EG"
          )}`
        : "",
      "القيمة 5": "",
      "القيمة 6": "",
    });

    // إضافة رأس جدول المنتجات
    excelData.push({
      "نوع البيانات": "المنتجات المطلوبة",
      "القيمة 1": "كود المنتج",
      "القيمة 2": "اسم المنتج",
      "القيمة 3": "اللون",
      "القيمة 4": "الكمية",
      "القيمة 5": "سعر الوحدة",
      "القيمة 6": "الإجمالي",
    });

    // إضافة المنتجات
    order.items?.forEach((item, index) => {
      excelData.push({
        "نوع البيانات": `منتج ${index + 1}`,
        "القيمة 1": item.item_code || "غير محدد",
        "القيمة 2": item.product,
        "القيمة 3": item.color || "غير محدد",
        "القيمة 4": item.quantity,
        "القيمة 5": item.price,
        "القيمة 6": item.quantity * item.price,
      });
    });

    // إضافة الإجمالي
    excelData.push({
      "نوع البيانات": "الإجمالي النهائي",
      "القيمة 1": "",
      "القيمة 2": "",
      "القيمة 3": "",
      "القيمة 4": "",
      "القيمة 5": "",
      "القيمة 6": order.total_price,
    });

    // إضافة مسافة بين الطلبات
    excelData.push({
      "نوع البيانات": "",
      "القيمة 1": "",
      "القيمة 2": "",
      "القيمة 3": "",
      "القيمة 4": "",
      "القيمة 5": "",
      "القيمة 6": "",
    });

    excelData.push({
      "نوع البيانات": "",
      "القيمة 1": "",
      "القيمة 2": "",
      "القيمة 3": "",
      "القيمة 4": "",
      "القيمة 5": "",
      "القيمة 6": "",
    });
  });

  // إنشاء workbook جديد
  const workbook = XLSX.utils.book_new();

  // إنشاء worksheet من البيانات
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // إضافة worksheet إلى workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "الطلبات");

  // تنسيق الأعمدة
  const columnWidths = [
    { wch: 20 }, // نوع البيانات
    { wch: 25 }, // القيمة 1
    { wch: 25 }, // القيمة 2
    { wch: 15 }, // القيمة 3
    { wch: 10 }, // القيمة 4
    { wch: 12 }, // القيمة 5
    { wch: 12 }, // القيمة 6
  ];

  worksheet["!cols"] = columnWidths;

  // كتابة الملف وتنزيله
  XLSX.writeFile(
    workbook,
    `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`
  );
};

// ✅ دالة جديدة لتصدير طلب واحد بنفس شكل الطباعة
export const exportSingleOrder = (order) => {
  const excelData = [];

  // رأس الفاتورة
  excelData.push({
    " ": "فاتورة طلب",
    "  ": "",
    "   ": "",
    "    ": "",
    "     ": "",
    "      ": "",
  });

  excelData.push({
    " ": `رقم الطلب: ${order.id}`,
    "  ": `التاريخ: ${new Date(order.timestamp).toLocaleDateString("ar-EG")}`,
    "   ": "",
    "    ": "",
    "     ": "",
    "      ": "",
  });

  // معلومات العميل
  excelData.push({
    " ": "معلومات العميل",
    "  ": "",
    "   ": "",
    "    ": "",
    "     ": "",
    "      ": "",
  });

  excelData.push({
    " ": `الاسم: ${order.customer_name}`,
    "  ": `الهاتف: ${order.phone}`,
    "   ": `العنوان: ${order.address}`,
    "    ": "",
    "     ": "",
    "      ": "",
  });

  // معلومات الطلب
  excelData.push({
    " ": "معلومات الطلب",
    "  ": "",
    "   ": "",
    "    ": "",
    "     ": "",
    "      ": "",
  });

  excelData.push({
    " ": `الحالة: ${order.status}`,
    "  ": `المبلغ الإجمالي: ${order.total_price} ج.م`,
    "   ": order.printed_by ? `تم الطباعة بواسطة: ${order.printed_by}` : "",
    "    ": order.printed_at
      ? `تاريخ الطباعة: ${new Date(order.printed_at).toLocaleDateString(
          "ar-EG"
        )}`
      : "",
    "     ": "",
    "      ": "",
  });

  // رأس جدول المنتجات
  excelData.push({
    " ": "كود المنتج",
    "  ": "اسم المنتج",
    "   ": "اللون",
    "    ": "الكمية",
    "     ": "سعر الوحدة",
    "      ": "الإجمالي",
  });

  // المنتجات
  order.items?.forEach((item, index) => {
    excelData.push({
      " ": item.item_code || "غير محدد",
      "  ": item.product,
      "   ": item.color || "غير محدد",
      "    ": item.quantity,
      "     ": item.price,
      "      ": item.quantity * item.price,
    });
  });

  // الإجمالي
  excelData.push({
    " ": "الإجمالي النهائي",
    "  ": "",
    "   ": "",
    "    ": "",
    "     ": "",
    "      ": order.total_price,
  });

  // ملاحظات
  excelData.push({
    " ": "ملاحظات:",
    "  ": "يرجى الاحتفاظ بهذه الفاتورة كإثبات للشراء",
    "   ": "للاستفسارات، يرجى الاتصال على رقم خدمة العملاء",
    "    ": "شكراً لثقتكم بمتجر أحلام للأطفال",
    "     ": "",
    "      ": "",
  });

  // إنشاء workbook جديد
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  XLSX.utils.book_append_sheet(workbook, worksheet, `طلب_${order.id}`);

  // تنسيق الأعمدة
  const columnWidths = [
    { wch: 20 },
    { wch: 25 },
    { wch: 25 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ];

  worksheet["!cols"] = columnWidths;

  XLSX.writeFile(
    workbook,
    `طلب_${order.id}_${new Date().toISOString().split("T")[0]}.xlsx`
  );
};
