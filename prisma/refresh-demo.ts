/**
 * Refresh demo content in the database configured by DATABASE_URL:
 *   pnpm db:refresh-demo              → new product illustrations + sample ratings/reviews
 *   pnpm db:refresh-demo --images     → images only
 *   pnpm db:refresh-demo --reviews    → reviews only
 *   pnpm db:refresh-demo --remove-reviews → delete all demo reviews and demo reviewer accounts
 */
import { loadEnv } from '../src/config/env';
import { createContainer } from '../src/bootstrap/container';
import { describeDatabaseUrl } from '../src/database/status';
import { refreshProductImages, removeDemoReviews, seedDemoReviews } from './demo-content';

const args = new Set(process.argv.slice(2));
const env = loadEnv();
const c = createContainer(env);

async function main() {
  const t = describeDatabaseUrl(env.DATABASE_URL);
  console.log(`\nDatabase: ${t?.database} @ ${t?.host}\n`);
  if (args.has('--remove-reviews')) {
    console.log(`Removed ${await removeDemoReviews(c)} demo reviews.`);
    return;
  }
  const only = args.has('--images') ? 'images' : args.has('--reviews') ? 'reviews' : null;
  if (only !== 'reviews') {
    console.log('Rendering product illustrations…');
    console.log(`  → ${await refreshProductImages(c)} products updated`);
  }
  if (only !== 'images') {
    console.log('Adding sample ratings & reviews…');
    await seedDemoReviews(c);
  }
}

main()
  .then(() => c.shutdown())
  .catch(async (err) => {
    console.error(err);
    await c.shutdown();
    process.exit(1);
  });
