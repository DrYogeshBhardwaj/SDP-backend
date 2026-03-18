const fs = require('fs');
const path = require('path');
const modulesDir = path.join(__dirname, 'src/modules');

function traverse(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath);
        } else if (file.endsWith('.routes.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('const { authMiddleware } = require();')) {
                content = content.replace(/const \{ authMiddleware \} = require\(\);/g, "const { authMiddleware } = require('../../middlewares/authMiddleware');");
                fs.writeFileSync(fullPath, content);
                console.log('Fixed ' + file);
            }
        }
    });
}
traverse(modulesDir);
