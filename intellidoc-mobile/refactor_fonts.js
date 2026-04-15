const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./app').concat(walk('./src'));
let modifiedCount = 0;

for (const file of files) {
  if (file.includes('src/components/Text.tsx')) continue;

  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Pattern to match import { ... Text ... } from 'react-native'
  // It handles multi-line imports
  const rnImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]react-native['"];?/g;
  
  content = content.replace(rnImportRegex, (match, imports) => {
    // Check if Text is in the imports
    const importList = imports.split(',').map(i => i.trim());
    const textIndex = importList.findIndex(i => i === 'Text');
    
    if (textIndex !== -1) {
      // Remove Text from react-native import
      importList.splice(textIndex, 1);
      
      const newRnImport = importList.filter(i => i.length > 0).length > 0 
        ? `import { ${importList.filter(i => i.length > 0).join(', ')} } from 'react-native';\n`
        : '';
        
      // Figure out relative path to src/components/Text
      // Depth of current file from root
      const depth = file.split(path.sep).length - 1;
      // if file is app/(app)/stats.tsx, depth is 3. We need 2 levels up to root, then src/components/Text
      // actually, just use path.relative
      const dirPath = path.dirname(file);
      let relativePath = path.relative(dirPath, './src/components/Text');
      if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
      // remove .tsx
      relativePath = relativePath.replace('.tsx', '');
      
      const customTextImport = `import Text from '${relativePath}';\n`;
      return customTextImport + newRnImport;
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
    console.log(`Refactored ${file}`);
  }
}

console.log(`Refactored ${modifiedCount} files.`);
