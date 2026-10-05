import 'dotenv/config';
import { createApplication } from './bootstrap.js';

async function main() {
  const app = await createApplication();
  await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}

main().catch(() => { console.error('Application startup failed'); process.exitCode = 1; });
