const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COLORS = [
    { code: 'C01', name: 'Blue', hue: 210, hex: '#3BA7FF' },
    { code: 'C02', name: 'Cyan', hue: 190, hex: '#00E5FF' },
    { code: 'C03', name: 'Green', hue: 140, hex: '#00C853' },
    { code: 'C04', name: 'Yellow', hue: 60, hex: '#FFD600' },
    { code: 'C05', name: 'Orange', hue: 30, hex: '#FF6D00' },
    { code: 'C06', name: 'Pink', hue: 320, hex: '#FF4081' },
    { code: 'C07', name: 'Purple', hue: 270, hex: '#7C4DFF' },
    { code: 'C08', name: 'Red', hue: 0, hex: '#FF1744' },
    { code: 'C09', name: 'Teal', hue: 170, hex: '#00BFA5' },
    { code: 'C10', name: 'Indigo', hue: 240, hex: '#304FFE' },
    { code: 'C11', name: 'Lime', hue: 75, hex: '#AEEA00' },
    { code: 'C12', name: 'Aqua', hue: 200, hex: '#00B0FF' }
];

async function main() {
    console.log('--- Seeding SID System ---');

    // 1. Seed Master Colors
    for (const color of COLORS) {
        await prisma.sidColorMaster.upsert({
            where: { code: color.code },
            update: color,
            create: color
        });
    }
    console.log(`Seeded ${COLORS.length} master colors.`);

    // 2. Seed Combos (72 unique combos)
    let comboCount = 0;
    for (let i = 0; i < COLORS.length; i++) {
        const c1 = COLORS[i];
        // For each color, create 6 varied combos
        // Using various offsets to get distinct looks
        const offsets = [1, 2, 4, 6, 8, 10]; // varied offsets from current index
        
        for (const offset of offsets) {
            comboCount++;
            const j = (i + offset) % COLORS.length;
            const c2 = COLORS[j];
            
            const comboId = `CC${comboCount.toString().padStart(2, '0')}`;
            
            await prisma.sidColorCombo.upsert({
                where: { id: comboId },
                update: {
                    color1Code: c1.code,
                    color2Code: c2.code
                },
                create: {
                    id: comboId,
                    color1Code: c1.code,
                    color2Code: c2.code
                }
            });
        }
    }
    console.log(`Seeded ${comboCount} unique combinations.`);
    console.log('--- SID Seeding Finished ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
