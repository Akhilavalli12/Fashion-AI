// Storage abstraction. Local disk now; implement the same interface for Cloudinary/S3 later and
// swap the export at the bottom. MongoDB only ever stores the returned url/key.
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config.js';

class LocalStorage {
  async save(file, userId) {
    const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype] || '.bin';
    const key = `${userId}/${crypto.randomUUID()}${ext}`;
    const full = path.join(config.uploadDir, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, file.buffer);
    return { key, url: `/uploads/${key}` };
  }
  async remove(key) { if (key) await fs.rm(path.join(config.uploadDir, key), { force: true }); }
}
// To upgrade: class S3Storage { async save(file, userId) {...return {key,url}} async remove(key) {...} }
export const storage = new LocalStorage();
