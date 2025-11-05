/**
 * @fileoverview Middleware de autenticación y autorización
 * @author TransBus Team
 * @version 1.0.0
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Middleware de autenticación JWT
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de acceso requerido',
            code: 'NO_TOKEN'
        });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expirado',
                    code: 'TOKEN_EXPIRED'
                });
            }
            
            if (err.name === 'JsonWebTokenError') {
                return res.status(403).json({
                    success: false,
                    message: 'Token inválido',
                    code: 'INVALID_TOKEN'
                });
            }
            
            return res.status(403).json({
                success: false,
                message: 'Error de autenticación',
                code: 'AUTH_ERROR'
            });
        }
        
        req.user = user;
        next();
    });
};

/**
 * Middleware de autenticación opcional (no falla si no hay token)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        req.user = null;
        return next();
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) {
            req.user = null;
        } else {
            req.user = user;
        }
        next();
    });
};

/**
 * Middleware de autorización por roles
 * @param {Array|string} allowedRoles - Roles permitidos
 * @returns {Function} Middleware function
 */
const authorizeRoles = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Autenticación requerida',
                code: 'AUTH_REQUIRED'
            });
        }
        
        const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
        const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        
        const hasPermission = userRoles.some(role => allowed.includes(role));
        
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Permisos insuficientes',
                code: 'INSUFFICIENT_PERMISSIONS',
                requiredRoles: allowed,
                userRoles: userRoles
            });
        }
        
        next();
    };
};

/**
 * Middleware para verificar propiedad de recursos
 * @param {string} resourceIdParam - Nombre del parámetro que contiene el ID del recurso
 * @param {Function} getResourceOwner - Función que retorna el propietario del recurso
 * @returns {Function} Middleware function
 */
const checkResourceOwnership = (resourceIdParam, getResourceOwner) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Autenticación requerida',
                code: 'AUTH_REQUIRED'
            });
        }
        
        try {
            const resourceId = req.params[resourceIdParam];
            const ownerId = await getResourceOwner(resourceId);
            
            if (!ownerId) {
                return res.status(404).json({
                    success: false,
                    message: 'Recurso no encontrado',
                    code: 'RESOURCE_NOT_FOUND'
                });
            }
            
            // Admins pueden acceder a cualquier recurso
            if (req.user.role === 'admin') {
                return next();
            }
            
            if (ownerId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para acceder a este recurso',
                    code: 'RESOURCE_ACCESS_DENIED'
                });
            }
            
            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error verificando permisos del recurso',
                code: 'OWNERSHIP_CHECK_ERROR'
            });
        }
    };
};

/**
 * Middleware para generar tokens de sesión temporales
 * @param {number} expirationMinutes - Minutos hasta expiración
 * @returns {Function} Middleware function
 */
const generateTemporaryToken = (expirationMinutes = 30) => {
    return (req, res, next) => {
        const sessionData = {
            id: crypto.randomUUID(),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString()
        };
        
        const token = jwt.sign(
            sessionData,
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: `${expirationMinutes}m` }
        );
        
        req.temporaryToken = token;
        req.sessionData = sessionData;
        next();
    };
};

/**
 * Middleware para verificar tokens temporales
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const verifyTemporaryToken = (req, res, next) => {
    const token = req.headers['x-session-token'] || req.body.sessionToken || req.query.sessionToken;
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de sesión requerido',
            code: 'NO_SESSION_TOKEN'
        });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, sessionData) => {
        if (err) {
            return res.status(401).json({
                success: false,
                message: 'Token de sesión inválido o expirado',
                code: 'INVALID_SESSION_TOKEN'
            });
        }
        
        // Verificar que el token corresponda a la misma IP (opcional)
        if (process.env.NODE_ENV === 'production' && sessionData.ip !== req.ip) {
            return res.status(401).json({
                success: false,
                message: 'Token de sesión inválido para esta ubicación',
                code: 'IP_MISMATCH'
            });
        }
        
        req.session = sessionData;
        next();
    });
};

/**
 * Middleware para limitar acceso por IP
 * @param {Array} allowedIPs - Lista de IPs permitidas
 * @returns {Function} Middleware function
 */
const restrictByIP = (allowedIPs = []) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress;
        
        // Permitir IPs locales en desarrollo
        const localIPs = ['127.0.0.1', '::1', 'localhost'];
        if (process.env.NODE_ENV === 'development' && localIPs.includes(clientIP)) {
            return next();
        }
        
        if (!allowedIPs.includes(clientIP)) {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado desde esta IP',
                code: 'IP_BLOCKED',
                ip: clientIP
            });
        }
        
        next();
    };
};

/**
 * Middleware para verificar permisos específicos
 * @param {Array} requiredPermissions - Lista de permisos requeridos
 * @returns {Function} Middleware function
 */
const checkPermissions = (requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Autenticación requerida',
                code: 'AUTH_REQUIRED'
            });
        }
        
        const userPermissions = req.user.permissions || [];
        const hasAllPermissions = requiredPermissions.every(permission => 
            userPermissions.includes(permission)
        );
        
        if (!hasAllPermissions) {
            return res.status(403).json({
                success: false,
                message: 'Permisos insuficientes',
                code: 'MISSING_PERMISSIONS',
                required: requiredPermissions,
                current: userPermissions
            });
        }
        
        next();
    };
};

/**
 * Middleware para logging de acceso
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const logAccess = (req, res, next) => {
    const accessLog = {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        userId: req.user ? req.user.id : null,
        sessionId: req.session ? req.session.id : null
    };
    
    // En una implementación real, esto se enviaría a un servicio de logging
    console.log('ACCESS_LOG:', JSON.stringify(accessLog));
    
    next();
};

/**
 * Middleware para validar API keys
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            message: 'API key requerida',
            code: 'NO_API_KEY'
        });
    }
    
    // En una implementación real, esto verificaría contra una base de datos
    const validApiKeys = process.env.VALID_API_KEYS ? 
        process.env.VALID_API_KEYS.split(',') : 
        ['default_api_key'];
    
    if (!validApiKeys.includes(apiKey)) {
        return res.status(401).json({
            success: false,
            message: 'API key inválida',
            code: 'INVALID_API_KEY'
        });
    }
    
    req.apiKey = apiKey;
    next();
};

/**
 * Middleware para autenticación de webhooks
 * @param {string} secretHeader - Nombre del header que contiene el secreto
 * @returns {Function} Middleware function
 */
const authenticateWebhook = (secretHeader = 'x-webhook-signature') => {
    return (req, res, next) => {
        const signature = req.headers[secretHeader];
        const webhookSecret = process.env.WEBHOOK_SECRET;
        
        if (!signature || !webhookSecret) {
            return res.status(401).json({
                success: false,
                message: 'Webhook no autorizado',
                code: 'WEBHOOK_AUTH_FAILED'
            });
        }
        
        // Verificar signature HMAC
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(req.body))
            .digest('hex');
        
        const providedSignature = signature.replace('sha256=', '');
        
        if (!crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(providedSignature, 'hex')
        )) {
            return res.status(401).json({
                success: false,
                message: 'Signature de webhook inválida',
                code: 'INVALID_WEBHOOK_SIGNATURE'
            });
        }
        
        next();
    };
};

module.exports = {
    authenticateToken,
    optionalAuth,
    authorizeRoles,
    checkResourceOwnership,
    generateTemporaryToken,
    verifyTemporaryToken,
    restrictByIP,
    checkPermissions,
    logAccess,
    validateApiKey,
    authenticateWebhook
};