import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.location.upsert({
    where: { code: "BFW" },
    update: {},
    create: {
      name: "BF Warehouse",
      code: "BFW",
      type: "WAREHOUSE",
      address: "Head Office / Main Warehouse",
    },
  });

  console.log("Seeded: BF Warehouse location");
}

main()
  .catch(console.error)
  .finally(() => pool.end());
