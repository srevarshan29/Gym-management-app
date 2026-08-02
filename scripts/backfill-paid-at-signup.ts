import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

async function main() {
  const preview = await prisma.$queryRaw<
    {
      payment_id: string;
      member_name: string;
      old_paid_at: Date;
      new_paid_at: Date;
      receipt_id: string | null;
    }[]
  >`
    WITH first_sub AS (
      SELECT DISTINCT ON ("memberId")
        id,
        "memberId",
        "startDate"
      FROM "Subscription"
      ORDER BY "memberId", "startDate" ASC
    )
    SELECT
      p.id AS payment_id,
      m.name AS member_name,
      p."paidAt" AS old_paid_at,
      fs."startDate" AS new_paid_at,
      r.id AS receipt_id
    FROM "Payment" p
    JOIN first_sub fs ON fs.id = p."subscriptionId"
    JOIN "Member" m ON m.id = p."memberId"
    LEFT JOIN "Receipt" r ON r."paymentId" = p.id
    WHERE date_trunc('day', p."paidAt") <> date_trunc('day', fs."startDate")
      AND ABS(EXTRACT(EPOCH FROM (p."paidAt" - m."createdAt"))) < 120
      AND m.name NOT IN ('Tyla', 'Beta Member 1')
    ORDER BY m.name
  `;

  console.log("Will update these rows:");
  console.log(JSON.stringify(preview, null, 2));
  console.error(`Count: ${preview.length}`);

  if (preview.length !== 13) {
    throw new Error(`Expected 13 rows, got ${preview.length}. Aborting.`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const payments = await tx.$executeRaw`
      WITH first_sub AS (
        SELECT DISTINCT ON ("memberId")
          id,
          "memberId",
          "startDate"
        FROM "Subscription"
        ORDER BY "memberId", "startDate" ASC
      ),
      targets AS (
        SELECT p.id AS payment_id, fs."startDate" AS new_paid_at
        FROM "Payment" p
        JOIN first_sub fs ON fs.id = p."subscriptionId"
        JOIN "Member" m ON m.id = p."memberId"
        WHERE date_trunc('day', p."paidAt") <> date_trunc('day', fs."startDate")
          AND ABS(EXTRACT(EPOCH FROM (p."paidAt" - m."createdAt"))) < 120
          AND m.name NOT IN ('Tyla', 'Beta Member 1')
      )
      UPDATE "Payment" p
      SET "paidAt" = t.new_paid_at
      FROM targets t
      WHERE p.id = t.payment_id
    `;

    const receipts = await tx.$executeRaw`
      UPDATE "Receipt" r
      SET "paidAt" = p."paidAt"
      FROM "Payment" p
      WHERE r."paymentId" = p.id
        AND p.id IN (
          SELECT p2.id
          FROM "Payment" p2
          JOIN "Member" m ON m.id = p2."memberId"
          WHERE m.name NOT IN ('Tyla', 'Beta Member 1')
            AND p2.id IN (
              'cms0ahc35000uwyw7fn3bzyrz',
              'cmrwxy74e009ixxl4eut3w9wr',
              'cmrvc6c0c003xiyq9ydbsn72l',
              'cmrstckzn001jryv5vo4l2756',
              'cmrvddchm002rg8obf6vu06mu',
              'cmrst9o7i0013ryv5vgmgwdv6',
              'cms2wdj89004l7s7p0i2at46v',
              'cmrur31k3000o5lbgej805ti1',
              'cms05q3h9009mvml9eo7sflzc',
              'cmsb8457i003f3ebuzijjlwuc',
              'cmrupw45u000f5lbgceiqlu29',
              'cmrwxs466008dxxl4mjqvutvj',
              'cmrhda6aj000g12nsvhacl56o'
            )
        )
    `;

    return { payments, receipts };
  });

  console.log("\nUpdate complete:", result);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
