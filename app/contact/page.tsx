"use client";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCompanyInfo } from "../../hooks/useCompanyInfo";

export default function ContactPage() {
  const { companyInfo, loading } = useCompanyInfo();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">جاري تحميل بيانات الشركة...</p>
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

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* العنوان */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">اتصل بنا</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            تواصل معنا لأي استفسار أو مساعدة - نحن هنا لخدمتك
          </p>
        </div>

        {/* بطاقات المعلومات */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* معلومات الاتصال */}
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <svg
                className="w-6 h-6 text-blue-600 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              معلومات الاتصال
            </h2>

            <div className="space-y-6">
              {/* اسم الشركة */}
              <div className="flex items-start space-x-3 space-x-reverse">
                <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">أ</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    اسم المتجر
                  </h3>
                  <p className="text-gray-600 text-lg">
                    {companyInfo?.company_name || "متجر أحلام للأطفال"}
                  </p>
                </div>
              </div>

              {/* العنوان */}
              {companyInfo?.address && (
                <div className="flex items-start space-x-3 space-x-reverse">
                  <svg
                    className="w-6 h-6 text-gray-400 mt-1 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      العنوان
                    </h3>
                    <p className="text-gray-600">{companyInfo.address}</p>
                  </div>
                </div>
              )}

              {/* الإيميل */}
              {companyInfo?.email && (
                <div className="flex items-start space-x-3 space-x-reverse">
                  <svg
                    className="w-6 h-6 text-gray-400 mt-1 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      البريد الإلكتروني
                    </h3>
                    <a
                      href={`mailto:${companyInfo.email}`}
                      className="text-blue-600 hover:text-blue-700 text-lg font-medium"
                    >
                      {companyInfo.email}
                    </a>
                  </div>
                </div>
              )}

              {/* أرقام الهاتف */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  أرقام الهاتف
                </h3>
                <div className="space-y-3">
                  {companyInfo?.phone1 && (
                    <div className="flex items-center space-x-3 space-x-reverse text-gray-600">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <span className="text-lg">{companyInfo.phone1}</span>
                    </div>
                  )}
                  {companyInfo?.phone2 && (
                    <div className="flex items-center space-x-3 space-x-reverse text-gray-600">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <span className="text-lg">{companyInfo.phone2}</span>
                    </div>
                  )}
                  {companyInfo?.phone3 && (
                    <div className="flex items-center space-x-3 space-x-reverse text-gray-600">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <span className="text-lg">{companyInfo.phone3}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* وسائل التواصل الاجتماعي */}
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <svg
                className="w-6 h-6 text-blue-600 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              وسائل التواصل
            </h2>

            <div className="space-y-6">
              <p className="text-gray-600 text-lg">
                تابعنا على منصات التواصل الاجتماعي للاطلاع على أحدث العروض
                والمنتجات
              </p>

              <div className="flex space-x-4 space-x-reverse justify-center lg:justify-start">
                {companyInfo?.facebook_url &&
                  companyInfo.facebook_url !== "#" && (
                    <a
                      href={companyInfo.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 text-white p-4 rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2 space-x-reverse"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      <span>فيسبوك</span>
                    </a>
                  )}

                {companyInfo?.instagram_url &&
                  companyInfo.instagram_url !== "#" && (
                    <a
                      href={companyInfo.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-pink-600 text-white p-4 rounded-xl hover:bg-pink-700 transition-colors flex items-center space-x-2 space-x-reverse"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                      <span>إنستجرام</span>
                    </a>
                  )}

                {companyInfo?.tiktok_url && companyInfo.tiktok_url !== "#" && (
                  <a
                    href={companyInfo.tiktok_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-black text-white p-4 rounded-xl hover:bg-gray-800 transition-colors flex items-center space-x-2 space-x-reverse"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                    </svg>
                    <span>تيك توك</span>
                  </a>
                )}
              </div>

              {/* نص توجيهي */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <p className="text-blue-700 text-sm text-center">
                  للاستفسارات، يرجى التواصل معنا عبر الهاتف أو البريد الإلكتروني
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
