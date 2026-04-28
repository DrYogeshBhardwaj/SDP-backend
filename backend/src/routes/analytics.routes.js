const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/analytics/track
// Public endpoint to track site visits
router.post('/track', async (req, res) => {
    try {
        const { referrer, page } = req.body;
        
        // Extract IP (handling potential proxy headers)
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'] || '';

        // Lookup location via GeoJS API (free, no limits, lightweight)
        let country = 'Unknown';
        let city = 'Unknown';
        
        try {
            // Only lookup if IP is valid and not localhost
            if (ip && ip !== '::1' && ip !== '127.0.0.1' && !ip.startsWith('192.168.')) {
                // GeoJS returns JSON with country and city
                const response = await fetch(`https://get.geojs.io/v1/ip/geo/${ip.split(',')[0].trim()}.json`);
                if (response.ok) {
                    const geo = await response.json();
                    if (geo.country) country = geo.country;
                    if (geo.city) city = geo.city;
                }
            }
        } catch(e) {
            console.warn('[GEOIP_ERROR] Failed to fetch location for IP:', ip);
        }

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
