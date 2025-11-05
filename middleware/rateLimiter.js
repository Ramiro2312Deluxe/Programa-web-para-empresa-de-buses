/**
 * @fileoverview Middleware de rate limiting para proteger contra abuso
 * @author TransBus Team
 * @version 1.0.0
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter general para la mayoría de endpoints
 */
const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requests por IP por ventana
    message: {
        success: false,
        message: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true, // Incluir headers de rate limit
    legacyHeaders: false,
    // Personalizar el mensaje basado en el endpoint
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Límite de solicitudes excedido',
            details: 'Has excedido el límite de 100 solicitudes por 15 minutos',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000),
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Rate limiter estricto para endpoints críticos como pagos
 */
const strictRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Solo 10 requests por IP por ventana
    message: {
        success: false,
        message: 'Demasiadas solicitudes de pago. Intenta de nuevo en 15 minutos.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Límite de solicitudes de pago excedido',
            details: 'Has excedido el límite de 10 solicitudes de pago por 15 minutos',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000),
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Rate limiter muy estricto para creación de cuentas o acciones sensibles
 */
const ultraStrictRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // Solo 3 requests por IP por hora
    message: {
        success: false,
        message: 'Demasiadas solicitudes. Intenta de nuevo en 1 hora.',
        retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Límite de solicitudes críticas excedido',
            details: 'Has excedido el límite de 3 solicitudes críticas por hora',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000),
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Rate limiter para búsquedas (más permisivo)
 */
const searchRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30, // 30 búsquedas por minuto
    message: {
        success: false,
        message: 'Demasiadas búsquedas. Intenta de nuevo en 1 minuto.',
        retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Límite de búsquedas excedido',
            details: 'Has excedido el límite de 30 búsquedas por minuto',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000),
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Rate limiter para webhooks (muy permisivo)
 */
const webhookRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 1000, // 1000 webhooks por minuto (para Stripe)
    message: {
        success: false,
        message: 'Webhook rate limit exceeded',
        retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Identificar por IP específicamente para webhooks
    keyGenerator: (req) => {
        return req.ip;
    }
});

/**
 * Rate limiter personalizado basado en el usuario/sesión
 * @param {Object} options - Opciones de configuración
 * @param {number} options.windowMs - Ventana de tiempo en ms
 * @param {number} options.max - Máximo número de requests
 * @param {string} options.message - Mensaje personalizado
 * @returns {Function} Middleware de rate limiting
 */
const createCustomRateLimiter = (options) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000,
        max: options.max || 100,
        message: {
            success: false,
            message: options.message || 'Rate limit exceeded',
            retryAfter: Math.round(options.windowMs / 1000 / 60) + ' minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                message: options.message || 'Límite de solicitudes excedido',
                retryAfter: Math.round(req.rateLimit.resetTime / 1000),
                timestamp: new Date().toISOString()
            });
        }
    });
};

/**
 * Rate limiter dinámico que ajusta límites basado en la carga del servidor
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const dynamicRateLimiter = (req, res, next) => {
    // Obtener métricas del servidor
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    // Ajustar límites basado en el uso de memoria
    let maxRequests;
    let windowMs;
    
    if (heapUsedPercent > 90) {
        // Sistema sobrecargado - límites muy estrictos
        maxRequests = 10;
        windowMs = 30 * 60 * 1000; // 30 minutos
    } else if (heapUsedPercent > 70) {
        // Sistema con carga alta - límites estrictos
        maxRequests = 25;
        windowMs = 15 * 60 * 1000; // 15 minutos
    } else if (heapUsedPercent > 50) {
        // Sistema con carga media - límites normales
        maxRequests = 50;
        windowMs = 10 * 60 * 1000; // 10 minutos
    } else {
        // Sistema con baja carga - límites permisivos
        maxRequests = 100;
        windowMs = 5 * 60 * 1000; // 5 minutos
    }
    
    const dynamicLimiter = rateLimit({
        windowMs,
        max: maxRequests,
        message: {
            success: false,
            message: `Sistema con alta carga. Límite temporal: ${maxRequests} requests por ${Math.round(windowMs / 60000)} minutos`,
            serverLoad: Math.round(heapUsedPercent)
        },
        standardHeaders: true,
        legacyHeaders: false
    });
    
    dynamicLimiter(req, res, next);
};

/**
 * Middleware para whitelist de IPs (bypass rate limiting)
 * @param {Array} whitelist - Lista de IPs permitidas
 * @returns {Function} Middleware function
 */
const createIPWhitelist = (whitelist = []) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress;
        
        // IPs locales siempre permitidas en desarrollo
        const localIPs = ['127.0.0.1', '::1', 'localhost'];
        
        if (process.env.NODE_ENV === 'development' && localIPs.includes(clientIP)) {
            return next();
        }
        
        if (whitelist.includes(clientIP)) {
            return next();
        }
        
        // Aplicar rate limiting normal
        rateLimiter(req, res, next);
    };
};

/**
 * Rate limiter que incrementa el límite basado en el comportamiento del usuario
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const adaptiveRateLimiter = (req, res, next) => {
    // En una implementación real, esto consultaría una base de datos
    // para obtener el historial del usuario
    const userBehaviorScore = calculateUserBehaviorScore(req);
    
    let maxRequests;
    if (userBehaviorScore > 80) {
        maxRequests = 200; // Usuario confiable
    } else if (userBehaviorScore > 60) {
        maxRequests = 150; // Usuario regular
    } else if (userBehaviorScore > 40) {
        maxRequests = 100; // Usuario nuevo
    } else {
        maxRequests = 50; // Usuario sospechoso
    }
    
    const adaptiveLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: maxRequests,
        message: {
            success: false,
            message: `Límite personalizado excedido: ${maxRequests} requests por 15 minutos`,
            userScore: userBehaviorScore
        },
        standardHeaders: true,
        legacyHeaders: false
    });
    
    adaptiveLimiter(req, res, next);
};

/**
 * Calcula un score de comportamiento del usuario
 * @param {Object} req - Request object
 * @returns {number} Score entre 0-100
 * @private
 */
function calculateUserBehaviorScore(req) {
    // Implementación simplificada
    // En una app real, esto consideraría:
    // - Historial de requests
    // - Patrones de uso
    // - Reportes de abuso
    // - Verificación de email/teléfono
    
    let score = 50; // Score base
    
    // Incrementar score por headers válidos
    if (req.headers['user-agent'] && !req.headers['user-agent'].includes('bot')) {
        score += 10;
    }
    
    if (req.headers['accept-language']) {
        score += 5;
    }
    
    if (req.headers['referer']) {
        score += 5;
    }
    
    return Math.min(100, Math.max(0, score));
}

module.exports = {
    rateLimiter,
    strictRateLimiter,
    ultraStrictRateLimiter,
    searchRateLimiter,
    webhookRateLimiter,
    createCustomRateLimiter,
    dynamicRateLimiter,
    createIPWhitelist,
    adaptiveRateLimiter
};