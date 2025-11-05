/**
 * @fileoverview Configuración de variables de entorno
 * @author TransBus Team
 * @version 1.0.0
 */

const path = require('path');
const fs = require('fs');

/**
 * Cargar variables de entorno desde archivos .env
 */
const loadEnvironmentFiles = () => {
    const envFiles = [
        '.env',
        `.env.${process.env.NODE_ENV}`,
        '.env.local'
    ];
    
    envFiles.forEach(file => {
        const envPath = path.join(process.cwd(), file);
        if (fs.existsSync(envPath)) {
            require('dotenv').config({ path: envPath });
            console.log(`📄 Cargado archivo de entorno: ${file}`);
        }
    });
};

// Cargar archivos de entorno al inicio
loadEnvironmentFiles();

/**
 * Configuración de entorno
 */
const environmentConfig = {
    // Información básica de la aplicación
    app: {
        name: process.env.APP_NAME || 'TransBus API',
        version: process.env.APP_VERSION || '1.0.0',
        description: process.env.APP_DESCRIPTION || 'API para sistema de reserva de boletos de transporte',
        environment: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || 'localhost',
        timezone: process.env.TZ || 'America/Mexico_City'
    },
    
    // Configuración del servidor
    server: {
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || '0.0.0.0',
        cors: {
            enabled: process.env.CORS_ENABLED === 'true' || true,
            origin: process.env.CORS_ORIGIN ? 
                process.env.CORS_ORIGIN.split(',') : 
                ['http://localhost:3000', 'http://127.0.0.1:3000'],
            credentials: process.env.CORS_CREDENTIALS === 'true' || true,
            methods: process.env.CORS_METHODS ? 
                process.env.CORS_METHODS.split(',') : 
                ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: process.env.CORS_HEADERS ?
                process.env.CORS_HEADERS.split(',') :
                ['Content-Type', 'Authorization', 'X-API-Key']
        },
        bodyParser: {
            jsonLimit: process.env.JSON_LIMIT || '10mb',
            urlencodedLimit: process.env.URLENCODED_LIMIT || '10mb',
            extended: process.env.URLENCODED_EXTENDED === 'true' || true
        },
        compression: {
            enabled: process.env.COMPRESSION_ENABLED === 'true' || true,
            level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
            threshold: parseInt(process.env.COMPRESSION_THRESHOLD) || 1024
        }
    },
    
    // Configuración de seguridad
    security: {
        jwt: {
            secret: process.env.JWT_SECRET || 'default_jwt_secret_change_in_production',
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            issuer: process.env.JWT_ISSUER || 'transbus-api',
            audience: process.env.JWT_AUDIENCE || 'transbus-users'
        },
        bcrypt: {
            saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
        },
        session: {
            secret: process.env.SESSION_SECRET || 'default_session_secret_change_in_production',
            name: process.env.SESSION_NAME || 'transbus_session',
            maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 horas
            secure: process.env.SESSION_SECURE === 'true' || false,
            httpOnly: process.env.SESSION_HTTP_ONLY === 'true' || true,
            sameSite: process.env.SESSION_SAME_SITE || 'lax'
        },
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
            max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
            message: process.env.RATE_LIMIT_MESSAGE || 'Demasiadas solicitudes'
        },
        helmet: {
            enabled: process.env.HELMET_ENABLED === 'true' || true,
            contentSecurityPolicy: process.env.HELMET_CSP === 'true' || false,
            hsts: process.env.HELMET_HSTS === 'true' || true
        }
    },
    
    // Configuración de base de datos
    database: {
        type: process.env.DB_TYPE || 'memory', // memory, mongodb, mysql, postgresql
        mongodb: {
            uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/transbus',
            options: {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
                serverSelectionTimeoutMS: parseInt(process.env.MONGODB_TIMEOUT) || 5000
            }
        },
        mysql: {
            host: process.env.MYSQL_HOST || 'localhost',
            port: parseInt(process.env.MYSQL_PORT) || 3306,
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DATABASE || 'transbus',
            connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT) || 10
        },
        postgresql: {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT) || 5432,
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || '',
            database: process.env.POSTGRES_DATABASE || 'transbus',
            ssl: process.env.POSTGRES_SSL === 'true' || false
        }
    },
    
    // Configuración de Stripe
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publicKey: process.env.STRIPE_PUBLIC_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        successUrl: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/success',
        cancelUrl: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/cancel'
    },
    
    // Configuración de email
    email: {
        service: process.env.EMAIL_SERVICE || 'gmail',
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true' || false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        from: {
            name: process.env.EMAIL_FROM_NAME || 'TransBus',
            address: process.env.EMAIL_FROM_ADDRESS || 'noreply@transbus.com'
        }
    },
    
    // Configuración de logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined',
        file: {
            enabled: process.env.LOG_FILE_ENABLED === 'true' || true,
            filename: process.env.LOG_FILENAME || 'app.log',
            maxSize: process.env.LOG_MAX_SIZE || '10m',
            maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5
        },
        console: {
            enabled: process.env.LOG_CONSOLE_ENABLED === 'true' || true,
            colorize: process.env.LOG_COLORIZE === 'true' || true
        }
    },
    
    // Configuración de caché
    cache: {
        type: process.env.CACHE_TYPE || 'memory', // memory, redis
        ttl: parseInt(process.env.CACHE_TTL) || 300, // 5 minutos
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB) || 0
        }
    },
    
    // Configuración de archivos estáticos
    static: {
        enabled: process.env.STATIC_ENABLED === 'true' || true,
        path: process.env.STATIC_PATH || 'public',
        maxAge: parseInt(process.env.STATIC_MAX_AGE) || 86400000 // 1 día
    },
    
    // Configuración de monitoreo
    monitoring: {
        enabled: process.env.MONITORING_ENABLED === 'true' || false,
        endpoint: process.env.MONITORING_ENDPOINT,
        apiKey: process.env.MONITORING_API_KEY,
        interval: parseInt(process.env.MONITORING_INTERVAL) || 60000 // 1 minuto
    },
    
    // Configuración de terceros
    thirdParty: {
        googleMaps: {
            apiKey: process.env.GOOGLE_MAPS_API_KEY
        },
        sms: {
            service: process.env.SMS_SERVICE || 'twilio',
            accountSid: process.env.TWILIO_ACCOUNT_SID,
            authToken: process.env.TWILIO_AUTH_TOKEN,
            fromNumber: process.env.TWILIO_FROM_NUMBER
        }
    }
};

/**
 * Validar configuración requerida
 * @returns {Object} Resultado de la validación
 */
const validateConfig = () => {
    const errors = [];
    const warnings = [];
    
    // Validaciones críticas
    if (process.env.NODE_ENV === 'production') {
        if (environmentConfig.security.jwt.secret === 'default_jwt_secret_change_in_production') {
            errors.push('JWT_SECRET debe configurarse en producción');
        }
        
        if (environmentConfig.security.session.secret === 'default_session_secret_change_in_production') {
            errors.push('SESSION_SECRET debe configurarse en producción');
        }
        
        if (!environmentConfig.stripe.secretKey) {
            errors.push('STRIPE_SECRET_KEY es requerida en producción');
        }
    }
    
    // Validaciones de advertencia
    if (!environmentConfig.email.auth.user) {
        warnings.push('EMAIL_USER no configurado - funcionalidad de email deshabilitada');
    }
    
    if (!environmentConfig.thirdParty.googleMaps.apiKey) {
        warnings.push('GOOGLE_MAPS_API_KEY no configurada - funcionalidad de mapas limitada');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Obtener configuración específica del entorno
 * @param {string} environment - Entorno (development, production, test)
 * @returns {Object} Configuración del entorno
 */
const getEnvironmentSpecificConfig = (environment = process.env.NODE_ENV) => {
    const baseConfig = environmentConfig;
    
    switch (environment) {
        case 'development':
            return {
                ...baseConfig,
                logging: {
                    ...baseConfig.logging,
                    level: 'debug'
                },
                security: {
                    ...baseConfig.security,
                    helmet: {
                        ...baseConfig.security.helmet,
                        enabled: false
                    }
                }
            };
            
        case 'production':
            return {
                ...baseConfig,
                logging: {
                    ...baseConfig.logging,
                    level: 'warn',
                    console: {
                        ...baseConfig.logging.console,
                        enabled: false
                    }
                },
                server: {
                    ...baseConfig.server,
                    cors: {
                        ...baseConfig.server.cors,
                        origin: process.env.CORS_ORIGIN ? 
                            process.env.CORS_ORIGIN.split(',') : 
                            false
                    }
                }
            };
            
        case 'test':
            return {
                ...baseConfig,
                app: {
                    ...baseConfig.app,
                    port: 0 // Puerto aleatorio para tests
                },
                database: {
                    ...baseConfig.database,
                    type: 'memory'
                },
                logging: {
                    ...baseConfig.logging,
                    level: 'error',
                    console: {
                        ...baseConfig.logging.console,
                        enabled: false
                    }
                }
            };
            
        default:
            return baseConfig;
    }
};

/**
 * Imprimir resumen de configuración
 */
const printConfigSummary = () => {
    const config = getEnvironmentSpecificConfig();
    const validation = validateConfig();
    
    console.log('\n🔧 Configuración de la aplicación');
    console.log('================================');
    console.log(`📱 Aplicación: ${config.app.name} v${config.app.version}`);
    console.log(`🌍 Entorno: ${config.app.environment}`);
    console.log(`🚀 Servidor: ${config.server.host}:${config.server.port}`);
    console.log(`💾 Base de datos: ${config.database.type}`);
    console.log(`🔐 JWT Secret: ${config.security.jwt.secret.substring(0, 10)}...`);
    console.log(`💳 Stripe: ${config.stripe.secretKey ? '✅ Configurado' : '❌ No configurado'}`);
    
    if (validation.warnings.length > 0) {
        console.log('\n⚠️  Advertencias:');
        validation.warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    if (validation.errors.length > 0) {
        console.log('\n❌ Errores:');
        validation.errors.forEach(error => console.log(`   • ${error}`));
    }
    
    console.log('\n');
};

/**
 * Obtener configuración completa
 * @returns {Object} Configuración completa del entorno actual
 */
const getConfig = () => {
    return getEnvironmentSpecificConfig();
};

module.exports = {
    environmentConfig,
    validateConfig,
    getEnvironmentSpecificConfig,
    getConfig,
    printConfigSummary
};