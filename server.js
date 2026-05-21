import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

// Serve everything in /public
app.use(express.static(join(__dirname, 'public')));

// All routes → index.html (hash routing works client-side)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`⚽ FutbolBantz running on port ${PORT}`);
});
