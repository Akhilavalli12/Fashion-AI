import mongoose from 'mongoose';
import { config } from '../config.js';
import { seedDemo } from './seed.js';
await mongoose.connect(config.mongoUri);
await seedDemo({ reset: process.argv.includes('--reset') });
await mongoose.disconnect();
