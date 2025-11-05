/**
 * @fileoverview Configuración de Stripe para pagos
 * @author TransBus Team
 * @version 1.0.0
 */

const stripe = require('stripe');

/**
 * Configuración de Stripe
 */
const stripeConfig = {
    // Clave secreta de Stripe (nunca exponer en el frontend)
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_...',
    
    // Clave pública para el frontend
    publicKey: process.env.STRIPE_PUBLIC_KEY || 'pk_test_...',
    
    // Webhook secret para verificar eventos
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...',
    
    // URL de éxito después del pago
    successUrl: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/success',
    
    // URL de cancelación
    cancelUrl: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/cancel',
    
    // Configuración de la cuenta
    account: {
        currency: 'usd', // Moneda por defecto
        country: 'US',   // País por defecto
        locale: 'es'     // Idioma para la interfaz
    },
    
    // Configuración de checkout
    checkout: {
        mode: 'payment', // payment, subscription, setup
        allowPromotion: true,
        billingAddressCollection: 'auto',
        shippingAddressCollection: null,
        submitType: 'pay',
        customText: {
            submit: {
                message: 'Confirmar compra de boleto de transporte'
            }
        }
    },
    
    // Configuración de productos
    products: {
        busTicket: {
            name: 'Boleto de Transporte',
            description: 'Boleto para viaje en autobús',
            images: ['https://example.com/bus-ticket.jpg'],
            metadata: {
                type: 'transport_ticket',
                category: 'travel'
            }
        }
    },
    
    // Configuración de métodos de pago
    paymentMethods: {
        types: ['card'], // card, alipay, ideal, etc.
        cardOptions: {
            requestThreeDSecure: 'automatic'
        }
    },
    
    // Configuración de webhooks
    webhooks: {
        endpoints: [
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
            'checkout.session.completed',
            'checkout.session.expired',
            'invoice.payment_succeeded',
            'invoice.payment_failed'
        ],
        tolerance: 300 // Tolerancia de tiempo en segundos
    },
    
    // Configuración de fees y comisiones
    fees: {
        // Fee por transacción (en centavos)
        transactionFee: 30, // $0.30
        // Porcentaje de comisión
        percentageFee: 2.9, // 2.9%
        // Fee mínimo
        minimumFee: 50 // $0.50
    },
    
    // Configuración de reembolsos
    refunds: {
        // Días máximos para reembolso
        maxDays: 30,
        // Reembolso automático habilitado
        autoRefund: false,
        // Razones de reembolso
        reasons: [
            'duplicate',
            'fraudulent',
            'requested_by_customer'
        ]
    }
};

/**
 * Inicializar cliente de Stripe
 */
let stripeClient = null;

/**
 * Obtener instancia de cliente Stripe
 * @returns {Object} Cliente de Stripe configurado
 * @throws {Error} Si la clave secreta no está configurada
 */
const getStripeClient = () => {
    if (!stripeClient) {
        if (!stripeConfig.secretKey || stripeConfig.secretKey === 'sk_test_...') {
            throw new Error('STRIPE_SECRET_KEY no está configurada correctamente');
        }
        
        stripeClient = stripe(stripeConfig.secretKey, {
            apiVersion: '2023-10-16',
            typescript: false,
            telemetry: process.env.NODE_ENV === 'production'
        });
        
        console.log('✅ Cliente Stripe inicializado correctamente');
    }
    
    return stripeClient;
};

/**
 * Validar configuración de Stripe
 * @returns {Object} Resultado de la validación
 */
const validateStripeConfig = () => {
    const errors = [];
    const warnings = [];
    
    // Validar claves requeridas
    if (!stripeConfig.secretKey || stripeConfig.secretKey === 'sk_test_...') {
        errors.push('STRIPE_SECRET_KEY no está configurada');
    }
    
    if (!stripeConfig.publicKey || stripeConfig.publicKey === 'pk_test_...') {
        warnings.push('STRIPE_PUBLIC_KEY no está configurada');
    }
    
    if (!stripeConfig.webhookSecret || stripeConfig.webhookSecret === 'whsec_...') {
        warnings.push('STRIPE_WEBHOOK_SECRET no está configurada');
    }
    
    // Validar URLs
    try {
        new URL(stripeConfig.successUrl);
    } catch (e) {
        warnings.push('URL de éxito inválida');
    }
    
    try {
        new URL(stripeConfig.cancelUrl);
    } catch (e) {
        warnings.push('URL de cancelación inválida');
    }
    
    // Validar moneda
    const validCurrencies = ['usd', 'eur', 'mxn', 'cop', 'pen', 'clp'];
    if (!validCurrencies.includes(stripeConfig.account.currency)) {
        warnings.push(`Moneda ${stripeConfig.account.currency} puede no estar soportada`);
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        config: {
            hasSecretKey: !!stripeConfig.secretKey && stripeConfig.secretKey !== 'sk_test_...',
            hasPublicKey: !!stripeConfig.publicKey && stripeConfig.publicKey !== 'pk_test_...',
            hasWebhookSecret: !!stripeConfig.webhookSecret && stripeConfig.webhookSecret !== 'whsec_...',
            currency: stripeConfig.account.currency,
            environment: stripeConfig.secretKey?.startsWith('sk_live_') ? 'production' : 'test'
        }
    };
};

/**
 * Calcular total con fees de Stripe
 * @param {number} amount - Cantidad base en centavos
 * @returns {Object} Desglose de costos
 */
const calculateStripeTotal = (amount) => {
    const { transactionFee, percentageFee, minimumFee } = stripeConfig.fees;
    
    // Calcular fee por porcentaje
    const percentageCost = Math.round(amount * (percentageFee / 100));
    
    // Fee total es la suma de fee fijo + porcentaje
    const stripeFee = transactionFee + percentageCost;
    
    // Aplicar fee mínimo si es necesario
    const finalFee = Math.max(stripeFee, minimumFee);
    
    return {
        subtotal: amount,
        stripeFee: finalFee,
        total: amount + finalFee,
        breakdown: {
            transactionFee,
            percentageFee: percentageCost,
            minimumFee: minimumFee,
            applied: finalFee
        }
    };
};

/**
 * Crear configuración de producto para Stripe
 * @param {Object} ticketData - Datos del boleto
 * @returns {Object} Configuración de producto
 */
const createProductConfig = (ticketData) => {
    const baseConfig = stripeConfig.products.busTicket;
    
    return {
        name: `${baseConfig.name} - ${ticketData.origin} a ${ticketData.destination}`,
        description: `${baseConfig.description} | Fecha: ${ticketData.date} | Hora: ${ticketData.time}`,
        images: baseConfig.images,
        metadata: {
            ...baseConfig.metadata,
            origin: ticketData.origin,
            destination: ticketData.destination,
            date: ticketData.date,
            time: ticketData.time,
            busNumber: ticketData.busNumber || '',
            seatNumber: ticketData.seatNumber || ''
        }
    };
};

/**
 * Configuración de ambiente
 */
const environmentConfig = {
    development: {
        ...stripeConfig,
        webhooks: {
            ...stripeConfig.webhooks,
            tolerance: 600 // Más tolerante en desarrollo
        }
    },
    
    production: {
        ...stripeConfig,
        checkout: {
            ...stripeConfig.checkout,
            allowPromotion: false // Deshabilitar promociones en producción por defecto
        }
    },
    
    test: {
        ...stripeConfig,
        secretKey: 'sk_test_test_key',
        publicKey: 'pk_test_test_key',
        webhookSecret: 'whsec_test_secret'
    }
};

/**
 * Obtener configuración según el ambiente
 * @returns {Object} Configuración para el ambiente actual
 */
const getEnvironmentConfig = () => {
    const env = process.env.NODE_ENV || 'development';
    return environmentConfig[env] || environmentConfig.development;
};

module.exports = {
    stripeConfig,
    getStripeClient,
    validateStripeConfig,
    calculateStripeTotal,
    createProductConfig,
    getEnvironmentConfig
};