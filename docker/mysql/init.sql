-- Databases used by local development and the automated test-suite.
CREATE DATABASE IF NOT EXISTS marketplace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS marketplace_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Prisma `migrate dev` needs a shadow database
CREATE DATABASE IF NOT EXISTS marketplace_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS marketplace_e2e CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
