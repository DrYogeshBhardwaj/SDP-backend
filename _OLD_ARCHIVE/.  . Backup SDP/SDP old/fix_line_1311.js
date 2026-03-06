const fs = require('fs');
const path = 'c:/SinaankProjects/SDP/js/app.js';

try {
    let content = fs.readFileSync(path, 'utf8');
    let lines = content.split('\n');

    // FIX 3: Refresh line 1311 (approx)
    // It should be: table.innerHTML = `

    let tableIndex = -1;
    for (let i = 1300; i < 1320; i++) {
        if (lines[i] && lines[i].includes('table.innerHTML =')) {
            tableIndex = i;
            break;
        }
    }

    if (tableIndex !== -1) {
        console.log(`Found table.innerHTML at line ${tableIndex + 1}`);
        console.log(`Current: ${JSON.stringify(lines[tableIndex])}`);

        // Force replace
        lines[tableIndex] = '        table.innerHTML = `';
        console.log("Refreshed line 1311 backtick.");
    } else {
        console.log("Could not find table.innerHTML assignment.");
    }

    const newContent = lines.join('\n');
    fs.writeFileSync(path, newContent, 'utf8');
    console.log("Fix applied.");

} catch (e) {
    console.error("Error:", e);
}
