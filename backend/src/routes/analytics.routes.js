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
// GET /api/analytics/stats
// Public endpoint to view traffic stats
router.get('/stats', async (req, res) => {
    try {
        const totalVisits = await prisma.siteVisit.count();
        
        // Today's visits
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayVisits = await prisma.siteVisit.count({
            where: { createdAt: { gte: today } }
        });

        // Group by Referrer
        const referrers = await prisma.siteVisit.groupBy({
            by: ['referrer'],
            _count: { referrer: true },
            orderBy: { _count: { referrer: 'desc' } },
            take: 10
        });

        // Group by Page
        const pages = await prisma.siteVisit.groupBy({
            by: ['page'],
            _count: { page: true },
            orderBy: { _count: { page: 'desc' } },
            take: 10
        });

        // Group by Location (City/Country)
        const countries = await prisma.siteVisit.groupBy({
            by: ['country', 'city'],
            _count: { _all: true },
            orderBy: { _count: { country: 'desc' } },
            take: 10
        });

        res.status(200).json({
            success: true,
            data: {
                totalVisits,
                todayVisits,
                topReferrers: referrers.map(r => ({ referrer: r.referrer, count: r._count.referrer })),
                topPages: pages.map(p => ({ page: p.page, count: p._count.page })),
                topLocations: countries.map(c => ({ 
                    location: `${c.city !== 'Unknown' && c.city ? c.city + ', ' : ''}${c.country || 'Unknown'}`, 
                    count: c._count._all 
                }))
            }
        });
    } catch (err) {
        console.error('[ANALYTICS_STATS_ERROR]', err);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
});

module.exports = router;
