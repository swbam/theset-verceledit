#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to move into src
const dirsToMove = [
  { from: 'app', to: 'src/app' },
  { from: 'components', to: 'src/components' },
  { from: 'lib', to: 'src/lib' }
];

// Function to check if a file exists
function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

// Function to update imports in a file
function updateImports(filePath) {
  if (!fileExists(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update various import patterns

  // For files being moved to src, we need to update imports that reference the root directories
  if (filePath.includes('/src/app/')) {
    // Fix imports referencing lib/
    content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/lib\//g, 'from \'../../../lib/');
    content = content.replace(/import\(['"]\.\.\/\.\.\/\.\.\/lib\//g, 'import(\'../../../lib/');
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/lib\//g, 'require(\'../../../lib/');
    
    // Fix imports referencing components/
    content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/components\//g, 'from \'../../../components/');
    content = content.replace(/import\(['"]\.\.\/\.\.\/\.\.\/components\//g, 'import(\'../../../components/');
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/components\//g, 'require(\'../../../components/');
    
    // Fix imports referencing app/
    content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/app\//g, 'from \'../../../app/');
    content = content.replace(/import\(['"]\.\.\/\.\.\/\.\.\/app\//g, 'import(\'../../../app/');
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/app\//g, 'require(\'../../../app/');
  }
  
  // Fix imports that reference src/ directly - no need for that prefix once we're inside src
  if (filePath.includes('/src/')) {
    content = content.replace(/from ['"](.+?)\/src\//g, 'from \'$1/');
    content = content.replace(/import\(['"](.+?)\/src\//g, 'import(\'$1/');
    content = content.replace(/require\(['"](.+?)\/src\//g, 'require(\'$1/');
  }
  
  // Fix any reference to root directories that now need src/
  content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/src\/lib\//g, 'from \'../../../lib/');
  content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/src\/components\//g, 'from \'../../../components/');
  content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/src\/app\//g, 'from \'../../../app/');

  fs.writeFileSync(filePath, content);
  console.log(`Updated imports in ${filePath}`);
}

// Check if a directory is empty
function isDirEmpty(dirPath) {
  if (!fs.existsSync(dirPath)) return true;
  const files = fs.readdirSync(dirPath);
  return files.length === 0;
}

// Main function to move files
async function moveFiles() {
  const conflictingFiles = [];
  const processedFiles = [];

  for (const dir of dirsToMove) {
    if (!fs.existsSync(dir.from)) {
      console.log(`Directory ${dir.from} doesn't exist. Skipping.`);
      continue;
    }

    // Create the target directory if it doesn't exist
    if (!fs.existsSync(dir.to)) {
      fs.mkdirSync(dir.to, { recursive: true });
    }

    // Get all files in the source directory
    const findFiles = `find ${dir.from} -type f -not -path "*/node_modules/*" -not -path "*/\.*"`;
    let files = [];
    try {
      files = execSync(findFiles).toString().trim().split('\n').filter(Boolean);
    } catch (err) {
      console.error(`Error finding files in ${dir.from}:`, err.message);
      continue;
    }

    console.log(`Found ${files.length} files in ${dir.from}`);
    
    for (const file of files) {
      const relativePath = file.substring(dir.from.length);
      const targetFile = path.join(dir.to, relativePath);
      const targetDir = path.dirname(targetFile);

      // Create target directory if it doesn't exist
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Check if target already exists
      if (fs.existsSync(targetFile)) {
        console.log(`Target file ${targetFile} already exists. Skipping.`);
        conflictingFiles.push({ source: file, target: targetFile });
        continue;
      }

      try {
        // Copy file to target location
        fs.copyFileSync(file, targetFile);
        console.log(`Copied ${file} to ${targetFile}`);
        processedFiles.push(targetFile);

        // Update imports in the target file
        updateImports(targetFile);
      } catch (err) {
        console.error(`Error copying ${file} to ${targetFile}:`, err.message);
      }
    }
  }

  // Final summary
  console.log("\n--- Summary ---");
  console.log(`Processed files: ${processedFiles.length}`);
  if (conflictingFiles.length > 0) {
    console.log(`Skipped ${conflictingFiles.length} files due to conflicts.`);
  }

  console.log("\nFile movement complete. Please test the changes before removing the original files.");
  console.log("You can remove the original files with: node scripts/remove-original-files.js");
}

moveFiles().catch(err => {
  console.error('Error moving files:', err);
  process.exit(1);
});
