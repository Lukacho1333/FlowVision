#!/usr/bin/env node

/**
 * Remove console.log statements from production code
 * Following @.cursorrules - No console.log in production code
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories to clean
const directories = ['app', 'lib', 'components'];

// Patterns to match console.log statements
const consoleLogPattern = /^\s*console\.log\([^)]*\);\s*$/gm;
const consoleLogInlinePattern = /console\.log\([^)]*\);\s*/g;

function removeConsoleLogs(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Remove standalone console.log statements
    let newContent = content.replace(consoleLogPattern, '');
    
    // Remove inline console.log statements (but leave the line)
    newContent = newContent.replace(consoleLogInlinePattern, '');
    
    // Check if content was modified
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Cleaned: ${filePath}`);
      modified = true;
    }
    
    return modified;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function findAndCleanFiles(dir) {
  let totalCleaned = 0;
  
  try {
    const files = execSync(`find ${dir} -name "*.ts" -o -name "*.tsx"`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(file => file.length > 0);
    
    for (const file of files) {
      // Skip test files and generated files
      if (file.includes('test') || file.includes('.next/') || file.includes('node_modules/')) {
        continue;
      }
      
      if (removeConsoleLogs(file)) {
        totalCleaned++;
      }
    }
  } catch (error) {
    console.error(`❌ Error finding files in ${dir}:`, error.message);
  }
  
  return totalCleaned;
}

function main() {
  console.log('🧹 Removing console.log statements from production code...\n');
  
  let totalCleaned = 0;
  
  for (const dir of directories) {
    if (fs.existsSync(dir)) {
      console.log(`📂 Processing directory: ${dir}`);
      const cleaned = findAndCleanFiles(dir);
      totalCleaned += cleaned;
      console.log(`   Cleaned ${cleaned} files\n`);
    } else {
      console.log(`⚠️  Directory not found: ${dir}\n`);
    }
  }
  
  console.log(`🎉 Cleanup complete! Modified ${totalCleaned} files total.`);
  
  if (totalCleaned > 0) {
    console.log('\n📋 Next steps:');
    console.log('1. Review the changes: git diff');
    console.log('2. Test the application: npm run dev');
    console.log('3. Commit the changes: git add . && git commit -m "fix(cleanup): remove console.log statements from production code"');
  }
}

main();
