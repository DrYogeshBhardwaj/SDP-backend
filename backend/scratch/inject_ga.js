const fs = require('fs');
const path = require('path');

const gaCode = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-SM76B4W3PN"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-SM76B4W3PN');
</script>
`;

const dirs = ['frontend', 'HOST'];

dirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) return;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.html'));

    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        let content = fs.readFileSync(filePath, 'utf8');

        if (content.includes('G-SM76B4W3PN')) {
            console.log(`Skipping ${dir}/${file} (Already exists)`);
            return;
        }

        // Insert after <head> or before </head>
        if (content.includes('<head>')) {
            content = content.replace('<head>', '<head>\n    ' + gaCode);
            fs.writeFileSync(filePath, content);
            console.log(`Updated ${dir}/${file}`);
        } else {
            console.log(`Warning: No <head> tag in ${dir}/${file}`);
        }
    });
});
