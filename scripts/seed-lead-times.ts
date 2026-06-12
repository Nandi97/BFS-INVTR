/**
 * Sets brand lead times and disables direct-supply locations.
 * Run once: npx tsx scripts/seed-lead-times.ts
 */
import { prisma } from "../lib/prisma";

const LOCAL_BRANDS = ["refectocil", "bf professional", "desembre", "fernandas"];
const LOCAL_LEAD_DAYS = 14;
const INTL_LEAD_DAYS  = 45; // Korean / Chinese suppliers

const DIRECT_SUPPLY_LOCATIONS = ["bf inverness", "blx inverness"];

async function main() {
  const brands = await prisma.brand.findMany({ select: { id: true, name: true } });

  let localCount = 0, intlCount = 0;
  for (const b of brands) {
    const lower = b.name.toLowerCase();
    const isLocal = LOCAL_BRANDS.some((n) => lower.includes(n));
    await prisma.brand.update({
      where: { id: b.id },
      data:  { leadTimeDays: isLocal ? LOCAL_LEAD_DAYS : INTL_LEAD_DAYS },
    });
    if (isLocal) localCount++; else intlCount++;
  }

  // Disable direct-supply locations
  const locs = await prisma.location.findMany({ select: { id: true, name: true } });
  let disabledCount = 0;
  for (const l of locs) {
    if (DIRECT_SUPPLY_LOCATIONS.some((n) => l.name.toLowerCase().includes(n))) {
      await prisma.location.update({ where: { id: l.id }, data: { isActive: false } });
      console.log(`  ✗ Disabled location: ${l.name}`);
      disabledCount++;
    }
  }

  console.log(`Lead times set: ${localCount} local (${LOCAL_LEAD_DAYS}d), ${intlCount} international (${INTL_LEAD_DAYS}d)`);
  console.log(`Locations disabled: ${disabledCount}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
