// Estado global de la aplicación TransBus
let appState = {
    selectedRoute: null,
    selectedSchedule: null,
    selectedSeat: null,
    occupiedSeats: new Set(),
    availableRoutes: null,
    totalSeats: 45 // Capacidad estándar del autobús
};

// Cache para datos del servidor
let routesCache = null;

// Inicialización cuando el DOM está listo
document.addEventListener("DOMContentLoaded", function() {
    console.log("🚌 TransBus iniciado correctamente");
    setupApp();
});

function setupApp() {
    setupEventListeners();
    setupDateInput();
    checkPaymentStatus();
    loadAvailableRoutes(); // Cargar rutas del servidor
}

function setupEventListeners() {
    // Botón buscar viajes
    const btnBuscarViajes = document.getElementById("btnBuscarViajes");
    if (btnBuscarViajes) {
        btnBuscarViajes.addEventListener("click", handleSearchTrips);
    }

    // Botón continuar al pago
    const btnContinuarPago = document.getElementById("btnContinuarPago");
    if (btnContinuarPago) {
        btnContinuarPago.addEventListener("click", () => showStep(3));
    }

    // Formulario de pasajero
    const formPasajero = document.getElementById("formPasajero");
    if (formPasajero) {
        formPasajero.addEventListener("submit", handlePayment);
    }

    // Botón descargar PDF
    const descargarPDF = document.getElementById("descargarPDF");
    if (descargarPDF) {
        descargarPDF.addEventListener("click", generatePDF);
    }
}

function setupDateInput() {
    const fechaInput = document.getElementById("fecha");
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.min = today;
        fechaInput.value = today;
    }
}

async function handleSearchTrips() {
    const origen = document.getElementById("origen")?.value;
    const destino = document.getElementById("destino")?.value;
    const fecha = document.getElementById("fecha")?.value;

    if (!origen || !destino || !fecha) {
        showError("Por favor completa todos los campos");
        return;
    }

    if (origen === destino) {
        showError("El origen y destino no pueden ser iguales");
        return;
    }

    // Mostrar loading
    const btnBuscar = document.getElementById("btnBuscarViajes");
    const originalText = btnBuscar.innerHTML;
    btnBuscar.disabled = true;
    btnBuscar.innerHTML = '<div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Buscando...';

    try {
        // Cargar rutas si no están en cache
        if (!routesCache) {
            await loadAvailableRoutes();
        }

        const routeKey = `${origen}-${destino}`;
        const routeData = routesCache[routeKey];

        if (!routeData) {
            showError(`No hay viajes disponibles para la ruta ${origen} → ${destino}`);
            return;
        }

        appState.selectedRoute = { key: routeKey, data: routeData, fecha };
        hideError();
        
        displaySchedulesWithPreview(routeData.schedules, origen, destino, fecha);
        
        const horariosContainer = document.getElementById("horariosContainer");
        if (horariosContainer) {
            horariosContainer.classList.remove("hidden");
        }

    } catch (error) {
        console.error('Error buscando viajes:', error);
        showError("Error al buscar viajes. Intenta de nuevo.");
    } finally {
        btnBuscar.disabled = false;
        btnBuscar.innerHTML = originalText;
    }
}

function displaySchedules(schedules) {
    const horariosDiv = document.getElementById("horarios");
    if (!horariosDiv) return;

    horariosDiv.innerHTML = "";

    schedules.forEach(schedule => {
        const card = document.createElement("div");
        card.className = "border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors";
        card.dataset.scheduleId = schedule.id;

        card.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <div class="font-bold text-lg">${schedule.time}</div>
                    <div class="text-sm text-gray-600">${schedule.type}</div>
                </div>
                <div class="text-right">
                    <div class="text-sm text-gray-600">Llegada: ${schedule.arrival}</div>
                    <div class="font-bold text-blue-600">$${schedule.price.toFixed(2)} USD</div>
                </div>
            </div>
        `;

        card.addEventListener("click", () => selectSchedule(schedule));
        horariosDiv.appendChild(card);
    });
}

/**
 * Cargar rutas disponibles del servidor
 */
async function loadAvailableRoutes() {
    try {
        const response = await fetch('/api/routes');
        if (!response.ok) {
            throw new Error('Error al cargar rutas');
        }
        routesCache = await response.json();
        return routesCache;
    } catch (error) {
        console.error('Error cargando rutas:', error);
        showError('Error al cargar rutas disponibles');
        throw error;
    }
}

/**
 * Obtener asientos ocupados para una ruta específica
 */
async function getOccupiedSeats(origen, destino, fecha, horario) {
    try {
        const params = new URLSearchParams({
            origen,
            destino,
            fecha,
            horario
        });
        
        const response = await fetch(`/api/occupied-seats?${params}`);
        if (!response.ok) {
            throw new Error('Error al obtener asientos ocupados');
        }
        
        const data = await response.json();
        return new Set(data.occupiedSeats);
    } catch (error) {
        console.error('Error obteniendo asientos ocupados:', error);
        return new Set(); // Retornar set vacío en caso de error
    }
}

/**
 * Mostrar horarios con vista previa de asientos
 */
async function displaySchedulesWithPreview(schedules, origen, destino, fecha) {
    const horariosDiv = document.getElementById("horarios");
    if (!horariosDiv) return;

    horariosDiv.innerHTML = '<div class="text-center">Cargando disponibilidad...</div>';

    try {
        const scheduleCards = await Promise.all(schedules.map(async (schedule) => {
            // Obtener asientos ocupados para este horario específico
            const occupiedSeats = await getOccupiedSeats(origen, destino, fecha, schedule.time);
            const availableSeats = appState.totalSeats - occupiedSeats.size;
            
            const card = document.createElement("div");
            card.className = "border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors";
            card.dataset.scheduleId = schedule.id;
            
            // Crear vista previa de asientos
            const seatPreview = createSeatPreview(occupiedSeats);
            
            card.innerHTML = `
                <div class="space-y-3">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="font-bold text-lg">${schedule.time}</div>
                            <div class="text-sm text-gray-600">${schedule.type}</div>
                            <div class="text-xs text-gray-500">Llegada: ${schedule.arrival}</div>
                        </div>
                        <div class="text-right">
                            <div class="font-bold text-blue-600 text-xl">$${schedule.price.toFixed(2)} USD</div>
                            <div class="text-sm ${availableSeats > 10 ? 'text-green-600' : availableSeats > 5 ? 'text-orange-600' : 'text-red-600'}">
                                ${availableSeats} asientos disponibles
                            </div>
                        </div>
                    </div>
                    
                    <div class="border-t pt-2">
                        <div class="text-xs text-gray-600 mb-2">Vista previa de asientos:</div>
                        <div class="seat-preview-container">
                            ${seatPreview}
                        </div>
                        <div class="flex justify-between text-xs mt-2">
                            <span class="flex items-center">
                                <div class="w-3 h-3 bg-green-500 rounded mr-1"></div>
                                Disponible
                            </span>
                            <span class="flex items-center">
                                <div class="w-3 h-3 bg-red-500 rounded mr-1"></div>
                                Ocupado
                            </span>
                            <span class="text-gray-600">Total: ${appState.totalSeats}</span>
                        </div>
                    </div>
                </div>
            `;

            // Guardar datos de asientos ocupados en el elemento
            card.dataset.occupiedSeats = JSON.stringify(Array.from(occupiedSeats));
            
            card.addEventListener("click", () => selectScheduleWithSeats(schedule, occupiedSeats));
            return card;
        }));

        // Limpiar y agregar las tarjetas
        horariosDiv.innerHTML = "";
        scheduleCards.forEach(card => horariosDiv.appendChild(card));
        
    } catch (error) {
        console.error('Error mostrando horarios:', error);
        horariosDiv.innerHTML = '<div class="text-red-600 text-center">Error al cargar horarios</div>';
    }
}

/**
 * Crear vista previa de asientos en miniatura
 */
function createSeatPreview(occupiedSeats) {
    let seatGrid = '';
    const seatsPerRow = 4;
    const totalRows = Math.ceil(appState.totalSeats / seatsPerRow);
    
    for (let row = 0; row < totalRows; row++) {
        seatGrid += '<div class="flex justify-center gap-1 mb-1">';
        
        for (let col = 0; col < seatsPerRow; col++) {
            const seatNumber = row * seatsPerRow + col + 1;
            
            if (seatNumber <= appState.totalSeats) {
                const isOccupied = occupiedSeats.has(String(seatNumber));
                const seatClass = isOccupied ? 'bg-red-500' : 'bg-green-500';
                
                seatGrid += `<div class="w-2 h-2 ${seatClass} rounded-sm" title="Asiento ${seatNumber}"></div>`;
            } else {
                seatGrid += '<div class="w-2 h-2"></div>'; // Espacio vacío
            }
        }
        
        seatGrid += '</div>';
    }
    
    return `<div class="seat-mini-grid">${seatGrid}</div>`;
}

/**
 * Seleccionar horario con información de asientos
 */
function selectScheduleWithSeats(schedule, occupiedSeats) {
    // Quitar selección anterior
    document.querySelectorAll("[data-schedule-id]").forEach(card => {
        card.classList.remove("border-blue-500", "bg-blue-50");
        card.classList.add("border-gray-300");
    });

    // Seleccionar nueva tarjeta
    const selectedCard = document.querySelector(`[data-schedule-id="${schedule.id}"]`);
    if (selectedCard) {
        selectedCard.classList.remove("border-gray-300");
        selectedCard.classList.add("border-blue-500", "bg-blue-50");
    }

    appState.selectedSchedule = schedule;
    appState.occupiedSeats = occupiedSeats; // Actualizar asientos ocupados

    // Ir al paso 2 después de un breve delay
    setTimeout(() => {
        showStep(2);
        generateSeatMap();
        updateTripSummary();
    }, 300);
}

function selectSchedule(schedule) {
    // Quitar selección anterior
    document.querySelectorAll("[data-schedule-id]").forEach(card => {
        card.classList.remove("border-blue-500", "bg-blue-50");
        card.classList.add("border-gray-300");
    });

    // Seleccionar nueva tarjeta
    const selectedCard = document.querySelector(`[data-schedule-id="${schedule.id}"]`);
    if (selectedCard) {
        selectedCard.classList.remove("border-gray-300");
        selectedCard.classList.add("border-blue-500", "bg-blue-50");
    }

    appState.selectedSchedule = schedule;

    // Ir al paso 2 después de un breve delay
    setTimeout(() => {
        showStep(2);
        generateSeatMap();
        updateTripSummary();
    }, 300);
}

function generateSeatMap() {
    const mapaAsientos = document.getElementById("mapaAsientos");
    if (!mapaAsientos) return;

    mapaAsientos.innerHTML = "";

    // Mostrar estadísticas de asientos
    const availableCount = appState.totalSeats - appState.occupiedSeats.size;
    const statsDiv = document.createElement("div");
    statsDiv.className = "mb-4 p-3 bg-gray-50 rounded-lg";
    statsDiv.innerHTML = `
        <div class="flex justify-between items-center text-sm">
            <div class="flex items-center space-x-4">
                <span class="flex items-center">
                    <div class="w-4 h-4 bg-green-500 rounded mr-2"></div>
                    Disponible (${availableCount})
                </span>
                <span class="flex items-center">
                    <div class="w-4 h-4 bg-red-500 rounded mr-2"></div>
                    Ocupado (${appState.occupiedSeats.size})
                </span>
                <span class="flex items-center">
                    <div class="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                    Seleccionado
                </span>
            </div>
            <div class="font-semibold">
                Total: ${appState.totalSeats} asientos
            </div>
        </div>
    `;
    mapaAsientos.appendChild(statsDiv);

    // Generar filas de asientos (configuración 2-2)
    const seatsPerRow = 4;
    const totalRows = Math.ceil(appState.totalSeats / seatsPerRow);

    for (let fila = 1; fila <= totalRows; fila++) {
        const filaDiv = document.createElement("div");
        filaDiv.className = "grid grid-cols-5 gap-2 mb-2 items-center";

        // Asientos izquierdos (A, B)
        for (let col = 0; col < 2; col++) {
            const seatNumber = (fila - 1) * seatsPerRow + col + 1;
            if (seatNumber <= appState.totalSeats) {
                const seatLabel = `${fila}${String.fromCharCode(65 + col)}`;
                filaDiv.appendChild(createSeat(seatNumber, seatLabel));
            } else {
                filaDiv.appendChild(createEmptySeat());
            }
        }

        // Número de fila en el centro
        const numeroFila = document.createElement("div");
        numeroFila.className = "text-center text-xs text-gray-500 font-bold";
        numeroFila.textContent = fila;
        filaDiv.appendChild(numeroFila);

        // Asientos derechos (C, D)
        for (let col = 2; col < 4; col++) {
            const seatNumber = (fila - 1) * seatsPerRow + col + 1;
            if (seatNumber <= appState.totalSeats) {
                const seatLabel = `${fila}${String.fromCharCode(65 + col)}`;
                filaDiv.appendChild(createSeat(seatNumber, seatLabel));
            } else {
                filaDiv.appendChild(createEmptySeat());
            }
        }

        mapaAsientos.appendChild(filaDiv);
    }

    // Agregar leyenda al final
    const legendDiv = document.createElement("div");
    legendDiv.className = "mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800";
    legendDiv.innerHTML = `
        <div class="flex items-center justify-center">
            <i class="fas fa-info-circle mr-2"></i>
            Haz clic en un asiento disponible (verde) para seleccionarlo
        </div>
    `;
    mapaAsientos.appendChild(legendDiv);
}

function createEmptySeat() {
    const emptySeat = document.createElement("div");
    emptySeat.className = "w-10 h-10"; // Espacio vacío
    return emptySeat;
}

function createSeat(number, label) {
    const seat = document.createElement("div");
    seat.className = "w-10 h-10 rounded border-2 flex items-center justify-center text-xs font-bold cursor-pointer transition-all";
    seat.dataset.seatNumber = number;
    seat.textContent = label;

    if (appState.occupiedSeats.has(String(number))) {
        seat.classList.add("bg-red-500", "text-white", "border-red-600", "cursor-not-allowed");
        seat.title = "Asiento ocupado";
    } else {
        seat.classList.add("bg-green-500", "text-white", "border-green-600", "hover:bg-green-600");
        seat.title = "Asiento disponible - Click para seleccionar";
        seat.addEventListener("click", () => selectSeat(number, label, seat));
    }

    return seat;
}

function selectSeat(number, label, seatElement) {
    if (appState.occupiedSeats.has(String(number))) return;

    // Quitar selección anterior
    document.querySelectorAll("[data-seat-number]").forEach(seat => {
        if (seat.classList.contains("bg-blue-500")) {
            seat.classList.remove("bg-blue-500", "border-blue-600");
            seat.classList.add("bg-green-500", "border-green-600");
        }
    });

    // Seleccionar nuevo asiento
    seatElement.classList.remove("bg-green-500", "border-green-600");
    seatElement.classList.add("bg-blue-500", "border-blue-600");

    appState.selectedSeat = { number, label };

    // Habilitar botón continuar
    const btnContinuar = document.getElementById("btnContinuarPago");
    if (btnContinuar) {
        btnContinuar.disabled = false;
    }

    updateTripSummary();
}

function updateTripSummary() {
    const resumenViaje = document.getElementById("resumenViaje");
    if (!resumenViaje || !appState.selectedRoute || !appState.selectedSchedule) return;

    const { selectedRoute, selectedSchedule, selectedSeat } = appState;

    resumenViaje.innerHTML = `
        <div class="space-y-3">
            <div class="flex justify-between">
                <span class="text-gray-600">Ruta:</span>
                <span class="font-semibold">${selectedRoute.key.replace("-", " → ")}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">Fecha:</span>
                <span class="font-semibold">${formatDate(selectedRoute.fecha)}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">Horario:</span>
                <span class="font-semibold">${selectedSchedule.time} - ${selectedSchedule.arrival}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">Clase:</span>
                <span class="font-semibold">${selectedSchedule.type}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">Duración:</span>
                <span class="font-semibold">${selectedRoute.data.duration}</span>
            </div>
            ${selectedSeat ? `
                <div class="flex justify-between">
                    <span class="text-gray-600">Asiento:</span>
                    <span class="font-semibold">${selectedSeat.label}</span>
                </div>
            ` : ''}
            <hr class="my-2">
            <div class="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span class="text-green-600">$${selectedSchedule.price.toFixed(2)} USD</span>
            </div>
        </div>
    `;
}

function showStep(step) {
    const steps = ["paso1", "paso2", "paso3", "pagoExitoso"];

    steps.forEach((stepId, index) => {
        const element = document.getElementById(stepId);
        if (element) {
            if (index + 1 === step) {
                element.classList.remove("hidden");
            } else {
                element.classList.add("hidden");
            }
        }
    });
}

async function handlePayment(e) {
    e.preventDefault();

    if (!appState.selectedSeat) {
        showError("Por favor selecciona un asiento");
        return;
    }

    const nombre = document.getElementById("nombre")?.value?.trim();
    const apellidos = document.getElementById("apellidos")?.value?.trim();
    const email = document.getElementById("email")?.value?.trim();
    const telefono = document.getElementById("telefono")?.value?.trim();

    if (!nombre || !apellidos || !email || !telefono) {
        showError("Por favor completa todos los campos requeridos");
        return;
    }

    const btnPagar = document.getElementById("btnPagar");
    if (btnPagar) {
        btnPagar.disabled = true;
        btnPagar.innerHTML = '<div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Procesando...';
    }

    const paymentData = {
        nombre: `${nombre} ${apellidos}`,
        origen: appState.selectedRoute.key.split("-")[0],
        destino: appState.selectedRoute.key.split("-")[1],
        asiento: appState.selectedSeat.number,
        horario: appState.selectedSchedule.time,
        fecha: appState.selectedRoute.fecha,
        precio: appState.selectedSchedule.price,
        email: email
    };

    try {
        const response = await fetch("/api/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paymentData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "No se pudo procesar el pago");
        }

        // Redirigir a Stripe
        window.location = data.url;

    } catch (error) {
        showError(error.message);
        if (btnPagar) {
            btnPagar.disabled = false;
            btnPagar.innerHTML = `<i class="fas fa-credit-card mr-2"></i>Proceder al Pago ($${appState.selectedSchedule.price.toFixed(2)} USD)`;
        }
    }
}

function checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get("success")) {
        const sessionId = urlParams.get("session_id");
        if (sessionId) {
            verifyPayment(sessionId);
        }
    } else if (urlParams.get("canceled")) {
        showError("El pago fue cancelado. Puedes intentar de nuevo.");
    }
}

async function verifyPayment(sessionId) {
    try {
        const response = await fetch(`/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "No se pudo verificar el pago");
        }

        // Mostrar resumen del boleto
        const resumenBoleto = document.getElementById("resumenBoleto");
        if (resumenBoleto) {
            resumenBoleto.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 class="font-bold text-lg mb-3 text-center text-green-600">
                        <i class="fas fa-check-circle mr-2"></i>
                        Boleto Confirmado
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div><strong>Pasajero:</strong> ${data.boleto.nombre}</div>
                        <div><strong>Ruta:</strong> ${data.boleto.origen} → ${data.boleto.destino}</div>
                        <div><strong>Asiento:</strong> ${data.boleto.asiento}</div>
                        <div><strong>Horario:</strong> ${data.boleto.horario}</div>
                        <div><strong>Fecha:</strong> ${data.boleto.fecha}</div>
                        <div><strong>Total:</strong> $${(data.amountTotal / 100).toFixed(2)} USD</div>
                    </div>
                </div>
            `;
        }

        // Guardar datos para PDF
        window.ticketData = {
            ...data.boleto,
            amount: data.amountTotal / 100,
            sessionId: data.sessionId,
            purchaseDate: new Date().toLocaleDateString('es-ES'),
            purchaseTime: new Date().toLocaleTimeString('es-ES')
        };

        showStep(4);

        // Limpiar URL
        window.history.replaceState({}, document.title, window.location.pathname);

    } catch (error) {
        showError(error.message);
    }
}

function generatePDF() {
    if (!window.ticketData) {
        showError("No hay boleto para descargar");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const ticket = window.ticketData;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(59, 130, 246);
    doc.text("🚌 TransBus", 20, 25);

    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text("BOLETO DE VIAJE", 20, 40);

    // Línea separadora
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(1);
    doc.line(20, 45, 190, 45);

    // Información del boleto
    doc.setFontSize(12);
    let yPos = 60;

    const info = [
        ["PASAJERO:", ticket.nombre.toUpperCase()],
        ["RUTA:", `${ticket.origen.toUpperCase()} → ${ticket.destino.toUpperCase()}`],
        ["FECHA DE VIAJE:", ticket.fecha || "No especificada"],
        ["HORARIO:", ticket.horario],
        ["ASIENTO:", `NÚMERO ${ticket.asiento}`],
        ["TOTAL PAGADO:", `$${ticket.amount.toFixed(2)} USD`],
        ["FECHA DE COMPRA:", `${ticket.purchaseDate} ${ticket.purchaseTime}`],
        ["ID TRANSACCIÓN:", ticket.sessionId]
    ];

    info.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(value, 80, yPos);
        yPos += 10;
    });

    // Instrucciones
    yPos += 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("INSTRUCCIONES:", 20, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const instructions = [
        "• Llegue 30 minutos antes de la salida",
        "• Presente este boleto al abordar",
        "• Mantenga el boleto durante el viaje",
        "• Contacte 1-800-TRANSBUS para soporte"
    ];

    instructions.forEach(instruction => {
        doc.text(instruction, 20, yPos);
        yPos += 6;
    });

    // Footer
    yPos += 20;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("TransBus - Tu viaje seguro y cómodo", 20, yPos);
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 20, yPos + 8);

    // Descargar
    const fileName = `TransBus_${ticket.nombre.replace(/\s+/g, '_')}_${ticket.fecha || 'sin_fecha'}.pdf`;
    doc.save(fileName);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function showError(message) {
    const errorBox = document.getElementById("errorBox");
    const errorMessage = document.getElementById("errorMessage");

    if (errorBox && errorMessage) {
        errorMessage.textContent = message;
        errorBox.classList.remove("hidden");

        setTimeout(() => {
            errorBox.classList.add("hidden");
        }, 5000);
    } else {
        alert(message);
    }
}

function hideError() {
    const errorBox = document.getElementById("errorBox");
    if (errorBox) {
        errorBox.classList.add("hidden");
    }
}