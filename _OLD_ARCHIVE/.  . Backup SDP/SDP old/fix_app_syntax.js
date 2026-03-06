const fs = require('fs');
const path = 'c:/SinaankProjects/SDP/js/app.js';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Find the renderAdminCommunication definition
    // Then find container.innerHTML inside it

    const funcStart = content.indexOf('renderAdminCommunication(container)');
    if (funcStart === -1) {
        console.log("Could not find renderAdminCommunication function definition!");
        process.exit(1);
    }

    const innerHTMLStart = content.indexOf('container.innerHTML =', funcStart);
    if (innerHTMLStart === -1) {
        console.log("Could not find container.innerHTML assignment inside function!");
        process.exit(1);
    }

    // Count lines up to this point
    const prefix = content.substring(0, innerHTMLStart);
    const lineNum = prefix.split('\n').length; // 1-based line number (roughly)

    console.log(`Found container.innerHTML at index ${innerHTMLStart}, approx line ${lineNum}`);

    // Get the lines array
    let lines = content.split('\n');
    let targetIndex = lineNum - 1;

    // Verify
    if (!lines[targetIndex].includes('container.innerHTML')) {
        // Checking neighbors
        if (lines[targetIndex - 1] && lines[targetIndex - 1].includes('container.innerHTML')) targetIndex--;
        else if (lines[targetIndex + 1] && lines[targetIndex + 1].includes('container.innerHTML')) targetIndex++;
    }

    console.log(`Target Line [${targetIndex + 1}]: ${JSON.stringify(lines[targetIndex])}`);
    console.log(`Next Line   [${targetIndex + 2}]: ${JSON.stringify(lines[targetIndex + 1])}`);

    if (lines[targetIndex].includes('container.innerHTML')) {
        // Fix target lines
        lines[targetIndex] = '        container.innerHTML = `';
        lines[targetIndex + 1] = '            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:2rem;">';
        lines[targetIndex + 2] = '';
        lines[targetIndex + 3] = '                <!-- Section 1: Notices (Urgent) -->';

        fs.writeFileSync(path, lines.join('\n'), 'utf8');
        console.log("Patched successfully!");
    } else {
        console.log("Failed to verify target line.");
    }

} catch (e) {
    console.error("Error:", e);
}
