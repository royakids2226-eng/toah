import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const companyInfo = await prisma.company_info.findFirst();

    if (!companyInfo) {
      // إرجاع بيانات افتراضية إذا لم توجد في قاعدة البيانات
      return NextResponse.json({
        company_name: "متجر أحلام للأطفال",
        address: "العنوان الافتراضي - المدينة",
        logo: null,
        email: "info@ahlam-store.com",
        facebook_url: "https://facebook.com/ahlamstore",
        instagram_url: "https://instagram.com/ahlamstore",
        tiktok_url: "https://tiktok.com/@ahlamstore",
        phone1: "0123456789",
        phone2: null,
        phone3: null,
        terms_conditions: `شروط وأحكام استخدام الموقع

المقدمة:
مرحباً بكم في متجر أحلام للأطفال. باستخدامك لهذا الموقع، فإنك توافق على الالتزام بالشروط والأحكام التالية.

1. القبول بالشروط:
باستخدامك لهذا الموقع، فإنك تقر بأنك قد قرأت هذه الشروط والأحكام ووافقت على الالتزام بها.

2. طلبات الشراء:
- جميع الأسعار بالجنيه المصري وتشمل الضرائب المطبقة.
- نحتفظ بالحق في تعديل الأسعار دون إشعار مسبق.
- الطلبية تعتبر نهائية بعد تأكيد الدفع.

3. سياسة الإرجاع والاستبدال:
- يمكن إرجاع المنتجات خلال 14 يوماً من تاريخ الاستلام.
- يجب أن يكون المنتج في حالته الأصلية وبعبواته الأصلية.
- المنتجات الشخصية لا يمكن إرجاعها لأسباب صحية.

4. سياسة الخصوصية:
نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية وفقاً لقوانين حماية البيانات.

5. التعديلات:
نحتفظ بالحق في تعديل هذه الشروط والأحكام في أي وقت، وسيتم نشر النسخة المحدثة على الموقع.

للاستفسارات، يرجى التواصل معنا عبر صفحة اتصل بنا.`,
      });
    }

    return NextResponse.json(companyInfo);
  } catch (error) {
    console.error("Error fetching company info:", error);
    return NextResponse.json(
      { error: "فشل في جلب بيانات الشركة" },
      { status: 500 }
    );
  }
}

// ✅ إضافة PUT method لتحديث بيانات الشركة
export async function PUT(request) {
  try {
    const data = await request.json();

    console.log("📝 بيانات التحديث المستلمة:", data);

    // البحث عن السجل الحالي
    const existingCompany = await prisma.company_info.findFirst();

    let companyInfo;

    if (existingCompany) {
      // تحديث السجل الموجود
      companyInfo = await prisma.company_info.update({
        where: { id: existingCompany.id },
        data: {
          company_name: data.company_name,
          address: data.address,
          logo: data.logo,
          email: data.email,
          facebook_url: data.facebook_url,
          instagram_url: data.instagram_url,
          tiktok_url: data.tiktok_url,
          phone1: data.phone1,
          phone2: data.phone2,
          phone3: data.phone3,
          terms_conditions: data.terms_conditions,
          updated_at: new Date(),
        },
      });
    } else {
      // إنشاء سجل جديد
      companyInfo = await prisma.company_info.create({
        data: {
          company_name: data.company_name,
          address: data.address,
          logo: data.logo,
          email: data.email,
          facebook_url: data.facebook_url,
          instagram_url: data.instagram_url,
          tiktok_url: data.tiktok_url,
          phone1: data.phone1,
          phone2: data.phone2,
          phone3: data.phone3,
          terms_conditions: data.terms_conditions,
        },
      });
    }

    console.log("✅ تم تحديث بيانات الشركة بنجاح:", companyInfo);

    return NextResponse.json({
      success: true,
      companyInfo,
    });
  } catch (error) {
    console.error("❌ Error updating company info:", error);
    return NextResponse.json(
      { success: false, error: "فشل في تحديث معلومات الشركة" },
      { status: 500 }
    );
  }
}

// ✅ إضافة POST method كبديل إذا كان هناك مشكلة مع PUT
export async function POST(request) {
  try {
    const data = await request.json();

    console.log("📝 بيانات التحديث المستلمة (POST):", data);

    // البحث عن السجل الحالي
    const existingCompany = await prisma.company_info.findFirst();

    let companyInfo;

    if (existingCompany) {
      // تحديث السجل الموجود
      companyInfo = await prisma.company_info.update({
        where: { id: existingCompany.id },
        data: {
          company_name: data.company_name,
          address: data.address,
          logo: data.logo,
          email: data.email,
          facebook_url: data.facebook_url,
          instagram_url: data.instagram_url,
          tiktok_url: data.tiktok_url,
          phone1: data.phone1,
          phone2: data.phone2,
          phone3: data.phone3,
          terms_conditions: data.terms_conditions,
          updated_at: new Date(),
        },
      });
    } else {
      // إنشاء سجل جديد
      companyInfo = await prisma.company_info.create({
        data: {
          company_name: data.company_name,
          address: data.address,
          logo: data.logo,
          email: data.email,
          facebook_url: data.facebook_url,
          instagram_url: data.instagram_url,
          tiktok_url: data.tiktok_url,
          phone1: data.phone1,
          phone2: data.phone2,
          phone3: data.phone3,
          terms_conditions: data.terms_conditions,
        },
      });
    }

    console.log("✅ تم تحديث بيانات الشركة بنجاح (POST):", companyInfo);

    return NextResponse.json({
      success: true,
      companyInfo,
    });
  } catch (error) {
    console.error("❌ Error updating company info (POST):", error);
    return NextResponse.json(
      { success: false, error: "فشل في تحديث معلومات الشركة" },
      { status: 500 }
    );
  }
}
