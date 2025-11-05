/**
 * @fileoverview Controlador para el manejo de rutas de autobuses
 * @author TransBus Team
 * @version 1.0.0
 */

const RouteModel = require('../models/Route');
const { validateRouteParams } = require('../utils/validation');
const logger = require('../utils/logger');

/**
 * Controlador para operaciones relacionadas con rutas de autobuses
 * @class RouteController
 */
class RouteController {
    /**
     * Obtiene todas las rutas disponibles
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Promise<Object>} Lista de rutas disponibles
     */
    static async getAllRoutes(req, res) {
        try {
            logger.info('Solicitud para obtener todas las rutas');
            
            const routes = RouteModel.getAllRoutes();
            
            res.status(200).json({
                success: true,
                message: 'Rutas obtenidas correctamente',
                data: routes,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error al obtener rutas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }

    /**
     * Busca rutas específicas por origen y destino
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Promise<Object>} Rutas filtradas por origen y destino
     */
    static async searchRoutes(req, res) {
        try {
            const { origen, destino, fecha } = req.query;
            
            logger.info(`Búsqueda de rutas: ${origen} -> ${destino} para ${fecha}`);

            // Validar parámetros
            const validation = validateRouteParams({ origen, destino, fecha });
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Parámetros de búsqueda inválidos',
                    errors: validation.errors
                });
            }

            const routes = RouteModel.searchRoutes(origen, destino, fecha);
            
            if (!routes || routes.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `No se encontraron rutas disponibles de ${origen} a ${destino}`,
                    data: []
                });
            }

            res.status(200).json({
                success: true,
                message: 'Rutas encontradas correctamente',
                data: routes,
                count: routes.length,
                searchParams: { origen, destino, fecha },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error en búsqueda de rutas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al buscar rutas',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }

    /**
     * Obtiene información detallada de una ruta específica
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Promise<Object>} Información detallada de la ruta
     */
    static async getRouteById(req, res) {
        try {
            const { routeId } = req.params;
            
            logger.info(`Obteniendo ruta con ID: ${routeId}`);

            if (!routeId || isNaN(routeId)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de ruta inválido'
                });
            }

            const route = RouteModel.getRouteById(parseInt(routeId));
            
            if (!route) {
                return res.status(404).json({
                    success: false,
                    message: `Ruta con ID ${routeId} no encontrada`
                });
            }

            res.status(200).json({
                success: true,
                message: 'Ruta encontrada correctamente',
                data: route,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error al obtener ruta por ID:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener información de la ruta',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }

    /**
     * Obtiene las ciudades disponibles como origen y destino
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Promise<Object>} Lista de ciudades disponibles
     */
    static async getAvailableCities(req, res) {
        try {
            logger.info('Obteniendo ciudades disponibles');
            
            const cities = RouteModel.getAvailableCities();
            
            res.status(200).json({
                success: true,
                message: 'Ciudades obtenidas correctamente',
                data: cities,
                count: cities.length,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error al obtener ciudades:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener ciudades disponibles',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }
}

module.exports = RouteController;