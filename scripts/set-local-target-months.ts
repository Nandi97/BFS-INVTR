import { prisma } from "../lib/prisma";

// Match substrings — handles "Fernanda's" (apostrophe) and "Beauty First" (BF Professional)
const LOCAL_BRANDS = ["refectocil", "bf professional", "beauty first", "desembre", "fernanda"];

async function main() {
  // Find products belonging to local brands
  const products = await prisma.product.findMany({
    where: { isActive: true, brand: { isNot: null } },
    select: { id: true, name: true, brand: { select: { name: true } } },
  });

  let updated = 0;
  const byBrand: Record<string, number> = {};

  for (const p of products) {
    const brandName = p.brand?.name ?? "";
    const isLocal = LOCAL_BRANDS.some((n) => brandName.toLowerCase().includes(n));
    if (isLocal) {
      await prisma.product.update({
        where: { id: p.id },
        data:  { targetStockMonths: 2 },
      });
      byBrand[brandName] = (byBrand[brandName] ?? 0) + 1;
      updated++;
    }
  }

  console.log(`Updated ${updated} products to 2-month target:`);
  for (const [brand, count] of Object.entries(byBrand).sort()) {
    console.log(`  ${brand}: ${count} products`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
