const axios = require('axios');

async function testRegistration() {
    const API_URL = 'http://localhost:5000/api/auth/register';
    const TEST_MOBILE = '9876543211'; // New mobile to avoid conflicts
    
    // Registering a new user sponsored by SDP-PARTNER (7777777777)
    const payload = {
        mobile: TEST_MOBILE,
        name: 'Final Test User',
        pin: '1234',
        amount: 779, // Basic Plan
        sponsor: 'SDP-PARTNER'
    };

    try {
        console.log('Sending Registration Request...');
        const res = await axios.post(API_URL, payload);
        console.log('Response Status:', res.status);
        console.log('Response Data:', JSON.stringify(res.data, null, 2));

        if (res.data.success) {
            console.log('✅ Registration Successful!');
            
            // Now verify database state
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            
            const user = await prisma.user.findUnique({
                where: { mobile: TEST_MOBILE },
                include: { cash: true }
            });
            
            if (!user) {
                 console.error('❌ CRITICAL ERROR: API said 201 but user NOT in DB!');
                 process.exit(1);
            }

            console.log('--- New User Check ---');
            console.log('Plan:', user.plan_type);
            console.log('L1 Sponsor ID:', user.level1_id);
            console.log('L2 Sponsor ID:', user.level2_id);
            console.log('L3 Sponsor ID:', user.level3_id);
            console.log('Activated At:', user.activated_at);

            // Check Sponsor Bonuses
            const sponsors = await prisma.user.findMany({
                where: { 
                    mobile: { in: ['7777777777', '8888888888', '9999999999'] } 
                },
                include: { cash: true, transactions: { where: { from_user_id: user.id } } }
            });

            console.log('\n--- Commission Audit ---');
            sponsors.forEach(s => {
                const tx = s.transactions[0];
                console.log(`User: ${s.name} (${s.mobile})`);
                console.log(`Wallet Balance: ₹${s.cash.balance}`);
                console.log(`Bonus Amount: ₹${tx?.amount || 0} at Level ${tx?.level} (${tx?.plan_type})`);
            });
            
            process.exit(0);
        }
    } catch (err) {
        console.error('❌ Test Failed:', err.response?.data || err.message);
        process.exit(1);
    }
}

testRegistration();
