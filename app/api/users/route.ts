import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - جلب جميع المستخدمين
export async function GET() {
  try {
    const users = await prisma.users.findMany({
      select: {
        userid: true,
        usercode: true,
        username: true,
        phone: true,
        position: true,
        permissions: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "فشل في جلب بيانات المستخدمين" },
      { status: 500 }
    );
  }
}

// POST - إنشاء مستخدم جديد
export async function POST(request: Request) {
  try {
    const { usercode, username, password, phone, position, permissions } =
      await request.json();

    // التحقق من البيانات المطلوبة
    if (!usercode || !username || !password) {
      return NextResponse.json(
        { error: "كود المستخدم، الاسم، وكلمة المرور مطلوبة" },
        { status: 400 }
      );
    }

    // التحقق إذا كان كود المستخدم موجود مسبقاً
    const existingUser = await prisma.users.findUnique({
      where: { usercode },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "كود المستخدم موجود مسبقاً" },
        { status: 400 }
      );
    }

    // إنشاء المستخدم الجديد
    const newUser = await prisma.users.create({
      data: {
        usercode,
        username,
        password, // في الواقع، يجب تشفير كلمة المرور
        phone: phone || null,
        position: position || "عميل",
        permissions: permissions || "user",
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم إنشاء المستخدم بنجاح",
      user: {
        userid: newUser.userid,
        usercode: newUser.usercode,
        username: newUser.username,
        phone: newUser.phone,
        position: newUser.position,
        permissions: newUser.permissions,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "فشل في إنشاء المستخدم" },
      { status: 500 }
    );
  }
}
