#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import readline from 'readline';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories that were moved into src
const dirsToClean = [
  { from: 'app', to: 'src/app' },
  { from: 'components', to: 'src/components' },
  { from: 'lib', to: 'src/lib' }
];

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to check if a file exists
function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

// Function to check if a directory is empty
function isDirEmpty(dirPath) {
  if (!fs.existsSync(dirPath)) return true;
  const files = fs.readdirSync(dirPath);
  return files.length === 0;
}

// Function to remove empty directories recursively
function removeEmptyDirs(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  
  let files = fs.readdirSync(dirPath);
  
  if (files.length > 0) {
    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        removeEmptyDirs(fullPath);
      }
    });
    
    // Check again after potentially removing empty subdirectories
    files = fs.readdirSync(dirPath);
  }
  
  if (files.length === 0) {
    console.log(`Removing empty directory: ${dirPath}`);
    fs.rmdirSync(dirPath);
  }
}

// Main function to remove original files
async function removeOriginalFiles() {
  const filesToRemove = [];
  const dirsToCheck = [];
  
  // Find files that need to be removed
  for (const dir of dirsToClean) {
    if (!fs.existsSync(dir.from)) {
      console.log(`Directory ${dir.from} doesn't exist. Skipping.`);
      continue;
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
    
    console.log(`Found ${files.length} files in ${dir.from} to check`);
    
    for (const file of files) {
      const relativePath = file.substring(dir.from.length);
      const targetFile = path.join(dir.to, relativePath);
      
      // Only mark for removal if the target file exists
      if (fileExists(targetFile)) {
        filesToRemove.push(file);
        
        // Add the directory to check for emptiness later
        const dirPath = path.dirname(file);
        if (!dirsToCheck.includes(dirPath)) {
          dirsToCheck.push(dirPath);
        }
      } else {
        console.log(`Target file ${targetFile} doesn't exist. Original file ${file} will NOT be removed.`);
      }
    }
  }
  
  if (filesToRemove.length === 0) {
    console.log('No files to remove.');
    rl.close();
    return;
  }
  
  console.log(`\nFound ${filesToRemove.length} files to remove:`);
  filesToRemove.slice(0, 10).forEach(file => console.log(`- ${file}`));
  if (filesToRemove.length > 10) {
    console.log(`... and ${filesToRemove.length - 10} more`);
  }
  
  // Ask for confirmation before removing files
  rl.question('\nAre you sure you want to remove these files? This action cannot be undone. (yes/no): ', answer => {
    if (answer.toLowerCase() !== 'yes') {
      console.log('Operation cancelled.');
      rl.close();
      return;
    }
    
    // Remove the files
    let removedCount = 0;
    for (const file of filesToRemove) {
      try {
        fs.unlinkSync(file);
        removedCount++;
      } catch (err) {
        console.error(`Error removing file ${file}:`, err.message);
      }
    }
    
    console.log(`\nRemoved ${removedCount} files successfully.`);
    
    // Sort directories by depth (deepest first) to properly clean nested directories
    dirsToCheck.sort((a, b) => {
      const depthA = a.split('/').length;
      const depthB = b.split('/').length;
      return depthB - depthA;
    });
    
    // Remove empty directories
    for (const dir of dirsToClean) {
      if (fs.existsSync(dir.from)) {
        removeEmptyDirs(dir.from);
      }
    }
    
    console.log('\nCleanup complete!');
    rl.close();
  });
}

removeOriginalFiles().catch(err => {
  console.error('Error removing files:', err);
  rl.close();
  process.exit(1);
});
