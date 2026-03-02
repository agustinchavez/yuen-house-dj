import { PrismaClient } from "../app/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "agustinchavez@uchicago.edu";
  const password = "admin123"; // Change this after first login!

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.dJAllowlist.findUnique({ where: { email } });

  if (existing) {
    // Update password if already exists
    await prisma.dJAllowlist.update({
      where: { email },
      data: { passwordHash, isAdmin: true },
    });
    console.log(`Updated password for ${email}`);
    return;
  }

  await prisma.dJAllowlist.create({
    data: {
      email,
      passwordHash,
      isAdmin: true,
      addedByEmail: email,
      displayName: "Agustin Chavez",
    },
  });

  console.log(`Added ${email} as admin with password: ${password}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
