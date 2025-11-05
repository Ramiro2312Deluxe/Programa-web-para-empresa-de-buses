/**
 * @fileoverview Controlador para el manejo de pagos con Stripe
 * @author TransBus Team
 * @version 1.0.0
 */

const stripe = require('../config/stripe');
const BookingModel = require('../models/Booking');
const PaymentModel = require('../models/Payment');
const { validatePaymentData } = require('../utils/validation');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const logger = require('../utils/logger');

/**
 * Controlador para operaciones relacionadas con pagos
 * @class PaymentController
 */
class PaymentController {
    /**
     * Crea una sesión de checkout de Stripe
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Promise<Object>} URL de checkout de Stripe
     */
    static async createCheckoutSession(req, res) {
        try {
            const paymentData = req.body;
            
            logger.info('Creando sesión de checkout:', { 
                nombre: paymentData.nombre, 
                precio: paymentData.precio 
            });

            // Validar datos de pago
            const validation = validatePaymentData(paymentData);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos de pago inválidos',
                    errors: validation.errors
                });
            }

            // Convertir precio a centavos para Stripe
            const amountInCents = Math.round(paymentData.precio * 100);

            // Crear sesión de Stripe Checkout
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: `TransBus - ${paymentData.origen} → ${paymentData.destino}`,
                                description: `Asiento ${paymentData.asiento} - ${paymentData.horario} - ${paymentData.fecha}`,
                                images: ['https://via.placeholder.com/400x200/3B82F6/FFFFFF?text=TransBus']
                            },
                            unit_amount: amountInCents,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?success=true&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?canceled=true`,
                customer_email: paymentData.email,
                metadata: {
                    passenger_name: paymentData.nombre,
                    origin: paymentData.origen,
                    destination: paymentData.destino,
                    seat: paymentData.asiento.toString(),
                    schedule: paymentData.horario,
                    travel_date: paymentData.fecha,
                    booking_type: 'bus_ticket'
                }
            });

            // Guardar información del pago pendiente
            const paymentRecord = {
                sessionId: session.id,
                amount: paymentData.precio,
                currency: 'USD',
                status: 'pending',
                passengerData: {
                    nombre: paymentData.nombre,
                    email: paymentData.email,
                    origen: paymentData.origen,
                    destino: paymentData.destino,
                    asiento: paymentData.asiento,
                    horario: paymentData.horario,
                    fecha: paymentData.fecha
                },
                createdAt: new Date().toISOString()
            };

            PaymentModel.createPayment(paymentRecord);

            logger.info(`Sesión de checkout creada: ${session.id}`);

            res.status(200).json({
                success: true,
                message: 'Sesión de pago creada correctamente',
                url: session.url,
                sessionId: session.id,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error al crear sesión de checkout:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear sesión de pago',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }

    /**
     * Verifica el estado de una sesión de pago
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Promise<Object>} Estado de la sesión y datos del boleto
     */
    static async verifyPaymentSession(req, res) {
        try {
            const { session_id } = req.query;
            
            logger.info(`Verificando sesión de pago: ${session_id}`);

            if (!session_id) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de sesión requerido'
                });
            }

            // Obtener sesión de Stripe
            const session = await stripe.checkout.sessions.retrieve(session_id);
            
            if (!session) {
                return res.status(404).json({
                    success: false,
                    message: 'Sesión de pago no encontrada'
                });
            }

            // Obtener registro de pago local
            const paymentRecord = PaymentModel.getPaymentBySessionId(session_id);
            
            if (!paymentRecord) {
                return res.status(404).json({
                    success: false,
                    message: 'Registro de pago no encontrado'
                });
            }

            // Verificar si el pago fue exitoso
            if (session.payment_status === 'paid' && paymentRecord.status !== 'completed') {
                // Actualizar estado del pago
                PaymentModel.updatePaymentStatus(session_id, 'completed');
                
                // Crear reserva confirmada
                const bookingData = {
                    ...paymentRecord.passengerData,
                    paymentSessionId: session_id,
                    estado: 'confirmada',
                    totalPagado: session.amount_total / 100
                };

                const booking = BookingModel.createBooking(bookingData);
                
                logger.info(`Pago completado y reserva creada: ${booking.referencia}`);
            }

            const responseData = {
                sessionId: session_id,
                paymentStatus: session.payment_status,
                amountTotal: session.amount_total,
                boleto: {
                    nombre: session.metadata.passenger_name,
                    origen: session.metadata.origin,
                    destino: session.metadata.destination,
                    asiento: session.metadata.seat,
                    horario: session.metadata.schedule,
                    fecha: session.metadata.travel_date
                }
            };

            res.status(200).json({
                success: true,
                message: 'Sesión verificada correctamente',
                ...responseData,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error al verificar sesión de pago:', error);
            res.status(500).json({
                success: false,
                message: 'Error al verificar el pago',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }

    /**
     * Maneja webhooks de Stripe para eventos de pago
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Promise<Object>} Confirmación del procesamiento del webhook
     */
    static async handleStripeWebhook(req, res) {
        try {
            const sig = req.headers['stripe-signature'];
            const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

            let event;

            try {
                event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
            } catch (err) {
                logger.error('Error en verificación de webhook:', err.message);
                return res.status(400).send(`Webhook Error: ${err.message}`);
            }

            logger.info(`Webhook recibido: ${event.type}`);

            // Manejar diferentes tipos de eventos
            switch (event.type) {
                case 'checkout.session.completed':
                    await PaymentController.handleCheckoutCompleted(event.data.object);
                    break;
                
                case 'payment_intent.succeeded':
                    await PaymentController.handlePaymentSucceeded(event.data.object);
                    break;
                
                case 'payment_intent.payment_failed':
                    await PaymentController.handlePaymentFailed(event.data.object);
                    break;
                
                default:
                    logger.info(`Evento no manejado: ${event.type}`);
            }

            res.status(200).json({ received: true });

        } catch (error) {
            logger.error('Error en webhook de Stripe:', error);
            res.status(500).json({
                success: false,
                message: 'Error al procesar webhook'
            });
        }
    }

    /**
     * Maneja el evento de checkout completado
     * @param {Object} session - Objeto de sesión de Stripe
     * @private
     */
    static async handleCheckoutCompleted(session) {
        try {
            logger.info(`Checkout completado: ${session.id}`);
            
            // Actualizar estado del pago
            PaymentModel.updatePaymentStatus(session.id, 'completed');
            
            // Aquí se puede agregar lógica adicional como envío de emails
            
        } catch (error) {
            logger.error('Error al manejar checkout completado:', error);
        }
    }

    /**
     * Maneja el evento de pago exitoso
     * @param {Object} paymentIntent - Objeto de PaymentIntent de Stripe
     * @private
     */
    static async handlePaymentSucceeded(paymentIntent) {
        try {
            logger.info(`Pago exitoso: ${paymentIntent.id}`);
            
            // Lógica adicional para pagos exitosos
            
        } catch (error) {
            logger.error('Error al manejar pago exitoso:', error);
        }
    }

    /**
     * Maneja el evento de pago fallido
     * @param {Object} paymentIntent - Objeto de PaymentIntent de Stripe
     * @private
     */
    static async handlePaymentFailed(paymentIntent) {
        try {
            logger.info(`Pago fallido: ${paymentIntent.id}`);
            
            // Marcar pago como fallido
            const sessionId = paymentIntent.metadata?.session_id;
            if (sessionId) {
                PaymentModel.updatePaymentStatus(sessionId, 'failed');
            }
            
        } catch (error) {
            logger.error('Error al manejar pago fallido:', error);
        }
    }

    /**
     * Obtiene el historial de pagos (para uso administrativo)
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Promise<Object>} Lista de pagos
     */
    static async getPaymentHistory(req, res) {
        try {
            const { page = 1, limit = 10, status } = req.query;
            
            logger.info(`Obteniendo historial de pagos - Página: ${page}, Límite: ${limit}`);
            
            const payments = PaymentModel.getPayments({
                page: parseInt(page),
                limit: parseInt(limit),
                status
            });

            res.status(200).json({
                success: true,
                message: 'Historial de pagos obtenido correctamente',
                data: payments.data,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: payments.total,
                    totalPages: Math.ceil(payments.total / parseInt(limit))
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error al obtener historial de pagos:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener historial de pagos',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            });
        }
    }
}

module.exports = PaymentController;