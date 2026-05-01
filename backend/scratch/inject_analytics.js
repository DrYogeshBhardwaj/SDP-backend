const fs = require('fs');
const path = require('path');
const dir = 'C:\\SinaankProjects\\Sinaank Therapy\\frontend';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('js/config.js')) {
      content = content.replace('</body>', '<script src="js/config.js"></script>\n</body>');
  }
  
  if (!content.includes('js/analytics.js')) {
      content = content.replace('</body>', '<script src="js/analytics.js"></script>\n</body>');
  }
  
  fs.writeFileSync(filePath, content);
  console.log('Injected into ' + file);
}
