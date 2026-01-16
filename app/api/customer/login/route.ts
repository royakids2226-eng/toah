import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { phone, password } = await request.json();

    // التحقق من البيانات المطلوبة
    if (!phone || !password) {
      return NextResponse.json(
        { error: "رقم الهاتف وكلمة المرور مطلوبان" },
        { status: 400 }
      );
    }

    // البحث عن العميل في قاعدة البيانات
    const customer = await prisma.users.findFirst({
      where: {
        phone: phone,
        position: "عميل",
      },
    });

    // التحقق من وجود العميل
    if (!customer) {
      return NextResponse.json(
        { error: "رقم الهاتف أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    // ✅ التحقق من كلمة المرور بدون bcrypt (مؤقت)
    const isPasswordValid = customer.password === password;

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "رقم الهاتف أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    // إرجاع بيانات العميل (بدون كلمة المرور)
    const customerData = {
      userid: customer.userid,
      usercode: customer.usercode,
      username: customer.username,
      phone: customer.phone,
      position: customer.position,
      permissions: customer.permissions,
    };

    // إنشاء token
    const token = `customer_${customer.userid}_${Date.now()}`;

    return NextResponse.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      user: customerData,
      token: token,
    });
  } catch (error) {
    console.error("Customer login error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
