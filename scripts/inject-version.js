const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '../public/sw.js');
if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, 'utf8');
  
  // Use Vercel git commit SHA, or Next.js version, or current timestamp
  const version = process.env.VERCEL_GIT_COMMIT_SHA || 
                  process.env.NEXT_PUBLIC_APP_VERSION || 
                  new Date().toISOString().replace(/[:.]/g, '-');
                  
  // Idempotently replace const CACHE_VERSION = '...'; with the active version
  const updatedContent = swContent.replace(
    /const CACHE_VERSION = '.*';/,
    `const CACHE_VERSION = '${version}';`
  );
  
  fs.writeFileSync(swPath, updatedContent, 'utf8');
  console.log(`[PWA Build] Injected Service Worker CACHE_VERSION: ${version}`);
} else {
  console.error('[PWA Build] sw.js not found!');
}
