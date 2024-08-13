import fs from 'fs';
import path from 'path';
import { rimrafSync } from 'rimraf';

const projectRoot = path.resolve() + '/src';
const excludedDirs = ['dist', 'node_modules', '.git'];

async function findAndRemoveJsFiles(dir) {
  try {
    const files = await fs.promises.readdir(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await fs.promises.stat(filePath);

      if (stats.isDirectory()) {
        if (!excludedDirs.includes(path.relative(projectRoot, filePath).split(path.sep)[0])) {
          await findAndRemoveJsFiles(filePath);
        }
      } else if (stats.isFile() && path.extname(filePath) === '.js') {
        try {
          rimrafSync(filePath);
        } catch (err) {
          console.error(`Error removing file ${filePath}:`, err);
        }
      }
    }
  } catch (err) {
    console.error(`Error processing directory ${dir}:`, err);
  }
}

findAndRemoveJsFiles(projectRoot);