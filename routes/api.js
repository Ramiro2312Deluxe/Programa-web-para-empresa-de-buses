/**
 * @fileoverview Rutas principales de la API
 * @author TransBus Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

// Importar sub-rutas
const routeRoutes = require('./routes');
const bookingRoutes = require('./bookings');
const paymentRoutes = require('./payments');

// Middleware para logging de todas las requests de API
router.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

/**
 * @route GET /api/health
 * @desc Health check endpoint
 * @access Public
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'TransBus API funcionando correctamente',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

/**
 * @route GET /api/info
 * @desc Información general de la API
 * @access Public
 */
router.get('/info', (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            name: 'TransBus API',
            version: '1.0.0',
            description: 'API para reservas de boletos de autobús',
            endpoints: {
                routes: '/api/routes',
                bookings: '/api/bookings',
                payments: '/api/payments'
            },
            documentation: '/api/docs',
            health: '/api/health'
        },
        timestamp: new Date().toISOString()
    });
});

/**
 * @route GET /api/status
 * @desc Estado detallado del sistema
 * @access Public
 */
router.get('/status', (req, res) => {
    const memUsage = process.memoryUsage();
    
    res.status(200).json({
        success: true,
        data: {
            status: 'operational',
            uptime: process.uptime(),
            memory: {
                rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
                heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
                heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
                external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
            },
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
            platform: process.platform
        },
        timestamp: new Date().toISOString()
    });
});

// Configurar sub-rutas
router.use('/routes', routeRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);

/**
 * @route ALL /api/*
 * @desc Manejo de rutas no encontradas
 * @access Public
 */
router.all('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Ruta ${req.method} ${req.originalUrl} no encontrada`,
        availableEndpoints: [
            'GET /api/health',
            'GET /api/info',
            'GET /api/status',
            'GET /api/routes',
            'POST /api/bookings',
            'POST /api/payments/checkout-session'
        ],
        timestamp: new Date().toISOString()
    });
});

module.exports = router;