const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const geoip = require('geoip-lite');

// POST /api/analytics/track
// Public endpoint to track site visits
router.post('/track', async (req, res) => {
    try {
        const { referrer, page } = req.body;
        
        // Extract IP (handling potential proxy headers)
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'] || '';

        // Lookup location
        const geo = geoip.lookup(ip);
        const country = geo ? geo.country : 'Unknown';
        const city = geo ? geo.city : 'Unknown';

        await prisma.siteVisit.create({
            data: {
                ip: ip,
                page: page || 'Unknown',
                referrer: referrer || 'Direct',
                userAgent: userAgent,
                country: country,
                city: city
            }
        });

        res.status(200).json({ success: true, message: 'Tracked' });
    } catch (error) {
        console.error('[ANALYTICS_TRACK_ERROR]', error);
        // Fail silently so it doesn't affect the user experience
        res.status(500).json({ success: false });
    }
});

module.exports = router;
