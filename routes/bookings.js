/**
 * @fileoverview Rutas para el manejo de reservas
 * @author TransBus Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const BookingController = require('../controllers/bookingController');
const { validateBookingData } = require('../middleware/validation');
const { rateLimiter } = require('../middleware/rateLimiter');

/**
 * @route POST /api/bookings
 * @desc Crea una nueva reserva
 * @access Public
 * @body {Object} bookingData - Datos de la reserva
 * @example
 * POST /api/bookings
 * Body: {
 *   "nombre": "Juan Pérez",
 *   "email": "juan@email.com",
 *   "telefono": "+52 55 1234 5678",
 *   "origen": "Ciudad de México",
 *   "destino": "Guadalajara",
 *   "asiento": 15,
 *   "horario": "10:00",
 *   "fecha": "2023-12-25",
 *   "precio": 30.00
 * }
 */
router.post('/', 
    rateLimiter,
    validateBookingData,
    BookingController.createBooking
);

/**
 * @route GET /api/bookings/:referencia
 * @desc Obtiene una reserva por su referencia
 * @access Public
 * @param {string} referencia - Referencia única de la reserva
 * @example
 * GET /api/bookings/TB123ABC456
 */
router.get('/:referencia', 
    rateLimiter,
    BookingController.getBookingByReference
);

/**
 * @route PUT /api/bookings/:referencia/status
 * @desc Actualiza el estado de una reserva
 * @access Public
 * @param {string} referencia - Referencia de la reserva
 * @body {Object} statusData - Nuevo estado y datos adicionales
 * @example
 * PUT /api/bookings/TB123ABC456/status
 * Body: {
 *   "estado": "confirmada",
 *   "paymentSessionId": "cs_123456789"
 * }
 */
router.put('/:referencia/status', 
    rateLimiter,
    async (req, res, next) => {
        // Validación básica del estado
        const { estado } = req.body;
        const validStates = ['pendiente', 'confirmada', 'cancelada', 'completada'];
        
        if (!estado || !validStates.includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido',
                validStates
            });
        }
        
        next();
    },
    BookingController.updateBookingStatus
);

/**
 * @route DELETE /api/bookings/:referencia
 * @desc Cancela una reserva
 * @access Public
 * @param {string} referencia - Referencia de la reserva
 * @body {Object} cancellationData - Datos de cancelación
 * @example
 * DELETE /api/bookings/TB123ABC456
 * Body: {
 *   "motivo": "Cambio de planes"
 * }
 */
router.delete('/:referencia', 
    rateLimiter,
    BookingController.cancelBooking
);

/**
 * @route GET /api/bookings/search/passenger
 * @desc Busca reservas por nombre del pasajero
 * @access Public
 * @param {string} nombre - Nombre del pasajero (query param)
 * @example
 * GET /api/bookings/search/passenger?nombre=Juan
 */
router.get('/search/passenger', 
    rateLimiter,
    async (req, res) => {
        try {
            const { nombre } = req.query;
            
            if (!nombre || nombre.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre debe tener al menos 2 caracteres'
                });
            }

            const BookingModel = require('../models/Booking');
            const bookings = BookingModel.searchByPassengerName(nombre.trim());
            
            res.status(200).json({
                success: true,
                message: 'Búsqueda completada',
                data: bookings.map(booking => ({
                    ...booking,
                    // No incluir información sensible
                    email: undefined,
                    telefono: undefined
                })),
                count: bookings.length,
                searchTerm: nombre.trim(),
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error en la búsqueda',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }
);

/**
 * @route GET /api/bookings/seats/occupied
 * @desc Obtiene asientos ocupados para una ruta y fecha
 * @access Public
 * @param {number} routeId - ID de la ruta (query param)
 * @param {string} fecha - Fecha del viaje (query param)
 * @example
 * GET /api/bookings/seats/occupied?routeId=1&fecha=2023-12-25
 */
router.get('/seats/occupied', 
    rateLimiter,
    BookingController.getOccupiedSeats
);

/**
 * @route GET /api/bookings/stats/general
 * @desc Obtiene estadísticas generales de reservas
 * @access Public
 * @example
 * GET /api/bookings/stats/general
 */
router.get('/stats/general', 
    rateLimiter,
    async (req, res) => {
        try {
            const BookingModel = require('../models/Booking');
            const stats = BookingModel.getBookingStats();
            
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
 * @route GET /api/bookings/upcoming/reminders
 * @desc Obtiene reservas próximas para recordatorios
 * @access Public
 * @param {number} hours - Horas antes del viaje (query param, default: 24)
 * @example
 * GET /api/bookings/upcoming/reminders?hours=12
 */
router.get('/upcoming/reminders', 
    rateLimiter,
    async (req, res) => {
        try {
            const hours = parseInt(req.query.hours) || 24;
            
            if (hours < 1 || hours > 168) { // Entre 1 hora y 1 semana
                return res.status(400).json({
                    success: false,
                    message: 'Las horas deben estar entre 1 y 168 (1 semana)'
                });
            }

            const BookingModel = require('../models/Booking');
            const upcomingBookings = BookingModel.getUpcomingBookings(hours);
            
            res.status(200).json({
                success: true,
                message: 'Reservas próximas obtenidas correctamente',
                data: upcomingBookings.map(booking => ({
                    referencia: booking.referencia,
                    nombre: booking.nombre,
                    origen: booking.origen,
                    destino: booking.destino,
                    fecha: booking.fecha,
                    horario: booking.horario,
                    asiento: booking.asiento,
                    horasRestantes: Math.round(
                        (new Date(`${booking.fecha}T${booking.horario}`) - new Date()) / (1000 * 60 * 60)
                    )
                })),
                count: upcomingBookings.length,
                hoursFilter: hours,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener reservas próximas',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }
);

/**
 * @route GET /api/bookings/:referencia/can-modify
 * @desc Verifica si una reserva puede ser modificada
 * @access Public
 * @param {string} referencia - Referencia de la reserva
 * @example
 * GET /api/bookings/TB123ABC456/can-modify
 */
router.get('/:referencia/can-modify', 
    rateLimiter,
    async (req, res) => {
        try {
            const { referencia } = req.params;
            const BookingModel = require('../models/Booking');
            
            const result = BookingModel.canModifyBooking(referencia);
            
            res.status(200).json({
                success: true,
                message: 'Verificación completada',
                data: {
                    referencia,
                    ...result
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al verificar reserva',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }
);

/**
 * @route GET /api/bookings
 * @desc Obtiene lista de reservas con filtros opcionales
 * @access Public
 * @param {string} [estado] - Filtrar por estado (query param)
 * @param {string} [fecha] - Filtrar por fecha (query param)
 * @param {string} [email] - Filtrar por email (query param)
 * @param {number} [page] - Página (query param, default: 1)
 * @param {number} [limit] - Límite por página (query param, default: 10)
 * @example
 * GET /api/bookings?estado=confirmada&page=1&limit=5
 */
router.get('/', 
    rateLimiter,
    async (req, res) => {
        try {
            const { estado, fecha, email, page, limit } = req.query;
            const BookingModel = require('../models/Booking');
            
            const filters = {
                estado,
                fecha,
                email,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10
            };

            // Validar límite máximo
            if (filters.limit > 100) {
                filters.limit = 100;
            }

            const result = BookingModel.getBookings(filters);
            
            res.status(200).json({
                success: true,
                message: 'Reservas obtenidas correctamente',
                data: result.data.map(booking => ({
                    ...booking,
                    // No incluir información sensible en listados
                    email: undefined,
                    telefono: undefined
                })),
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages
                },
                filters: {
                    estado: filters.estado || null,
                    fecha: filters.fecha || null,
                    email: filters.email ? '***' : null
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener reservas',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }
);

module.exports = router;