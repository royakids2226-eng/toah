"use client";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCompanyInfo } from "../../hooks/useCompanyInfo";

export default function TermsPage() {
  const { companyInfo, loading } = useCompanyInfo();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">
                جاري تحميل الشروط والأحكام...
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* العنوان */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            الشروط والأحكام
          </h1>
          <p className="text-xl text-gray-600">
            شروط وأحكام استخدام متجر {companyInfo?.company_name || "أحلام"}
          </p>
        </div>

        {/* محتوى الشروط والأحكام */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          {companyInfo?.terms_conditions ? (
            <div
              className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900"
              dir="rtl"
            >
              {/* عرض المحتوى مع الحفاظ على التنسيق */}
              <div
                className="whitespace-pre-line leading-8 text-gray-700 text-lg"
                dangerouslySetInnerHTML={{
                  __html: companyInfo.terms_conditions.replace(/\n/g, "<br/>"),
                }}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                لا توجد شروط وأحكام حالياً
              </h3>
              <p className="text-gray-600">سيتم إضافة الشروط والأحكام قريباً</p>
            </div>
          )}

          {/* معلومات الشركة في الأسفل */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-center">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                {companyInfo?.company_name || "متجر أحلام للأطفال"}
              </h4>
              <p className="text-gray-600">
                آخر تحديث: {new Date().toLocaleDateString("ar-EG")}
              </p>
            </div>
          </div>
        </div>

        {/* زر العودة */}
        <div className="text-center mt-8">
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            العودة للصفحة السابقة
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
