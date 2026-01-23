import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getCategoryData(categoryId: string) {
  try {
    // 1. جلب التصنيف الحالي والتصنيفات الفرعية
    const categories = await prisma.categories.findMany();
    const currentCategory = categories.find((cat) => cat.id.toString() === categoryId);
    
    if (!currentCategory) {
      return { products: [], categories: [], currentCategory: null, subCategories: [] };
    }

    const subCategories = categories.filter(
      (cat) => cat.sub === currentCategory.name && cat.image
    );

    // 2. جلب المنتجات الخام
    const productsRaw = await prisma.products.findMany({
      where: {
        cur_qty: { gt: 0 },
        stor_id: 0,
        // فلترة مبدئية لتسريع البحث (نبحث في أسماء التصنيفات)
        OR: [
          { group_name: { contains: currentCategory.name } },
          { kind_name: { contains: currentCategory.name } },
          { item_name: { contains: currentCategory.name } }
        ]
      },
      take: 1000, // حد معقول للتصنيف الواحد
    });

    // 3. تجميع المنتجات (نفس منطق التجميع الموحد)
    const groupedByMasterCode: { [key: string]: any } = {};

    productsRaw.forEach((row) => {
      const masterCode = row.master_code;
      if (!masterCode) return;

      const color = row.color || "افتراضي";
      const size = row.size || null;
      const curQty = Number(row.cur_qty) || 0;
      const itemCode = row.item_code || "";

      if (!groupedByMasterCode[masterCode]) {
        groupedByMasterCode[masterCode] = {
          modelId: masterCode,
          master_code: masterCode,
          price: row.out_price || 0,
          category: row.group_name || row.kind_name || "",
          description: row.item_name || row.kind_name || "منتج بدون وصف",
          group_name: row.group_name || "",
          kind_name: row.kind_name || "",
          item_name: row.item_name || "",
          item_code: "",
          cur_qty: 0,
          variants: [],
        };
      }

      let variant = groupedByMasterCode[masterCode].variants.find(
        (v: any) => v.color === color
      );

      if (!variant) {
        let imageUrl = "https://via.placeholder.com/500x700/EFEFEF/666666?text=No+Image";
        if (row.images && row.images.length > 50) {
             imageUrl = row.images;
        }

        variant = {
          id: row.unique_id,
          color: color,
          imageUrl: imageUrl,
          sizes: [],
          cur_qty: curQty,
          sizeQuantities: {},
        };
        groupedByMasterCode[masterCode].variants.push(variant);
      } else {
        variant.cur_qty += curQty;
      }

      groupedByMasterCode[masterCode].cur_qty += curQty;

      if (size) {
        variant.sizes.push(size);
        variant.sizeQuantities = variant.sizeQuantities || {};
        variant.sizeQuantities[size] = (variant.sizeQuantities[size] || 0) + curQty;
      }
    });

    const finalProducts = Object.values(groupedByMasterCode);

    // فلترة نهائية دقيقة لضمان تطابق اسم التصنيف
    const filteredProducts = finalProducts.filter(p => {
        const searchText = currentCategory.name.toLowerCase();
        return (
            p.category?.toLowerCase().includes(searchText) ||
            p.group_name?.toLowerCase().includes(searchText) ||
            p.kind_name?.toLowerCase().includes(searchText) ||
            p.item_name?.toLowerCase().includes(searchText)
        );
    });

    // 4. إرجاع البيانات مسلسلة (JSON Serialized)
    return JSON.parse(JSON.stringify({
      products: filteredProducts,
      categories,
      currentCategory,
      subCategories
    }));

  } catch (error) {
    console.error("Category Data Error:", error);
    return { products: [], categories: [], currentCategory: null, subCategories: [] };
  }
}