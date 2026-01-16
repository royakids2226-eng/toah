import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { usercode, password } = await request.json();

    console.log("🔐 محاولة تسجيل دخول:", { usercode, password });

    // التحقق من البيانات المطلوبة
    if (!usercode || !password) {
      return NextResponse.json(
        { error: "كود الموظف وكلمة المرور مطلوبان" },
        { status: 400 }
      );
    }

    // البحث عن المستخدم في قاعدة البيانات
    const user = await prisma.users.findUnique({
      where: { usercode },
    });

    console.log("👤 المستخدم الموجود في DB:", user);

    // التحقق من وجود المستخدم
    if (!user) {
      return NextResponse.json(
        { error: "كود الموظف أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    // التحقق من أن المستخدم موظف أو مدير
    if (user.position !== "موظف" && user.position !== "مدير") {
      return NextResponse.json(
        { error: "غير مسموح بالدخول لهذا الحساب" },
        { status: 403 }
      );
    }

    // ✅ التحقق من كلمة المرور بدون bcrypt (مؤقت)
    const isPasswordValid = user.password === password;

    console.log("🔑 التحقق من كلمة المرور:", {
      enteredPassword: password,
      storedPassword: user.password,
      isValid: isPasswordValid,
    });

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "كود الموظف أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    // إرجاع بيانات المستخدم (بدون كلمة المرور)
    const userData = {
      userid: user.userid,
      usercode: user.usercode,
      username: user.username,
      phone: user.phone,
      position: user.position,
      permissions: user.permissions,
    };

    // إنشاء token
    const token = `employee_${user.userid}_${Date.now()}`;

    console.log("✅ تسجيل دخول ناجح:", userData);

    return NextResponse.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      user: userData,
      token: token,
    });
  } catch (error) {
    console.error("❌ Employee login error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
