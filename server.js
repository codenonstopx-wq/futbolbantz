import express from 'express';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, exists } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;
const publicDir = join(__dirname, 'public');
const indexPath = join(publicDir, 'index.html');

// On startup: build the site if index.html doesn't exist yet
if (!fs.existsSync(indexPath)) {
  console.log('📦 index.html not found — running build...');
  try {
    execSync('node scripts/build-site.js', { stdio: 'inherit' });
  } catch (e) {
    console.error('Build failed:', e.message);
  }
}

// Serve static files from /public
app.use(express.static(publicDir));

// All routes → index.html (hash routing is client-side)
app.get('*', (req, res) => {
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`⚽ FutbolBantz running on port ${PORT}`);
});
