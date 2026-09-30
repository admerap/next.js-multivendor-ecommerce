import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@sundry.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "SundryAdmin#2026";
  const name = process.env.ADMIN_NAME ?? "Sundry Admin";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: "ADMIN" },
    create: { email, name, passwordHash, role: "ADMIN" },
  });

  console.log("\nAdmin account ready");
  console.log(`  id:       ${admin.id}`);
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
  console.log("  login at: /admin/login\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
