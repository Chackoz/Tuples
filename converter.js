const fs = require('fs');
const path = require('path');

function walkSync(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') walkSync(filepath, filelist);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      filelist.push(filepath);
    }
  });
  return filelist;
}

const files = walkSync('./app');

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  let t = content;
  
  // Remove absolute grid backgrounds
  // t = t.replace(/<\s*div[^>]*pointer-events-none fixed inset-0 z-0[^>]*>[\s\S]*?<\/\s*div>/g, '');
  t = t.replace(/<\s*div[^>]*pointer-events-none fixed inset-0 z-0[^>]*\/>/g, '');
  
  // Replace brutalist tailwind properties
  t = t.replace(/border-2/g, 'border');
  t = t.replace(/border-4/g, 'border');
  t = t.replace(/border-b-2/g, 'border-b');
  t = t.replace(/border-b-4/g, 'border-b');
  t = t.replace(/border-t-2/g, 'border-t');
  t = t.replace(/border-t-4/g, 'border-t');
  t = t.replace(/border-l-2/g, 'border-l');
  t = t.replace(/border-l-4/g, 'border-l');
  t = t.replace(/border-r-2/g, 'border-r');
  t = t.replace(/border-r-4/g, 'border-r');
  
  // Replace standard brutal colors
  t = t.replace(/border-black/g, 'border-gray-200');
  t = t.replace(/bg-black/g, 'bg-gray-800');
  t = t.replace(/text-black/g, 'text-gray-900');
  
  t = t.replace(/bg-\[#f0f0f0\]/g, 'bg-gray-50');
  t = t.replace(/bg-\[#f8f8f8\]/g, 'bg-white');
  
  t = t.replace(/\bshadow-\[[^\]]+\]/g, 'shadow-sm');

  // Replace accent colors with calmer tag-like colors
  t = t.replace(/bg-yellow-300/g, 'bg-blue-100 text-blue-800 border-none');
  t = t.replace(/bg-pink-[34]00/g, 'bg-purple-100 text-purple-800 border-none');
  t = t.replace(/bg-green-[34]00/g, 'bg-emerald-100 text-emerald-800 border-none');
  t = t.replace(/bg-blue-[34]00/g, 'bg-sky-100 text-sky-800 border-none');
  
  // Clean up specific square tag accents
  t = t.replace(/<span\s+className=\"[^"]*w-4\s+h-4[^"]*inline-block\"[^>]*>\s*<\/span>\s*/g, '');
  t = t.replace(/<span\s+className=\"[^"]*w-6\s+h-6[^"]*inline-block\"[^>]*>\s*<\/span>\s*/g, '');

  if (content !== t) {
    fs.writeFileSync(file, t);
    console.log('Updated ' + file);
  }
});
