/**
 * @fileoverview Controlador para el manejo de reservas de boletos
 * @author TransBus Team
 * @version 1.0.0
 */

const BookingModel = require('../models/Booking');
const RouteModel = require('../models/Route');
const { validateBookingData } = require('../utils/validation');
const { generateBookingReference } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Controlador para operaciones relacionadas con reservas de boletos
 * @class BookingController
 */
class BookingController {
    /**
     * Crea una nueva reserva de boleto
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Promise<Object>} Información de la reserva creada
     */
    static async createBooking(req, res) {
        try {
            const bookingData = req.body;
            
            logger.info('Creando nueva reserva:', bookingData);

            // Validar datos de la reserva
            const validation = validateBookingData(bookingData);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos de reserva inválidos',
                    errors: validation.errors
                });
            }

            // Verificar que la ruta existe
            const route = RouteModel.getRouteById(bookingData.routeId);
            if (!route) {
                return res.status(404).json({
                    success: false,
                    message: 'Ruta no encontrada'
                });
            }

            // Verificar disponibilidad del asiento
            const isAvailable = BookingModel.isSeatAvailable(
                bookingData.routeId, 
                bookingData.asiento, 
                bookingData.fecha
            );

            if (!isAvailable) {
                return res.status(409).json({
                    success: false,
                    message: `El asiento ${bookingData.asiento} no está disponible para la fecha seleccionada`
                });
            }

            // Generar referencia única para la reserva
            const bookingReference = generateBookingReference();

            // Crear la reserva
            const newBooking = {
                ...bookingData,
                referencia: bookingReference,
                estado: 'pendiente',
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString()
            };

            const createdBooking = BookingModel.createBooking(newBooking);

            logger.info(`Reserva creada con referencia: ${bookingReference}`);

            res.status(201).json({
                success: true,
                message: 'Reserva creada correctamente',
                data: {
                    ...createdBooking,
                    // No incluir información sensible en la respuesta
                    email: undefined
                },
                referencia: bookingReference,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error al crear reserva:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear la reserva',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }

    /**
     * Obtiene información de una reserva por su referencia
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Promise<Object>} Información de la reserva
     */
    static async getBookingByReference(req, res) {
        try {
            const { referencia } = req.params;
            
            logger.info(`Obteniendo reserva con referencia: ${referencia}`);

            if (!referencia || referencia.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Referencia de reserva inválida'
                });
            }

            const booking = BookingModel.getBookingByReference(referencia);
            
            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: `Reserva con referencia ${referencia} no encontrada`
                });
            }

            res.status(200).json({
                success: true,
                message: 'Reserva encontrada correctamente',
                data: {
                    ...booking,
                    // No incluir información sensible
                    email: undefined
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error al obtener reserva:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener información de la reserva',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }

    /**
     * Actualiza el estado de una reserva
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Promise<Object>} Información de la reserva actualizada
     */
    static async updateBookingStatus(req, res) {
        try {
            const { referencia } = req.params;
            const { estado, paymentSessionId } = req.body;
            
            logger.info(`Actualizando estado de reserva ${referencia} a: ${estado}`);

            // Validar estados permitidos
            const validStates = ['pendiente', 'confirmada', 'cancelada', 'completada'];
            if (!validStates.includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado de reserva inválido',
                    validStates
                });
            }

            const booking = BookingModel.getBookingByReference(referencia);
            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: `Reserva con referencia ${referencia} no encontrada`
                });
            }

            // Actualizar la reserva
            const updateData = {
                estado,
                fechaActualizacion: new Date().toISOString()
            };

            if (paymentSessionId) {
                updateData.paymentSessionId = paymentSessionId;
            }

            const updatedBooking = BookingModel.updateBooking(referencia, updateData);

            logger.info(`Reserva ${referencia} actualizada correctamente`);

            res.status(200).json({
                success: true,
                message: 'Reserva actualizada correctamente',
                data: {
                    ...updatedBooking,
                    email: undefined
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error al actualizar reserva:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar la reserva',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }

    /**
     * Obtiene los asientos ocupados para una ruta y fecha específica
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Promise<Object>} Lista de asientos ocupados
     */
    static async getOccupiedSeats(req, res) {
        try {
            const { routeId, fecha } = req.query;
            
            logger.info(`Obteniendo asientos ocupados para ruta ${routeId} en fecha ${fecha}`);

            if (!routeId || !fecha) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren parámetros routeId y fecha'
                });
            }

            const occupiedSeats = BookingModel.getOccupiedSeats(parseInt(routeId), fecha);
            
            res.status(200).json({
                success: true,
                message: 'Asientos ocupados obtenidos correctamente',
                data: {
                    routeId: parseInt(routeId),
                    fecha,
                    occupiedSeats,
                    count: occupiedSeats.length
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error al obtener asientos ocupados:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener asientos ocupados',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }

    /**
     * Cancela una reserva existente
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Promise<Object>} Confirmación de cancelación
     */
    static async cancelBooking(req, res) {
        try {
            const { referencia } = req.params;
            const { motivo } = req.body;
            
            logger.info(`Cancelando reserva: ${referencia}`);

            const booking = BookingModel.getBookingByReference(referencia);
            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: `Reserva con referencia ${referencia} no encontrada`
                });
            }

            if (booking.estado === 'cancelada') {
                return res.status(400).json({
                    success: false,
                    message: 'La reserva ya está cancelada'
                });
            }

            // Cancelar la reserva
            const cancelledBooking = BookingModel.updateBooking(referencia, {
                estado: 'cancelada',
                motivoCancelacion: motivo || 'Cancelación solicitada por el usuario',
                fechaCancelacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString()
            });

            logger.info(`Reserva ${referencia} cancelada correctamente`);

            res.status(200).json({
                success: true,
                message: 'Reserva cancelada correctamente',
                data: {
                    referencia,
                    estado: 'cancelada',
                    fechaCancelacion: cancelledBooking.fechaCancelacion
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error al cancelar reserva:', error);
            res.status(500).json({
                success: false,
                message: 'Error al cancelar la reserva',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }
}

module.exports = BookingController;