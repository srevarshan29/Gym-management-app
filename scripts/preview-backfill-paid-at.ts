import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

async function main() {
  const rows = await prisma.$queryRaw<
    {
      payment_id: string;
      gymId: string;
      memberId: string;
      member_name: string;
      current_paid_at: Date;
      subscription_start: Date;
      member_created_at: Date;
      receipt_id: string | null;
      receipt_paid_at: Date | null;
    }[]
  >`
    WITH first_sub AS (
      SELECT DISTINCT ON ("memberId")
        id,
        "memberId",
        "startDate",
        "gymId"
      FROM "Subscription"
      ORDER BY "memberId", "startDate" ASC
    )
    SELECT
      p.id AS payment_id,
      p."gymId",
      p."memberId",
      m.name AS member_name,
      p."paidAt" AS current_paid_at,
      fs."startDate" AS subscription_start,
      m."createdAt" AS member_created_at,
      r.id AS receipt_id,
      r."paidAt" AS receipt_paid_at
    FROM "Payment" p
    JOIN first_sub fs ON fs.id = p."subscriptionId"
    JOIN "Member" m ON m.id = p."memberId"
    LEFT JOIN "Receipt" r ON r."paymentId" = p.id
    WHERE date_trunc('day', p."paidAt") <> date_trunc('day', fs."startDate")
    ORDER BY p."createdAt" DESC
  `;

  console.log(JSON.stringify(rows, null, 2));
  console.error(`\nTotal rows: ${rows.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
