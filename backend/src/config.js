import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fashion_ai',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001',
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../uploads'),
  autoSeed: process.env.AUTO_SEED !== 'false',
};
