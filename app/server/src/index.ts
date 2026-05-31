import './config/env'; // validate env vars before anything else
import app from './app';
import { env } from './config/env';
import { prisma } from './prisma/client';

const PORT = parseInt(env.PORT, 10);

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    app.listen(PORT, () => {
      console.log(`🚀 JobBoard API running at http://localhost:${PORT}`);
      console.log(`   Environment: ${env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

main();
