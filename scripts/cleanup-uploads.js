let fs = require('fs');
let path = require('path');

let UPLOAD_DIR = path.join(process.cwd(), 'uploads');
let tempDir = path.join(UPLOAD_DIR, 'temp');
let documentsDir = path.join(UPLOAD_DIR, 'documents');

function removeOldFiles(dir, maxAgeMs) {
  if (!fs.existsSync(dir)) return;
  let now = Date.now();
  let files = fs.readdirSync(dir);
  for (let f of files) {
    try {
      let fp = path.join(dir, f);
      let stat = fs.statSync(fp);
      let age = now - stat.mtimeMs;
      if (age > maxAgeMs) {
        if (stat.isDirectory()) {
          fs.rmSync(fp, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fp);
        }
        console.log('Removed', fp);
      }
    } catch (err) {
      console.warn('Failed to remove', f, err.message);
    }
  }
}

(async function main() {
  try {
    removeOldFiles(tempDir, 6 * 60 * 60 * 1000);

  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();
