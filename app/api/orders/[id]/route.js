import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - جلب طلب محدد بواسطة ID
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const order = await prisma.orders.findUnique({
      where: { id },
      include: {
        order_items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    // ✅ تصحيح: جلب حالة الطلب الحقيقية من قاعدة البيانات
    const formattedOrder = {
      id: order.id,
      customer_name: order.customer_name,
      address: order.address,
      phone: order.phone,
      total_price: parseFloat(order.total_price.toString()),
      status: order.status || "جاري", // ✅ من قاعدة البيانات وليس قيمة ثابتة
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
    };

    return NextResponse.json(formattedOrder);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "فشل في جلب بيانات الطلب" },
      { status: 500 }
    );
  }
}

// PUT - تحديث طلب محدد
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();

    const updatedOrder = await prisma.orders.update({
      where: { id },
      data: {
        ...(data.customer_name && { customer_name: data.customer_name }),
        ...(data.address && { address: data.address }),
        ...(data.phone && { phone: data.phone }),
        ...(data.total_price && { total_price: data.total_price }),
        ...(data.status && { status: data.status }), // ✅ يمكن تحديث الحالة
        ...(data.printed_by && { printed_by: data.printed_by }),
        ...(data.printed_at && { printed_at: new Date(data.printed_at) }),
        ...(data.exported_by && { exported_by: data.exported_by }),
        ...(data.exported_at && { exported_at: new Date(data.exported_at) }),
      },
      include: {
        order_items: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم تحديث الطلب بنجاح",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "فشل في تحديث الطلب" }, { status: 500 });
  }
}

// DELETE - حذف طلب محدد
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    await prisma.orders.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "تم حذف الطلب بنجاح",
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json({ error: "فشل في حذف الطلب" }, { status: 500 });
  }
}
