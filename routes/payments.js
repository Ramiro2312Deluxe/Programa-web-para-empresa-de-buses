/**
 * @fileoverview Rutas para el manejo de pagos
 * @author TransBus Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { validatePaymentData } = require('../middleware/validation');
const { rateLimiter, strictRateLimiter } = require('../middleware/rateLimiter');

/**
 * @route POST /api/payments/create-checkout-session
 * @desc Crea una sesión de checkout de Stripe
 * @access Public
 * @body {Object} paymentData - Datos del pago y pasajero
 * @example
 * POST /api/payments/create-checkout-session
 * Body: {
 *   "nombre": "Juan Pérez",
 *   "email": "juan@email.com",
 *   "origen": "Ciudad de México",
 *   "destino": "Guadalajara",
 *   "asiento": 15,
 *   "horario": "10:00",
 *   "fecha": "2023-12-25",
 *   "precio": 30.00
 * }
 */
router.post('/create-checkout-session', 
    strictRateLimiter, // Límite más estricto para pagos
    validatePaymentData,
    PaymentController.createCheckoutSession
);

/**
 * @route GET /api/payments/checkout/session
 * @desc Verifica el estado de una sesión de pago
 * @access Public
 * @param {string} session_id - ID de la sesión de Stripe (query param)
 * @example
 * GET /api/payments/checkout/session?session_id=cs_123456789
 */
router.get('/checkout/session', 
    rateLimiter,
    PaymentController.verifyPaymentSession
);

/**
 * @route POST /api/payments/webhook
 * @desc Maneja webhooks de Stripe
 * @access Public (con verificación de firma)
 * @body Raw - Cuerpo raw del webhook
 * @example
 * POST /api/payments/webhook
 * Headers: { "stripe-signature": "..." }
 * Body: { ... } (raw from Stripe)
 */
router.post('/webhook', 
    // No aplicar rate limiting ni parsing de JSON para webhooks
    express.raw({type: 'application/json'}),
    PaymentController.handleStripeWebhook
);

/**
 * @route GET /api/payments/history
 * @desc Obtiene historial de pagos (para administración)
 * @access Public
 * @param {number} [page] - Página (query param, default: 1)
 * @param {number} [limit] - Límite por página (query param, default: 10)
 * @param {string} [status] - Filtrar por estado (query param)
 * @example
 * GET /api/payments/history?page=1&limit=20&status=completed
 */
router.get('/history', 
    rateLimiter,
    PaymentController.getPaymentHistory
);

/**
 * @route GET /api/payments/stats
 * @desc Obtiene estadísticas de pagos
 * @access Public
 * @example
 * GET /api/payments/stats
 */
router.get('/stats', 
    rateLimiter,
    async (req, res) => {
        try {
            const PaymentModel = require('../models/Payment');
            const stats = PaymentModel.getPaymentStats();
            
            res.status(200).json({
                success: true,
                message: 'Estadísticas de pagos obtenidas correctamente',
                data: stats,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas de pagos',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }
);

/**
 * @route GET /api/payments/search/email
 * @desc Busca pagos por email del pasajero
 * @access Public
 * @param {string} email - Email a buscar (query param)
 * @example
 * GET /api/payments/search/email?email=juan@email.com
 */
router.get('/search/email', 
    rateLimiter,
    async (req, res) => {
        try {
            const { email } = req.query;
            
            if (!email || !email.includes('@')) {
                return res.status(400).json({
                    success: false,
                    message: 'Email válido requerido'
                });
            }

            const PaymentModel = require('../models/Payment');
            const payments = PaymentModel.searchByEmail(email);
            
            res.status(200).json({
                success: true,
                message: 'Búsqueda completada',
                data: payments.map(payment => ({
                    id: payment.id,
                    sessionId: payment.sessionId,
                    amount: payment.amount,
                    currency: payment.currency,
                    status: payment.status,
                    method: payment.method,
                    createdAt: payment.createdAt,
                    // Incluir solo datos básicos del pasajero
                    passengerData: {
                        nombre: payment.passengerData?.nombre,
                        origen: payment.passengerData?.origen,
                        destino: payment.passengerData?.destino,
                        fecha: payment.passengerData?.fecha
                    }
                })),
                count: payments.length,
                searchEmail: email,
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
 * @route GET /api/payments/failed/recent
 * @desc Obtiene pagos fallidos recientes para análisis
 * @access Public
 * @param {number} [hours] - Horas hacia atrás (query param, default: 24)
 * @example
 * GET /api/payments/failed/recent?hours=12
 */
router.get('/failed/recent', 
    rateLimiter,
    async (req, res) => {
        try {
            const hours = parseInt(req.query.hours) || 24;
            
            if (hours < 1 || hours > 168) {
                return res.status(400).json({
                    success: false,
                    message: 'Las horas deben estar entre 1 y 168'
                });
            }

            const PaymentModel = require('../models/Payment');
            const failedPayments = PaymentModel.getRecentFailedPayments(hours);
            
            res.status(200).json({
                success: true,
                message: 'Pagos fallidos obtenidos correctamente',
                data: failedPayments.map(payment => ({
                    id: payment.id,
                    sessionId: payment.sessionId,
                    amount: payment.amount,
                    status: payment.status,
                    lastError: payment.lastError,
                    attempts: payment.attempts,
                    failedAt: payment.failedAt,
                    passengerInfo: {
                        origen: payment.passengerData?.origen,
                        destino: payment.passengerData?.destino
                    }
                })),
                count: failedPayments.length,
                hoursBack: hours,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener pagos fallidos',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }
);

/**
 * @route GET /api/payments/pending/expired
 * @desc Obtiene pagos pendientes que han expirado
 * @access Public
 * @param {number} [minutes] - Minutos de timeout (query param, default: 30)
 * @example
 * GET /api/payments/pending/expired?minutes=45
 */
router.get('/pending/expired', 
    rateLimiter,
    async (req, res) => {
        try {
            const minutes = parseInt(req.query.minutes) || 30;
            
            if (minutes < 5 || minutes > 1440) { // Entre 5 minutos y 24 horas
                return res.status(400).json({
                    success: false,
                    message: 'Los minutos deben estar entre 5 y 1440'
                });
            }

            const PaymentModel = require('../models/Payment');
            const expiredPayments = PaymentModel.getExpiredPendingPayments(minutes);
            
            res.status(200).json({
                success: true,
                message: 'Pagos pendientes expirados obtenidos correctamente',
                data: expiredPayments.map(payment => ({
                    id: payment.id,
                    sessionId: payment.sessionId,
                    amount: payment.amount,
                    createdAt: payment.createdAt,
                    minutesExpired: Math.round(
                        (new Date() - new Date(payment.createdAt)) / (1000 * 60)
                    ),
                    passengerInfo: {
                        origen: payment.passengerData?.origen,
                        destino: payment.passengerData?.destino
                    }
                })),
                count: expiredPayments.length,
                timeoutMinutes: minutes,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener pagos expirados',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }
);

/**
 * @route POST /api/payments/:sessionId/refund
 * @desc Procesa un reembolso para un pago
 * @access Public
 * @param {string} sessionId - ID de sesión del pago
 * @body {Object} refundData - Datos del reembolso
 * @example
 * POST /api/payments/cs_123456789/refund
 * Body: {
 *   "amount": 30.00,
 *   "reason": "Cancelación por el cliente"
 * }
 */
router.post('/:sessionId/refund', 
    strictRateLimiter,
    async (req, res) => {
        try {
            const { sessionId } = req.params;
            const { amount, reason } = req.body;
            
            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de sesión requerido'
                });
            }

            const PaymentModel = require('../models/Payment');
            const refundedPayment = PaymentModel.processRefund(sessionId, amount, reason);
            
            if (!refundedPayment) {
                return res.status(404).json({
                    success: false,
                    message: 'Pago no encontrado'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Reembolso procesado correctamente',
                data: {
                    sessionId,
                    originalAmount: refundedPayment.amount,
                    refundAmount: refundedPayment.refundAmount,
                    refundReason: refundedPayment.refundReason,
                    refundProcessedAt: refundedPayment.refundProcessedAt
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'Error al procesar reembolso',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }
);

/**
 * @route GET /api/payments/:sessionId
 * @desc Obtiene información de un pago específico
 * @access Public
 * @param {string} sessionId - ID de sesión del pago
 * @example
 * GET /api/payments/cs_123456789
 */
router.get('/:sessionId', 
    rateLimiter,
    async (req, res) => {
        try {
            const { sessionId } = req.params;
            const PaymentModel = require('../models/Payment');
            
            const payment = PaymentModel.getPaymentBySessionId(sessionId);
            
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: 'Pago no encontrado'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Pago encontrado',
                data: {
                    id: payment.id,
                    sessionId: payment.sessionId,
                    amount: payment.amount,
                    currency: payment.currency,
                    status: payment.status,
                    method: payment.method,
                    createdAt: payment.createdAt,
                    updatedAt: payment.updatedAt,
                    // Solo información básica del pasajero
                    passengerData: {
                        nombre: payment.passengerData?.nombre,
                        origen: payment.passengerData?.origen,
                        destino: payment.passengerData?.destino,
                        fecha: payment.passengerData?.fecha,
                        horario: payment.passengerData?.horario,
                        asiento: payment.passengerData?.asiento
                    }
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener información del pago',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }
);

module.exports = router;