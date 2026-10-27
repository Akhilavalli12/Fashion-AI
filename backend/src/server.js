import mongoose from 'mongoose';
import { app } from './app.js';
import { config } from './config.js';
import { seedDemo } from './seed/seed.js';
try {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 6000 });
  console.log('MongoDB connected');
  if (config.autoSeed) await seedDemo({ reset: false });
  app.listen(config.port, () => console.log(`API on http://localhost:${config.port}`));
} catch (e) {
  console.error('Could not start. Is MongoDB running at', config.mongoUri, '\n', e.message);
  process.exit(1);
}
