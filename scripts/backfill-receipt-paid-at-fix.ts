import { Prisma, PrismaClient } from "@prisma/client";

const PAYMENT_IDS = [
  "cms0ahc35000uwyw7fn3bzyrz",
  "cmrwxy74e009ixxl4eut3w9wr",
  "cmrvc6c0c003xiyq9ydbsn72l",
  "cmrstckzn001jryv5vo4l2756",
  "cmrvddchm002rg8obf6vu06mu",
  "cmrst9o7i0013ryv5vgmgwdv6",
  "cms2wdj89004l7s7p0i2at46v",
  "cmrur31k3000o5lbgej805ti1",
  "cms05q3h9009mvml9eo7sflzc",
  "cmsb8457i003f3ebuzijjlwuc",
  "cmrupw45u000f5lbgceiqlu29",
  "cmrwxs466008dxxl4mjqvutvj",
  "cmrhda6aj000g12nsvhacl56o",
];

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

async function main() {
  const rows = await prisma.$queryRaw<
    { receipt_id: string; payment_id: string; paid_at: Date }[]
  >`
    UPDATE "Receipt" r
    SET "paidAt" = p."paidAt"
    FROM "Payment" p
    WHERE r."paymentId" = p.id
      AND p.id IN (${Prisma.join(PAYMENT_IDS)})
    RETURNING r.id AS receipt_id, p.id AS payment_id, r."paidAt" AS paid_at
  `;

  console.log(JSON.stringify(rows, null, 2));
  console.error(`Receipts updated: ${rows.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
