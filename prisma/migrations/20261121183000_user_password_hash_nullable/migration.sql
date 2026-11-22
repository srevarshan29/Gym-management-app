-- Allow Google-only OWNER accounts without a stored password hash.
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;