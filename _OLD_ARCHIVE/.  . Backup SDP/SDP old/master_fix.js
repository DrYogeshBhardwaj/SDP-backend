const fs = require('fs');
const path = 'c:/SinaankProjects/SDP/js/app.js';

try {
    let content = fs.readFileSync(path, 'utf8');
    let lines = content.split('\n');

    // FIX 1: Restore renderAdminPayouts / approvePayout (Lines 1283-1286 approx)
    // We look for the breakage we caused:
    // container.innerHTML = `
    // <div style="display:grid...
    // <!-- Section 1...
    // if (!confirm...

    // We want to change it back to:
    // container.innerHTML = html;
    // }
    // approvePayout(userId) {
    // if (!confirm...

    // Find the line with "approvePayout" or the if(!confirm)
    let payoutIndex = -1;
    for (let i = 1270; i < 1300; i++) {
        if (lines[i] && lines[i].includes('if (!confirm("Confirm that you have MANUALLY transferred')) {
            payoutIndex = i;
            break;
        }
    }

    if (payoutIndex !== -1) {
        // The lines BEFORE this should be the function signature
        // Currently they are garbage HTML we injected (lines[payoutIndex-1], etc)

        console.log(`Found payout logic at line ${payoutIndex + 1}`);
        console.log(`Preceding line: ${lines[payoutIndex - 1]}`);

        if (lines[payoutIndex - 1].includes('<!-- Section 1')) {
            console.log("Detecting broken Payouts function headers. Fixing...");

            // We need to overwrite lines [payoutIndex-3] to [payoutIndex-1]
            // Line [payoutIndex-3] was where we put "container.innerHTML = `"
            // We want "container.innerHTML = html;"

            lines[payoutIndex - 3] = '        container.innerHTML = html;';
            lines[payoutIndex - 2] = '    }';
            lines[payoutIndex - 1] = '';
            lines[payoutIndex] = '    approvePayout(userId) {';
            lines[payoutIndex + 1] = '        if (!confirm("Confirm that you have MANUALLY transferred the money via UPI? This will deduct the balance and log the transaction.")) return;';

            console.log("Restored renderAdminPayouts structure.");
        }
    } else {
        console.log("Could not locate payout logic to fix.");
    }

    // FIX 2: Add missing backtick to renderAdminUsers
    // Look for renderAdminUsers function end
    // It calls container.appendChild(table)

    let usersIndex = -1;
    for (let i = 1340; i < 1360; i++) {
        if (lines[i] && lines[i].includes('container.appendChild(table)')) {
            usersIndex = i;
            break;
        }
    }

    if (usersIndex !== -1) {
        console.log(`Found renderAdminUsers end at line ${usersIndex + 1}`);
        console.log(`Preceding line: ${lines[usersIndex - 1]}`);

        if (!lines[usersIndex - 1].includes('`;')) {
            console.log("Missing backtick logic detected.");
            // We expect the previous line to be </tbody> or similar
            // We need to insert `;` or `\`` before innerHTML assignment?
            // Wait, renderAdminUsers does: table.innerHTML = `...`;
            // It seems the closing ` is missing.

            // Check if previous line has backtick
            if (!lines[usersIndex - 1].trim().endsWith('`;')) {
                console.log("Injecting closing backtick.");
                // We can append it to the previous line or insert new line
                lines[usersIndex - 1] += '`;';
            }
        }
    } else {
        console.log("Could not locate renderAdminUsers end.");
    }

    const newContent = lines.join('\n');
    fs.writeFileSync(path, newContent, 'utf8');
    console.log("Master fix applied.");

} catch (e) {
    console.error("Error:", e);
}
