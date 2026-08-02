import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

async function main() {
  const rows = await prisma.$queryRaw<
    {
      payment_id: string;
      member_name: string;
      current_paid_at: Date;
      subscription_start: Date;
      member_created_at: Date;
      likely_signup_payment: boolean;
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
      p."paidAt" AS current_paid_at,
      fs."startDate" AS subscription_start,
      m."createdAt" AS member_created_at,
      (ABS(EXTRACT(EPOCH FROM (p."paidAt" - m."createdAt"))) < 120) AS likely_signup_payment
    FROM "Payment" p
    JOIN first_sub fs ON fs.id = p."subscriptionId"
    JOIN "Member" m ON m.id = p."memberId"
    WHERE date_trunc('day', p."paidAt") <> date_trunc('day', fs."startDate")
    ORDER BY likely_signup_payment DESC, m.name, p."paidAt"
  `;

  const signup = rows.filter((r) => r.likely_signup_payment);
  const other = rows.filter((r) => !r.likely_signup_payment);

  console.log("=== Likely signup payment (paidAt within 2 min of member created) ===");
  console.log(JSON.stringify(signup, null, 2));
  console.log("\n=== Other (installments or manual payment date on form) ===");
  console.log(JSON.stringify(other, null, 2));
  console.error(`\nSignup-like: ${signup.length}, Other: ${other.length}, Total: ${rows.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
