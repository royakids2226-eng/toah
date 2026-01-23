import { getHomeData } from "@/lib/get-home-data";
import HomeClient from "./components/HomeClient";

// ✅ هذه الصفحة ستعمل على السيرفر (سريعة جداً)
export const dynamic = "force-dynamic"; // لضمان عدم تخزين بيانات قديمة

export default async function Home() {
  // 1. جلب البيانات من الداتابيز مباشرة (بدون HTTP Fetch)
  const { products, categories } = await getHomeData();

  // 2. تمرير البيانات للمكون العميل ليعرضها فوراً
  return (
    <HomeClient 
      initialProducts={products} 
      initialCategories={categories} 
    />
  );
}