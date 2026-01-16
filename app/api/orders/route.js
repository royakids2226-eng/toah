import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - جلب جميع الطلبات
export async function GET() {
  try {
    const orders = await prisma.orders.findMany({
      include: {
        order_items: true,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    console.log("🔍 جلب الطلبات من DB - العينة الأولى:", {
      id: orders[0]?.id,
      status: orders[0]?.status, // ✅ للتحقق من القيمة الحقيقية
      جميع_الحقول: Object.keys(orders[0] || {}),
    });

    // ✅ التصحيح: استخدام القيمة الحقيقية من قاعدة البيانات
    const formattedOrders = orders.map((order) => ({
      id: order.id,
      customer_name: order.customer_name,
      address: order.address,
      phone: order.phone,
      total_price: parseFloat(order.total_price.toString()),
      status: order.status, // ✅ من قاعدة البيانات مباشرة - إزالة "معلق"
      timestamp: order.timestamp,
      printed_by: order.printed_by || null,
      printed_at: order.printed_at || null,
      exported_by: order.exported_by || null,
      exported_at: order.exported_at || null,
      items: order.order_items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        price: parseFloat(item.price.toString()),
        color: item.color,
        item_code: item.item_code,
      })),
    }));

    return NextResponse.json(formattedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "فشل في جلب بيانات الطلبات" },
      { status: 500 }
    );
  }
}

// POST - إنشاء طلب جديد
export async function POST(request) {
  try {
    const data = await request.json();

    // ✅ تعديل: دمج اسم المنتج + اللون + المقاس في عمود product
    const orderItemsWithMergedNames = data.items.map((item) => ({
      ...item,
      // دمج اسم المنتج مع اللون والمقاس
      product: `${item.product} - اللون: ${
        item.color || "غير محدد"
      } - المقاس: ${item.size || "غير محدد"}`,
    }));

    // إنشاء الطلب
    const order = await prisma.orders.create({
      data: {
        id: `ORD-${Date.now()}`,
        customer_name: data.customer_name,
        address: data.address,
        phone: data.phone,
        total_price: data.total_price,
        status: "جاري", // ✅ القيمة الافتراضية من السكيما
        order_items: {
          create: orderItemsWithMergedNames.map((item) => ({
            product: item.product, // ✅ الآن يحتوي على الاسم + اللون + المقاس
            quantity: item.quantity,
            price: item.price,
            color: item.color,
            item_code: item.item_code,
          })),
        },
      },
      include: {
        order_items: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم إنشاء الطلب بنجاح",
      order,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "فشل في إنشاء الطلب" }, { status: 500 });
  }
}
