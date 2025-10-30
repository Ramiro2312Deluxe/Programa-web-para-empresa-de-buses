// backend/server.js
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();

// Allow requests from the frontend (same origin if served statically)
app.use(cors());
app.use(express.json());

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// In-memory stores (replace with database in production)
const bookedSeatsByRoute = new Map(); // key: `${origen}|${destino}|${fecha}|${horario}` -> Set of seat numbers
const ticketDatabase = new Map(); // key: sessionId -> ticket data

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
}

// Rutas disponibles con información detallada
const availableRoutes = {
	"Ciudad de México-Guadalajara": {
		duration: "7h 30m",
		distance: "550 km",
		basePrice: 25.00,
		schedules: [
			{ id: 1, time: "06:00", arrival: "13:30", type: "Ejecutivo", price: 25.00 },
			{ id: 2, time: "10:00", arrival: "17:30", type: "Primera Clase", price: 30.00 },
			{ id: 3, time: "14:00", arrival: "21:30", type: "Ejecutivo", price: 25.00 },
			{ id: 4, time: "20:00", arrival: "03:30+1", type: "Primera Clase", price: 30.00 }
		]
	},
	"Ciudad de México-Monterrey": {
		duration: "9h 15m",
		distance: "920 km",
		basePrice: 35.00,
		schedules: [
			{ id: 5, time: "08:00", arrival: "17:15", type: "Ejecutivo", price: 35.00 },
			{ id: 6, time: "16:00", arrival: "01:15+1", type: "Primera Clase", price: 40.00 },
			{ id: 7, time: "22:00", arrival: "07:15+1", type: "Ejecutivo", price: 35.00 }
		]
	},
	"Guadalajara-Ciudad de México": {
		duration: "7h 30m",
		distance: "550 km",
		basePrice: 25.00,
		schedules: [
			{ id: 8, time: "07:00", arrival: "14:30", type: "Primera Clase", price: 30.00 },
			{ id: 9, time: "11:00", arrival: "18:30", type: "Ejecutivo", price: 25.00 },
			{ id: 10, time: "19:00", arrival: "02:30+1", type: "Primera Clase", price: 30.00 }
		]
	}
};

// API: Obtener rutas disponibles
app.get("/api/routes", (req, res) => {
	res.json(availableRoutes);
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
	const { nombre, origen, destino, asiento, horario, fecha, precio } = req.body || {};

	if (!nombre || !origen || !destino || !asiento || !horario || !fecha) {
		return res.status(400).json({ error: "Faltan datos requeridos" });
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
		
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			mode: "payment",
			line_items: [
				{
					price_data: {
						currency: "usd",
						product_data: {
							name: `TransBus: ${origen} → ${destino}`,
							description: `Viaje del ${fecha} a las ${horario} - Asiento ${asiento}`,
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
				origen, 
				destino, 
				asiento: String(asiento), 
				horario,
				fecha,
				precio: finalPrice.toString()
			},
			customer_email: req.body.email || undefined,
		});

		return res.json({ url: session.url });
	} catch (err) {
		console.error("Error creating checkout session:", err);
		return res.status(500).json({ error: "Error interno del servidor" });
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
