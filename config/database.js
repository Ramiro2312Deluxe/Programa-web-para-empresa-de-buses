/**
 * @fileoverview Configuración de base de datos
 * @author TransBus Team
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');

/**
 * Configuraciones de base de datos por tipo
 */
const databaseConfigs = {
    // Configuración para MongoDB
    mongodb: {
        connection: null,
        config: {
            uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/transbus',
            options: {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
                serverSelectionTimeoutMS: parseInt(process.env.MONGODB_TIMEOUT) || 5000,
                socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT) || 45000,
                bufferMaxEntries: 0,
                bufferCommands: false,
                maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME) || 30000
            }
        },
        
        /**
         * Conectar a MongoDB
         * @returns {Promise<Object>} Conexión establecida
         */
        async connect() {
            try {
                if (this.connection && this.connection.readyState === 1) {
                    return this.connection;
                }
                
                console.log('🔌 Conectando a MongoDB...');
                this.connection = await mongoose.connect(this.config.uri, this.config.options);
                
                // Event listeners
                mongoose.connection.on('connected', () => {
                    console.log('✅ MongoDB conectado exitosamente');
                });
                
                mongoose.connection.on('error', (err) => {
                    console.error('❌ Error en MongoDB:', err);
                });
                
                mongoose.connection.on('disconnected', () => {
                    console.log('⚠️ MongoDB desconectado');
                });
                
                return this.connection;
            } catch (error) {
                console.error('❌ Error conectando a MongoDB:', error);
                throw error;
            }
        },
        
        /**
         * Desconectar de MongoDB
         */
        async disconnect() {
            if (this.connection) {
                await mongoose.disconnect();
                this.connection = null;
                console.log('🔌 MongoDB desconectado');
            }
        },
        
        /**
         * Verificar estado de la conexión
         * @returns {boolean} Estado de la conexión
         */
        isConnected() {
            return mongoose.connection.readyState === 1;
        }
    },
    
    // Configuración para MySQL
    mysql: {
        pool: null,
        config: {
            host: process.env.MYSQL_HOST || 'localhost',
            port: parseInt(process.env.MYSQL_PORT) || 3306,
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DATABASE || 'transbus',
            connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT) || 10,
            acquireTimeout: parseInt(process.env.MYSQL_ACQUIRE_TIMEOUT) || 60000,
            timeout: parseInt(process.env.MYSQL_TIMEOUT) || 60000,
            reconnect: true,
            charset: 'utf8mb4'
        },
        
        /**
         * Conectar a MySQL
         * @returns {Promise<Object>} Pool de conexiones
         */
        async connect() {
            try {
                if (this.pool) {
                    return this.pool;
                }
                
                console.log('🔌 Conectando a MySQL...');
                this.pool = mysql.createPool(this.config);
                
                // Probar la conexión
                const connection = await this.pool.getConnection();
                await connection.ping();
                connection.release();
                
                console.log('✅ MySQL conectado exitosamente');
                return this.pool;
            } catch (error) {
                console.error('❌ Error conectando a MySQL:', error);
                throw error;
            }
        },
        
        /**
         * Desconectar de MySQL
         */
        async disconnect() {
            if (this.pool) {
                await this.pool.end();
                this.pool = null;
                console.log('🔌 MySQL desconectado');
            }
        },
        
        /**
         * Ejecutar query
         * @param {string} sql - Query SQL
         * @param {Array} params - Parámetros
         * @returns {Promise<Array>} Resultados
         */
        async query(sql, params = []) {
            try {
                const [rows] = await this.pool.execute(sql, params);
                return rows;
            } catch (error) {
                console.error('❌ Error ejecutando query MySQL:', error);
                throw error;
            }
        },
        
        /**
         * Verificar estado de la conexión
         * @returns {boolean} Estado de la conexión
         */
        isConnected() {
            return this.pool !== null;
        }
    },
    
    // Configuración para PostgreSQL
    postgresql: {
        pool: null,
        config: {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT) || 5432,
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || '',
            database: process.env.POSTGRES_DATABASE || 'transbus',
            max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS) || 10,
            idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT) || 30000,
            connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT) || 2000,
            ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
        },
        
        /**
         * Conectar a PostgreSQL
         * @returns {Promise<Object>} Pool de conexiones
         */
        async connect() {
            try {
                if (this.pool) {
                    return this.pool;
                }
                
                console.log('🔌 Conectando a PostgreSQL...');
                this.pool = new Pool(this.config);
                
                // Probar la conexión
                const client = await this.pool.connect();
                await client.query('SELECT NOW()');
                client.release();
                
                console.log('✅ PostgreSQL conectado exitosamente');
                return this.pool;
            } catch (error) {
                console.error('❌ Error conectando a PostgreSQL:', error);
                throw error;
            }
        },
        
        /**
         * Desconectar de PostgreSQL
         */
        async disconnect() {
            if (this.pool) {
                await this.pool.end();
                this.pool = null;
                console.log('🔌 PostgreSQL desconectado');
            }
        },
        
        /**
         * Ejecutar query
         * @param {string} sql - Query SQL
         * @param {Array} params - Parámetros
         * @returns {Promise<Object>} Resultado
         */
        async query(sql, params = []) {
            try {
                const result = await this.pool.query(sql, params);
                return result.rows;
            } catch (error) {
                console.error('❌ Error ejecutando query PostgreSQL:', error);
                throw error;
            }
        },
        
        /**
         * Verificar estado de la conexión
         * @returns {boolean} Estado de la conexión
         */
        isConnected() {
            return this.pool !== null;
        }
    },
    
    // Configuración para almacenamiento en memoria (desarrollo/testing)
    memory: {
        data: {
            routes: [],
            bookings: [],
            payments: [],
            users: []
        },
        
        /**
         * "Conectar" al almacenamiento en memoria
         * @returns {Promise<Object>} Datos en memoria
         */
        async connect() {
            console.log('✅ Almacenamiento en memoria inicializado');
            return this.data;
        },
        
        /**
         * "Desconectar" del almacenamiento en memoria
         */
        async disconnect() {
            this.data = {
                routes: [],
                bookings: [],
                payments: [],
                users: []
            };
            console.log('🔌 Almacenamiento en memoria limpiado');
        },
        
        /**
         * Verificar estado
         * @returns {boolean} Siempre true para memoria
         */
        isConnected() {
            return true;
        }
    }
};

/**
 * Gestor principal de base de datos
 */
class DatabaseManager {
    constructor() {
        this.currentType = process.env.DB_TYPE || 'memory';
        this.currentConnection = null;
    }
    
    /**
     * Conectar a la base de datos configurada
     * @param {string} type - Tipo de base de datos (opcional)
     * @returns {Promise<Object>} Conexión establecida
     */
    async connect(type = this.currentType) {
        try {
            if (!databaseConfigs[type]) {
                throw new Error(`Tipo de base de datos no soportado: ${type}`);
            }
            
            this.currentType = type;
            this.currentConnection = await databaseConfigs[type].connect();
            
            return this.currentConnection;
        } catch (error) {
            console.error(`❌ Error conectando a ${type}:`, error);
            throw error;
        }
    }
    
    /**
     * Desconectar de la base de datos actual
     */
    async disconnect() {
        if (this.currentType && databaseConfigs[this.currentType]) {
            await databaseConfigs[this.currentType].disconnect();
            this.currentConnection = null;
        }
    }
    
    /**
     * Obtener la conexión actual
     * @returns {Object} Conexión actual
     */
    getConnection() {
        return this.currentConnection;
    }
    
    /**
     * Verificar estado de la conexión
     * @returns {boolean} Estado de la conexión
     */
    isConnected() {
        if (!this.currentType || !databaseConfigs[this.currentType]) {
            return false;
        }
        
        return databaseConfigs[this.currentType].isConnected();
    }
    
    /**
     * Ejecutar query (para SQL databases)
     * @param {string} sql - Query SQL
     * @param {Array} params - Parámetros
     * @returns {Promise<*>} Resultado
     */
    async query(sql, params = []) {
        if (!this.isConnected()) {
            throw new Error('Base de datos no conectada');
        }
        
        const db = databaseConfigs[this.currentType];
        if (typeof db.query === 'function') {
            return await db.query(sql, params);
        } else {
            throw new Error(`Query no soportada para ${this.currentType}`);
        }
    }
    
    /**
     * Obtener estadísticas de la conexión
     * @returns {Object} Estadísticas
     */
    getStats() {
        return {
            type: this.currentType,
            connected: this.isConnected(),
            connectionTime: new Date().toISOString(),
            config: this.currentType !== 'memory' ? 
                databaseConfigs[this.currentType].config : 
                { type: 'memory' }
        };
    }
}

/**
 * Esquemas para migración automática (MongoDB)
 */
const mongoSchemas = {
    Route: new mongoose.Schema({
        origin: { type: String, required: true },
        destination: { type: String, required: true },
        departure: { type: Date, required: true },
        arrival: { type: Date, required: true },
        price: { type: Number, required: true },
        busNumber: { type: String, required: true },
        availableSeats: { type: Number, required: true },
        totalSeats: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }),
    
    Booking: new mongoose.Schema({
        reference: { type: String, required: true, unique: true },
        routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
        passengerName: { type: String, required: true },
        passengerEmail: { type: String, required: true },
        passengerPhone: { type: String, required: true },
        seatNumber: { type: Number, required: true },
        status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
        paymentId: { type: String },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }),
    
    Payment: new mongoose.Schema({
        bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
        stripeSessionId: { type: String, required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'usd' },
        status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
        metadata: { type: mongoose.Schema.Types.Mixed },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    })
};

/**
 * Crear instancia singleton del gestor de base de datos
 */
const databaseManager = new DatabaseManager();

/**
 * Inicializar base de datos con datos de prueba (desarrollo)
 * @param {DatabaseManager} db - Instancia del gestor de DB
 */
const initializeTestData = async (db) => {
    if (process.env.NODE_ENV === 'development' && db.currentType === 'memory') {
        const testRoutes = [
            {
                id: '1',
                origin: 'Ciudad de México',
                destination: 'Guadalajara',
                departure: '2024-01-15T08:00:00Z',
                arrival: '2024-01-15T14:00:00Z',
                price: 450,
                busNumber: 'BUS001',
                availableSeats: 35,
                totalSeats: 40
            },
            {
                id: '2',
                origin: 'Guadalajara',
                destination: 'Monterrey',
                departure: '2024-01-15T10:00:00Z',
                arrival: '2024-01-15T16:00:00Z',
                price: 380,
                busNumber: 'BUS002',
                availableSeats: 28,
                totalSeats: 40
            }
        ];
        
        databaseConfigs.memory.data.routes = testRoutes;
        console.log('📊 Datos de prueba cargados en memoria');
    }
};

module.exports = {
    databaseConfigs,
    DatabaseManager,
    databaseManager,
    mongoSchemas,
    initializeTestData
};