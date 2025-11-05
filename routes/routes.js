/**
 * @fileoverview Rutas para el manejo de rutas de autobuses
 * @author TransBus Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const RouteController = require('../controllers/routeController');
const { validateRouteQuery } = require('../middleware/validation');
const { rateLimiter } = require('../middleware/rateLimiter');

/**
 * @route GET /api/routes
 * @desc Obtiene todas las rutas disponibles
 * @access Public
 * @example
 * GET /api/routes
 * Response: {
 *   success: true,
 *   message: "Rutas obtenidas correctamente",
 *   data: { ... }
 * }
 */
router.get('/', 
    rateLimiter, 
    RouteController.getAllRoutes
);

/**
 * @route GET /api/routes/search
 * @desc Busca rutas por origen y destino
 * @access Public
 * @param {string} origen - Ciudad de origen (query param)
 * @param {string} destino - Ciudad de destino (query param)
 * @param {string} fecha - Fecha del viaje (query param, formato YYYY-MM-DD)
 * @example
 * GET /api/routes/search?origen=Ciudad de México&destino=Guadalajara&fecha=2023-12-25
 */
router.get('/search', 
    rateLimiter,
    validateRouteQuery,
    RouteController.searchRoutes
);

/**
 * @route GET /api/routes/cities
 * @desc Obtiene todas las ciudades disponibles
 * @access Public
 * @example
 * GET /api/routes/cities
 * Response: {
 *   success: true,
 *   data: ["Ciudad de México", "Guadalajara", "Monterrey"]
 * }
 */
router.get('/cities', 
    rateLimiter,
    RouteController.getAvailableCities
);

/**
 * @route GET /api/routes/destinations/:ciudad
 * @desc Obtiene destinos disponibles desde una ciudad específica
 * @access Public
 * @param {string} ciudad - Nombre de la ciudad de origen
 * @example
 * GET /api/routes/destinations/Ciudad de México
 */
router.get('/destinations/:ciudad', 
    rateLimiter,
    (req, res, next) => {
        // Decodificar el parámetro de la ciudad
        req.params.ciudad = decodeURIComponent(req.params.ciudad);
        next();
    },
    async (req, res) => {
        try {
            const { ciudad } = req.params;
            const RouteModel = require('../models/Route');
            
            const destinations = RouteModel.getDestinationsFrom(ciudad);
            
            if (destinations.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `No hay destinos disponibles desde ${ciudad}`
                });
            }

            res.status(200).json({
                success: true,
                message: 'Destinos obtenidos correctamente',
                data: {
                    origen: ciudad,
                    destinations,
                    count: destinations.length
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener destinos',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }
);

/**
 * @route GET /api/routes/schedule/:scheduleId
 * @desc Obtiene información detallada de un horario específico
 * @access Public
 * @param {number} scheduleId - ID del horario
 * @example
 * GET /api/routes/schedule/1
 */
router.get('/schedule/:scheduleId', 
    rateLimiter,
    RouteController.getRouteById
);

/**
 * @route GET /api/routes/stats
 * @desc Obtiene estadísticas de las rutas
 * @access Public
 * @example
 * GET /api/routes/stats
 */
router.get('/stats', 
    rateLimiter,
    async (req, res) => {
        try {
            const RouteModel = require('../models/Route');
            const stats = RouteModel.getRouteStats();
            
            res.status(200).json({
                success: true,
                message: 'Estadísticas obtenidas correctamente',
                data: stats,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }
);

/**
 * @route GET /api/routes/validate
 * @desc Valida si una ruta específica existe
 * @access Public
 * @param {string} origen - Ciudad de origen (query param)
 * @param {string} destino - Ciudad de destino (query param)
 * @example
 * GET /api/routes/validate?origen=Ciudad de México&destino=Guadalajara
 */
router.get('/validate', 
    rateLimiter,
    async (req, res) => {
        try {
            const { origen, destino } = req.query;
            
            if (!origen || !destino) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren parámetros origen y destino'
                });
            }

            const RouteModel = require('../models/Route');
            const exists = RouteModel.routeExists(origen, destino);
            
            res.status(200).json({
                success: true,
                message: 'Validación completada',
                data: {
                    origen,
                    destino,
                    exists,
                    routeKey: exists ? `${origen}-${destino}` : null
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al validar ruta',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }
);

/**
 * @route GET /api/routes/schedules
 * @desc Obtiene horarios disponibles para una ruta y fecha
 * @access Public
 * @param {string} origen - Ciudad de origen (query param)
 * @param {string} destino - Ciudad de destino (query param)
 * @param {string} fecha - Fecha del viaje (query param)
 * @example
 * GET /api/routes/schedules?origen=Ciudad de México&destino=Guadalajara&fecha=2023-12-25
 */
router.get('/schedules', 
    rateLimiter,
    validateRouteQuery,
    async (req, res) => {
        try {
            const { origen, destino, fecha } = req.query;
            const RouteModel = require('../models/Route');
            
            const schedules = RouteModel.getAvailableSchedules(origen, destino, fecha);
            
            if (schedules.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `No hay horarios disponibles para ${origen} → ${destino} el ${fecha}`
                });
            }

            res.status(200).json({
                success: true,
                message: 'Horarios obtenidos correctamente',
                data: {
                    origen,
                    destino,
                    fecha,
                    schedules,
                    count: schedules.length
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener horarios',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }
);

module.exports = router;