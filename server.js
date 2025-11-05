// backend/server.js
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
	loadRoutes,
	saveRoutes,
	loadTickets,
	saveTickets,
	loadBookings,
	saveBookings,
	getUniqueCities
} from "./utils/dataStore.js";

dotenv.config();
const app = express();

// Allow requests from the frontend (same origin if served statically)
app.use(cors());
app.use(express.json());

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ========================================
// CARGAR DATOS DESDE ARCHIVOS (PERSISTENCIA)
// ========================================
let availableRoutes = loadRoutes();           // Cargar rutas desde archivo JSON
let bookedSeatsByRoute = loadBookings();      // Cargar reservas desde archivo JSON
let ticketDatabase = loadTickets();           // Cargar boletos desde archivo JSON

console.log(`✅ Sistema iniciado con ${Object.keys(availableRoutes).length} rutas disponibles`);
console.log(`✅ ${ticketDatabase.size} boletos en base de datos`);
console.log(`✅ ${bookedSeatsByRoute.size} rutas con reservas activas`);

// In-memory stores (replace with database in production)
// const bookedSeatsByRoute = new Map(); // key: `${origen}|${destino}|${fecha}|${horario}` -> Set of seat numbers
// const ticketDatabase = new Map(); // key: sessionId -> ticket data

function getRouteKey(origen, destino, fecha, horario) {
	return `${(origen || "").trim().toLowerCase()}|${(destino || "").trim().toLowerCase()}|${fecha}|${horario}`;
}

function isSeatBooked(origen, destino, fecha, horario, asiento) {
	const key = getRouteKey(origen, destino, fecha, horario);
	const set = bookedSeatsByRoute.get(key);
	return set ? set.has(String(asiento)) : false;
}

function bookSeat(origen, destino, fecha, horario, asiento) {
	const key = getRouteKey(origen, destino, fecha, horario);
	if (!bookedSeatsByRoute.has(key)) {
		bookedSeatsByRoute.set(key, new Set());
	}
	bookedSeatsByRoute.get(key).add(String(asiento));
	
	// Guardar cambios en disco
	saveBookings(bookedSeatsByRoute);
}

// ========================================
// ENDPOINTS DE API
// ========================================

// API: Obtener rutas disponibles
app.get("/api/routes", (req, res) => {
	res.json(availableRoutes);
});

// API: Obtener ciudades únicas (para los selectores dinámicos)
app.get("/api/cities", (req, res) => {
	const cities = getUniqueCities(availableRoutes);
	res.json({ cities });
});

// API: Obtener asientos ocupados para una ruta específica
app.get("/api/occupied-seats", (req, res) => {
	const { origen, destino, fecha, horario } = req.query;
	
	if (!origen || !destino || !fecha || !horario) {
		return res.status(400).json({ error: "Faltan parámetros requeridos" });
	}
	
	const key = getRouteKey(origen, destino, fecha, horario);
	const occupiedSeats = Array.from(bookedSeatsByRoute.get(key) || []);
	
	res.json({ occupiedSeats });
});

// API: Crear sesión de pago
app.post("/api/create-checkout-session", async (req, res) => {
	const { nombre, tipoDocumento, numeroDocumento, origen, destino, asiento, horario, fecha, precio, email, telefono, paymentMethod } = req.body || {};

	if (!nombre || !origen || !destino || !asiento || !horario || !fecha || !numeroDocumento) {
		return res.status(400).json({ error: "Faltan datos requeridos (nombre, documento, origen, destino, asiento, horario, fecha)" });
	}

	// Verificar si el asiento está disponible
	if (isSeatBooked(origen, destino, fecha, horario, asiento)) {
		return res.status(409).json({ error: "El asiento seleccionado no está disponible" });
	}

	// Validar que la ruta existe
	const routeKey = `${origen}-${destino}`;
	const routeData = availableRoutes[routeKey];
	if (!routeData) {
		return res.status(400).json({ error: "Ruta no válida" });
	}

	// Obtener precio correcto según el horario
	const selectedSchedule = routeData.schedules.find(s => s.time === horario);
	const finalPrice = selectedSchedule ? selectedSchedule.price : routeData.basePrice;

	try {
		const baseUrl = process.env.FRONTEND_BASE_URL || `${req.protocol}://${req.get("host")}`;
		
		// Configurar métodos de pago según la selección
		const paymentMethodTypes = [];
		
		switch(paymentMethod) {
			case 'oxxo':
				paymentMethodTypes.push('oxxo');
				break;
			case 'spei':
				paymentMethodTypes.push('customer_balance');
				break;
			case 'cash':
				paymentMethodTypes.push('oxxo'); // OXXO como método de efectivo
				break;
			case 'card':
			default:
				paymentMethodTypes.push('card');
				break;
		}
		
		const sessionConfig = {
			payment_method_types: paymentMethodTypes,
			mode: "payment",
			line_items: [
				{
					price_data: {
						currency: "mxn", // Cambio a pesos mexicanos
						product_data: {
							name: `TransBus: ${origen} → ${destino}`,
							description: `Viaje del ${fecha} a las ${horario} - Asiento ${asiento}\nPasajero: ${nombre}\nDocumento: ${tipoDocumento} ${numeroDocumento}`,
						},
						unit_amount: Math.round(finalPrice * 100), // Convertir a centavos
					},
					quantity: 1,
				},
			],
			success_url: `${baseUrl}/index.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${baseUrl}/index.html?canceled=true`,
			metadata: { 
				nombre, 
				tipoDocumento: tipoDocumento || 'N/A',
				numeroDocumento,
				origen, 
				destino, 
				asiento: String(asiento), 
				horario,
				fecha,
				precio: finalPrice.toString(),
				email: email || 'N/A',
				telefono: telefono || 'N/A',
				paymentMethod: paymentMethod || 'card'
			},
			customer_email: email || undefined,
		};
		
		// Configuración específica para OXXO
		if (paymentMethod === 'oxxo' || paymentMethod === 'cash') {
			sessionConfig.payment_method_options = {
				oxxo: {
					expires_after_days: 3 // El voucher expira en 3 días
				}
			};
		}
		
		// Configuración para SPEI
		if (paymentMethod === 'spei') {
			sessionConfig.payment_method_options = {
				customer_balance: {
					funding_type: 'bank_transfer',
					bank_transfer: {
						type: 'mx_bank_transfer'
					}
				}
			};
		}
		
		const session = await stripe.checkout.sessions.create(sessionConfig);

		return res.json({ url: session.url });
	} catch (err) {
		console.error("Error creating checkout session:", err);
		return res.status(500).json({ error: "Error interno del servidor: " + err.message });
	}
});

// API: Verificar sesión de pago y confirmar reserva
app.get("/api/checkout/session", async (req, res) => {
	const { session_id } = req.query || {};
	
	if (!session_id) {
		return res.status(400).json({ error: "Falta session_id" });
	}

	try {
		const session = await stripe.checkout.sessions.retrieve(String(session_id));
		
		if (!session) {
			return res.status(404).json({ error: "Sesión no encontrada" });
		}

		if (session.payment_status !== "paid") {
			return res.status(402).json({ error: "Pago no confirmado" });
		}

		const { nombre, origen, destino, asiento, horario, fecha, precio } = session.metadata || {};
		
		if (!nombre || !origen || !destino || !asiento || !horario || !fecha) {
			return res.status(500).json({ error: "Datos de sesión incompletos" });
		}

		// Reservar el asiento si el pago fue exitoso
		if (!isSeatBooked(origen, destino, fecha, horario, asiento)) {
			bookSeat(origen, destino, fecha, horario, asiento);
		}

		// Guardar el boleto en la base de datos temporal
		const ticketData = {
			sessionId: session.id,
			nombre,
			origen,
			destino,
			asiento,
			horario,
			fecha,
			precio: parseFloat(precio),
			amountPaid: session.amount_total / 100,
			currency: session.currency,
			createdAt: new Date().toISOString(),
			paymentStatus: "paid"
		};

		ticketDatabase.set(session.id, ticketData);

		// Guardar boleto en disco
		saveTickets(ticketDatabase);

		return res.json({
			status: "paid",
			sessionId: session.id,
			amountTotal: session.amount_total,
			currency: session.currency,
			boleto: { nombre, origen, destino, asiento, horario, fecha }
		});

	} catch (err) {
		console.error("Error verifying session:", err);
		return res.status(500).json({ error: "Error verificando el pago" });
	}
});

// API: Obtener información de un boleto
app.get("/api/ticket/:sessionId", (req, res) => {
	const { sessionId } = req.params;
	const ticket = ticketDatabase.get(sessionId);
	
	if (!ticket) {
		return res.status(404).json({ error: "Boleto no encontrado" });
	}
	
	res.json(ticket);
});

// API: Listar todos los boletos (para administración)
app.get("/api/admin/tickets", (req, res) => {
	const tickets = Array.from(ticketDatabase.values());
	res.json({ 
		total: tickets.length,
		tickets: tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
	});
});

// API: Estadísticas básicas
app.get("/api/admin/stats", (req, res) => {
	const tickets = Array.from(ticketDatabase.values());
	const totalRevenue = tickets.reduce((sum, ticket) => sum + ticket.amountPaid, 0);
	const routeStats = {};
	
	tickets.forEach(ticket => {
		const route = `${ticket.origen}-${ticket.destino}`;
		if (!routeStats[route]) {
			routeStats[route] = { count: 0, revenue: 0 };
		}
		routeStats[route].count++;
		routeStats[route].revenue += ticket.amountPaid;
	});
	
	res.json({
		totalTickets: tickets.length,
		totalRevenue: totalRevenue.toFixed(2),
		averageTicketPrice: tickets.length > 0 ? (totalRevenue / tickets.length).toFixed(2) : 0,
		routeStats
	});
});

// ========================================
// ENDPOINTS DE ADMINISTRACIÓN - CRUD DE RUTAS
// ========================================

/**
 * POST /api/admin/routes - Crear nueva ruta
 */
app.post("/api/admin/routes", (req, res) => {
	const { origin, destination, duration, distance, basePrice, schedules } = req.body;
	
	if (!origin || !destination || !duration || !basePrice || !schedules) {
		return res.status(400).json({ 
			success: false,
			error: "Faltan datos requeridos: origin, destination, duration, basePrice, schedules" 
		});
	}
	
	const routeKey = `${origin}-${destination}`;
	
	// Verificar si ya existe
	if (availableRoutes[routeKey]) {
		return res.status(409).json({ 
			success: false,
			error: "Esta ruta ya existe. Use PUT para actualizar." 
		});
	}
	
	// Asignar IDs únicos a los horarios
	const schedulesWithIds = schedules.map((schedule, index) => ({
		...schedule,
		id: Date.now() + index
	}));
	
	availableRoutes[routeKey] = {
		duration,
		distance: distance || "N/A",
		basePrice: parseFloat(basePrice),
		schedules: schedulesWithIds
	};
	
	// Guardar cambios en disco
	saveRoutes(availableRoutes);
	
	res.json({
		success: true,
		message: "Ruta creada exitosamente",
		route: {
			key: routeKey,
			data: availableRoutes[routeKey]
		}
	});
});

/**
 * PUT /api/admin/routes/:routeKey - Actualizar ruta existente
 */
app.put("/api/admin/routes/:routeKey", (req, res) => {
	const { routeKey } = req.params;
	const { duration, distance, basePrice, schedules } = req.body;
	
	if (!availableRoutes[routeKey]) {
		return res.status(404).json({ 
			success: false,
			error: "Ruta no encontrada" 
		});
	}
	
	// Actualizar campos proporcionados
	if (duration) availableRoutes[routeKey].duration = duration;
	if (distance) availableRoutes[routeKey].distance = distance;
	if (basePrice) availableRoutes[routeKey].basePrice = parseFloat(basePrice);
	if (schedules) {
		const schedulesWithIds = schedules.map((schedule, index) => ({
			...schedule,
			id: schedule.id || Date.now() + index
		}));
		availableRoutes[routeKey].schedules = schedulesWithIds;
	}
	
	// Guardar cambios en disco
	saveRoutes(availableRoutes);
	
	res.json({
		success: true,
		message: "Ruta actualizada exitosamente",
		route: {
			key: routeKey,
			data: availableRoutes[routeKey]
		}
	});
});

/**
 * DELETE /api/admin/routes/:routeKey - Eliminar ruta
 */
app.delete("/api/admin/routes/:routeKey", (req, res) => {
	const { routeKey } = req.params;
	
	if (!availableRoutes[routeKey]) {
		return res.status(404).json({ 
			success: false,
			error: "Ruta no encontrada" 
		});
	}
	
	delete availableRoutes[routeKey];
	
	// Guardar cambios en disco
	saveRoutes(availableRoutes);
	
	res.json({
		success: true,
		message: "Ruta eliminada exitosamente",
		deletedRoute: routeKey
	});
});

/**
 * POST /api/admin/routes/:routeKey/schedules - Agregar horario a una ruta
 */
app.post("/api/admin/routes/:routeKey/schedules", (req, res) => {
	const { routeKey } = req.params;
	const { time, arrival, type, price } = req.body;
	
	if (!availableRoutes[routeKey]) {
		return res.status(404).json({ 
			success: false,
			error: "Ruta no encontrada" 
		});
	}
	
	if (!time || !arrival || !type || !price) {
		return res.status(400).json({ 
			success: false,
			error: "Faltan datos: time, arrival, type, price" 
		});
	}
	
	const newSchedule = {
		id: Date.now(),
		time,
		arrival,
		type,
		price: parseFloat(price)
	};
	
	availableRoutes[routeKey].schedules.push(newSchedule);
	
	// Guardar cambios en disco
	saveRoutes(availableRoutes);
	
	res.json({
		success: true,
		message: "Horario agregado exitosamente",
		schedule: newSchedule
	});
});

/**
 * PUT /api/admin/routes/:routeKey/schedules/:scheduleId - Actualizar horario
 */
app.put("/api/admin/routes/:routeKey/schedules/:scheduleId", (req, res) => {
	const { routeKey, scheduleId } = req.params;
	const { time, arrival, type, price } = req.body;
	
	if (!availableRoutes[routeKey]) {
		return res.status(404).json({ 
			success: false,
			error: "Ruta no encontrada" 
		});
	}
	
	const schedule = availableRoutes[routeKey].schedules.find(s => s.id === parseInt(scheduleId));
	
	if (!schedule) {
		return res.status(404).json({ 
			success: false,
			error: "Horario no encontrado" 
		});
	}
	
	// Actualizar campos
	if (time) schedule.time = time;
	if (arrival) schedule.arrival = arrival;
	if (type) schedule.type = type;
	if (price) schedule.price = parseFloat(price);
	
	// Guardar cambios en disco
	saveRoutes(availableRoutes);
	
	res.json({
		success: true,
		message: "Horario actualizado exitosamente",
		schedule
	});
});

/**
 * DELETE /api/admin/routes/:routeKey/schedules/:scheduleId - Eliminar horario
 */
app.delete("/api/admin/routes/:routeKey/schedules/:scheduleId", (req, res) => {
	const { routeKey, scheduleId } = req.params;
	
	if (!availableRoutes[routeKey]) {
		return res.status(404).json({ 
			success: false,
			error: "Ruta no encontrada" 
		});
	}
	
	const scheduleIndex = availableRoutes[routeKey].schedules.findIndex(s => s.id === parseInt(scheduleId));
	
	if (scheduleIndex === -1) {
		return res.status(404).json({ 
			success: false,
			error: "Horario no encontrado" 
		});
	}
	
	const deletedSchedule = availableRoutes[routeKey].schedules.splice(scheduleIndex, 1)[0];
	
	// Guardar cambios en disco
	saveRoutes(availableRoutes);
	
	res.json({
		success: true,
		message: "Horario eliminado exitosamente",
		deletedSchedule
	});
});

// Health check endpoint
app.get("/api/health", (req, res) => {
	res.json({ 
		status: "OK", 
		timestamp: new Date().toISOString(),
		uptime: process.uptime()
	});
});

// Serve frontend statically
app.use(express.static(path.join(__dirname, "../Frontend")));

// Catch-all handler: send back React's index.html file for client-side routing
app.get("*", (req, res) => {
	res.sendFile(path.join(__dirname, "../Frontend/index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error("Unhandled error:", err);
	res.status(500).json({ error: "Error interno del servidor" });
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
	console.log(`🚌 Servidor TransBus ejecutándose en puerto ${PORT}`);
	console.log(`📍 Frontend disponible en: http://localhost:${PORT}`);
	console.log(`🔧 API base URL: http://localhost:${PORT}/api`);
});
