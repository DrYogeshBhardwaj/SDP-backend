const fs = require('fs');
const path = 'c:/SinaankProjects/SDP/js/app.js';

try {
    let content = fs.readFileSync(path, 'utf8');
    let lines = content.split('\n');

    console.log("--- CONTEXT 1300-1320 ---");
    for (let i = 1300; i < 1320; i++) {
        console.log(`${i + 1}: ${JSON.stringify(lines[i])}`);
    }

    // Find the line with table.innerHTML = `
    let targetIndex = -1;
    for (let i = 1300; i < 1320; i++) {
        if (lines[i] && lines[i].includes('table.innerHTML =')) {
            targetIndex = i;
            break;
        }
    }

    if (targetIndex !== -1) {
        const line = lines[targetIndex];
        console.log(`\nLine ${targetIndex + 1} chars:`);
        for (let j = 0; j < line.length; j++) {
            console.log(`Char ${j}: '${line[j]}' (${line.charCodeAt(j)})`);
        }
    }

} catch (e) {
    console.error("Error:", e);
}
