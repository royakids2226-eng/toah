"use client";

import Link from "next/link";
import { useCompanyInfo } from "../../hooks/useCompanyInfo";

export default function Footer() {
  const { companyInfo, loading, error } = useCompanyInfo();

  if (loading) {
    return (
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">جاري تحميل بيانات الشركة...</div>
        </div>
      </footer>
    );
  }

  if (error) {
    console.error("Error loading company info:", error);
  }

  // البيانات الافتراضية في حالة الخطأ أو عدم وجود بيانات
  const companyData = companyInfo || {
    company_name: "متجر أحلام للأطفال",
    address: "العنوان الافتراضي - المدينة",
    logo: null,
    email: "info@ahlam-store.com",
    facebook_url: "#",
    instagram_url: "#",
    tiktok_url: "#",
    phone1: "0123456789",
    phone2: null,
    phone3: null,
    terms_conditions: "الشروط والأحكام الافتراضية",
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* الشعار ومعلومات الشركة */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 space-x-reverse mb-4">
              {companyData.logo ? (
                <img
                  src={companyData.logo}
                  alt={companyData.company_name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 bg-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">أ</span>
                </div>
              )}
              <span className="text-xl font-bold">
                {companyData.company_name}
              </span>
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              {companyData.address ||
                "متجرك المفضل لملابس الأطفال الأنيقة. نقدم أحدث صيحات الموضة بجودة عالية وأسعار مناسبة لكل أطفالك."}
            </p>

            {/* وسائل التواصل الاجتماعي */}
            <div className="flex space-x-4 space-x-reverse">
              {companyData.facebook_url && companyData.facebook_url !== "#" && (
                <a
                  href={companyData.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <span className="sr-only">Facebook</span>
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              )}

              {companyData.instagram_url &&
                companyData.instagram_url !== "#" && (
                  <a
                    href={companyData.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <span className="sr-only">Instagram</span>
                    <svg
                      className="h-6 w-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                )}

              {companyData.tiktok_url && companyData.tiktok_url !== "#" && (
                <a
                  href={companyData.tiktok_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <span className="sr-only">TikTok</span>
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* روابط سريعة */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase mb-4">
              روابط سريعة
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-base text-gray-300 hover:text-white transition-colors"
                >
                  الرئيسية
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="text-base text-gray-300 hover:text-white transition-colors"
                >
                  جميع التصنيفات
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-base text-gray-300 hover:text-white transition-colors"
                >
                  اتصل بنا
                </Link>
              </li>
              {companyData.terms_conditions && (
                <li>
                  <Link
                    href="/terms"
                    className="text-base text-gray-300 hover:text-white transition-colors"
                  >
                    الشروط والأحكام
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* معلومات الاتصال */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase mb-4">
              تواصل معنا
            </h3>
            <ul className="space-y-3">
              {/* اسم الشركة */}
              <li className="text-base text-gray-300 font-medium">
                {companyData.company_name}
              </li>

              {/* العنوان */}
              {companyData.address && (
                <li className="flex items-start space-x-2 space-x-reverse text-gray-300">
                  <svg
                    className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0"
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
                  <span className="text-sm">{companyData.address}</span>
                </li>
              )}

              {/* الإيميل */}
              {companyData.email && (
                <li className="flex items-start space-x-2 space-x-reverse text-gray-300">
                  <svg
                    className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0"
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
                  <a
                    href={`mailto:${companyData.email}`}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {companyData.email}
                  </a>
                </li>
              )}

              {/* أرقام الهاتف */}
              {companyData.phone1 && (
                <li className="flex items-center space-x-2 space-x-reverse text-gray-300">
                  <svg
                    className="h-5 w-5 text-gray-400"
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
                  <span>{companyData.phone1}</span>
                </li>
              )}
              {companyData.phone2 && (
                <li className="flex items-center space-x-2 space-x-reverse text-gray-300">
                  <svg
                    className="h-5 w-5 text-gray-400"
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
                  <span>{companyData.phone2}</span>
                </li>
              )}
              {companyData.phone3 && (
                <li className="flex items-center space-x-2 space-x-reverse text-gray-300">
                  <svg
                    className="h-5 w-5 text-gray-400"
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
                  <span>{companyData.phone3}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* حقوق النشر */}
        <div className="mt-8 border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-base text-gray-400">
            © {new Date().getFullYear()} {companyData.company_name}. جميع الحقوق
            محفوظة.
          </p>
          <div className="flex space-x-6 space-x-reverse mt-2 md:mt-0">
            {companyData.terms_conditions && (
              <Link
                href="/terms"
                className="text-base text-gray-400 hover:text-white transition-colors"
              >
                الشروط والأحكام
              </Link>
            )}
            <Link
              href="/contact"
              className="text-base text-gray-400 hover:text-white transition-colors"
            >
              اتصل بنا
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
