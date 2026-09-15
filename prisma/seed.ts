import { PrismaClient } from "../app/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Creates the first admin so you can log in after provisioning.
//
//   SEED_ADMIN_EMAIL     defaults to agustinchavez@uchicago.edu
//   SEED_ADMIN_PASSWORD  if unset, a strong one is generated and printed once
//
// Safe to re-run: an existing admin's password is left alone unless you pass
// SEED_FORCE_PASSWORD_RESET=true. Earlier versions reset it to a hardcoded
// value on every run, which quietly reverted the admin to a known password.

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

// 24 url-safe chars from the CSPRNG
const generatePassword = () => crypto.randomBytes(18).toString("base64url");

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "agustinchavez@uchicago.edu")
    .toLowerCase()
    .trim();

  const providedPassword = process.env.SEED_ADMIN_PASSWORD;
  const generated = !providedPassword;
  const password = providedPassword || generatePassword();

  if (providedPassword && providedPassword.length < 8) {
    console.error("SEED_ADMIN_PASSWORD must be at least 8 characters.");
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.dJAllowlist.findUnique({ where: { email } });

  if (existing) {
    if (process.env.SEED_FORCE_PASSWORD_RESET !== "true") {
      // Still make sure they can actually administer the station
      if (!existing.isAdmin) {
        await prisma.dJAllowlist.update({ where: { email }, data: { isAdmin: true } });
        console.log(`${email} already existed - promoted to admin.`);
      } else {
        console.log(`${email} already exists and is an admin. Nothing to do.`);
      }
      console.log("To reset the password, re-run with SEED_FORCE_PASSWORD_RESET=true");
      return;
    }

    await prisma.dJAllowlist.update({
      where: { email },
      data: { passwordHash: await bcrypt.hash(password, 10), isAdmin: true },
    });
    console.log(`Reset the password for ${email}.`);
  } else {
    await prisma.dJAllowlist.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 10),
        isAdmin: true,
        addedByEmail: email,
        displayName: process.env.SEED_ADMIN_NAME || "Agustin Chavez",
      },
    });
    console.log(`Added ${email} as admin.`);
  }

  // Only ever print a password we invented - one the operator supplied is
  // already theirs, and echoing it just puts it in the shell history and logs.
  if (generated) {
    console.log("\n  Password (shown once, save it now):\n");
    console.log(`      ${password}\n`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
