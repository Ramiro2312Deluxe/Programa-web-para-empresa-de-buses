/**
 * Panel de Administración TransBus
 * Gestión en tiempo real de rutas, horarios, precios y asientos
 */

const API_BASE_URL = window.location.origin;

let adminState = {
    routes: {},
    tickets: [],
    stats: {},
    currentTab: 'routes'
};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔧 Panel de administración iniciado');
    await loadInitialData();
    startAutoRefresh();
});

/**
 * Cargar datos iniciales
 */
async function loadInitialData() {
    await Promise.all([
        loadRoutes(),
        loadStats(),
        loadTickets()
    ]);
}

/**
 * Cargar rutas desde el backend
 */
async function loadRoutes() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/routes`);
        if (!response.ok) throw new Error('Error cargando rutas');
        
        adminState.routes = await response.json();
        displayRoutes();
        populateRouteSelects();
        updateRouteCount();
        
        console.log('✅ Rutas cargadas:', Object.keys(adminState.routes).length);
    } catch (error) {
        console.error('❌ Error cargando rutas:', error);
        showToast('Error cargando rutas', 'error');
    }
}

/**
 * Cargar estadísticas
 */
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/stats`);
        if (!response.ok) throw new Error('Error cargando estadísticas');
        
        adminState.stats = await response.json();
        displayStats();
        
        console.log('✅ Estadísticas cargadas');
    } catch (error) {
        console.error('❌ Error cargando estadísticas:', error);
    }
}

/**
 * Cargar boletos vendidos
 */
async function loadTickets() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/tickets`);
        if (!response.ok) throw new Error('Error cargando boletos');
        
        const data = await response.json();
        adminState.tickets = data.tickets || [];
        displayTickets();
        
        console.log('✅ Boletos cargados:', adminState.tickets.length);
    } catch (error) {
        console.error('❌ Error cargando boletos:', error);
    }
}

/**
 * Mostrar estadísticas en los cards
 */
function displayStats() {
    const { totalTickets, totalRevenue, averageTicketPrice } = adminState.stats;
    
    document.getElementById('totalTickets').textContent = totalTickets || 0;
    document.getElementById('totalRevenue').textContent = `$${totalRevenue || 0}`;
    document.getElementById('avgPrice').textContent = `$${averageTicketPrice || 0}`;
}

/**
 * Actualizar contador de rutas
 */
function updateRouteCount() {
    document.getElementById('totalRoutes').textContent = Object.keys(adminState.routes).length;
}

/**
 * Mostrar rutas en el listado
 */
function displayRoutes() {
    const container = document.getElementById('routesList');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.entries(adminState.routes).forEach(([routeKey, routeData]) => {
        const card = document.createElement('div');
        card.className = 'bg-white p-6 rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-all';
        
        const [origin, destination] = routeKey.split('-');
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">${origin} → ${destination}</h3>
                    <p class="text-gray-600 text-sm mt-1">
                        <i class="fas fa-clock mr-1"></i>${routeData.duration} • 
                        <i class="fas fa-road mr-1"></i>${routeData.distance || 'N/A'}
                    </p>
                </div>
                <div class="flex space-x-2">
                    <button onclick="editRoute('${routeKey}')" class="text-blue-600 hover:text-blue-700">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteRoute('${routeKey}')" class="text-red-600 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="bg-blue-50 p-3 rounded mb-3">
                <p class="text-sm font-semibold text-gray-700">Precio Base: 
                    <span class="text-blue-600 text-lg">$${routeData.basePrice.toFixed(2)}</span>
                </p>
            </div>
            
            <div class="space-y-2">
                <p class="text-sm font-semibold text-gray-700">Horarios (${routeData.schedules.length}):</p>
                ${routeData.schedules.slice(0, 3).map(schedule => `
                    <div class="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                        <span><i class="fas fa-clock text-blue-600 mr-1"></i>${schedule.time} - ${schedule.arrival}</span>
                        <span class="font-semibold">${schedule.type}</span>
                        <span class="text-green-600 font-bold">$${schedule.price.toFixed(2)}</span>
                    </div>
                `).join('')}
                ${routeData.schedules.length > 3 ? `
                    <p class="text-xs text-gray-500 text-center">+${routeData.schedules.length - 3} horarios más</p>
                ` : ''}
            </div>
        `;
        
        container.appendChild(card);
    });
    
    if (Object.keys(adminState.routes).length === 0) {
        container.innerHTML = `
            <div class="col-span-2 text-center py-12 text-gray-500">
                <i class="fas fa-route text-5xl mb-4 opacity-50"></i>
                <p>No hay rutas configuradas</p>
                <button onclick="openNewRouteModal()" class="mt-4 text-blue-600 hover:text-blue-700">
                    <i class="fas fa-plus mr-1"></i>Crear Primera Ruta
                </button>
            </div>
        `;
    }
}

/**
 * Poblar selectores de rutas
 */
function populateRouteSelects() {
    const select = document.getElementById('scheduleRouteSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecciona una ruta</option>';
    
    Object.keys(adminState.routes).forEach(routeKey => {
        const option = document.createElement('option');
        option.value = routeKey;
        option.textContent = routeKey.replace('-', ' → ');
        select.appendChild(option);
    });
}

/**
 * Cargar horarios para una ruta específica
 */
function loadSchedulesForRoute() {
    const select = document.getElementById('scheduleRouteSelect');
    const routeKey = select.value;
    
    if (!routeKey) {
        document.getElementById('schedulesList').innerHTML = '';
        return;
    }
    
    const routeData = adminState.routes[routeKey];
    if (!routeData) return;
    
    const container = document.getElementById('schedulesList');
    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-lg">${routeKey.replace('-', ' → ')}</h3>
            <button onclick="addNewSchedule('${routeKey}')" class="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700">
                <i class="fas fa-plus mr-1"></i>Nuevo Horario
            </button>
        </div>
    `;
    
    routeData.schedules.forEach(schedule => {
        const scheduleCard = document.createElement('div');
        scheduleCard.className = 'bg-white p-4 rounded-lg border-2 border-gray-200 flex justify-between items-center';
        
        scheduleCard.innerHTML = `
            <div class="flex-1">
                <div class="flex items-center space-x-4">
                    <div>
                        <span class="font-bold text-lg">${schedule.time}</span>
                        <span class="text-gray-500 mx-2">→</span>
                        <span class="font-bold text-lg">${schedule.arrival}</span>
                    </div>
                    <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                        ${schedule.type}
                    </span>
                    <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                        $${schedule.price.toFixed(2)}
                    </span>
                </div>
            </div>
            <div class="flex space-x-2">
                <button onclick="editSchedule('${routeKey}', ${schedule.id})" class="text-blue-600 hover:text-blue-700 px-3 py-1">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteSchedule('${routeKey}', ${schedule.id})" class="text-red-600 hover:text-red-700 px-3 py-1">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        container.appendChild(scheduleCard);
    });
}

/**
 * Mostrar boletos en la tabla
 */
function displayTickets() {
    const tbody = document.getElementById('ticketsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    adminState.tickets.forEach(ticket => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        
        const date = new Date(ticket.createdAt);
        const formattedDate = date.toLocaleDateString('es-ES');
        
        row.innerHTML = `
            <td class="px-4 py-3 text-sm">${formattedDate}</td>
            <td class="px-4 py-3 text-sm font-medium">${ticket.nombre}</td>
            <td class="px-4 py-3 text-sm">${ticket.origen} → ${ticket.destino}</td>
            <td class="px-4 py-3 text-sm text-center">
                <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded">${ticket.asiento}</span>
            </td>
            <td class="px-4 py-3 text-sm">${ticket.horario} (${ticket.fecha})</td>
            <td class="px-4 py-3 text-sm font-bold text-green-600">$${ticket.amountPaid.toFixed(2)}</td>
            <td class="px-4 py-3 text-sm">
                <span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                    ${ticket.paymentStatus}
                </span>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    if (adminState.tickets.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-ticket-alt text-3xl mb-2 opacity-50"></i>
                    <p>No hay boletos vendidos aún</p>
                </td>
            </tr>
        `;
    }
}

/**
 * Filtrar boletos por búsqueda
 */
function filterTickets() {
    const searchTerm = document.getElementById('ticketSearch').value.toLowerCase();
    const tbody = document.getElementById('ticketsTableBody');
    const rows = tbody.getElementsByTagName('tr');
    
    Array.from(rows).forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

/**
 * Cambiar entre tabs
 */
function switchTab(tabName) {
    // Ocultar todos los contenidos
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Quitar active de todos los tabs
    document.querySelectorAll('[id^="tab-"]').forEach(tab => {
        tab.classList.remove('tab-active');
    });
    
    // Mostrar contenido seleccionado
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    document.getElementById(`tab-${tabName}`).classList.add('tab-active');
    
    adminState.currentTab = tabName;
    
    // Cargar datos específicos del tab
    if (tabName === 'reports') {
        loadReports();
    }
}

/**
 * Cargar reportes y análisis
 */
function loadReports() {
    // Ventas por ruta
    const salesByRoute = document.getElementById('salesByRoute');
    if (salesByRoute && adminState.stats.routeStats) {
        salesByRoute.innerHTML = '';
        
        Object.entries(adminState.stats.routeStats).forEach(([route, data]) => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-3 bg-gray-50 rounded';
            div.innerHTML = `
                <div>
                    <p class="font-semibold text-sm">${route.replace('-', ' → ')}</p>
                    <p class="text-xs text-gray-600">${data.count} boletos</p>
                </div>
                <p class="font-bold text-green-600">$${data.revenue.toFixed(2)}</p>
            `;
            salesByRoute.appendChild(div);
        });
    }
    
    // Ventas recientes
    const recentSales = document.getElementById('recentSales');
    if (recentSales) {
        recentSales.innerHTML = '';
        
        adminState.tickets.slice(0, 5).forEach(ticket => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-3 bg-gray-50 rounded';
            const date = new Date(ticket.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
            div.innerHTML = `
                <div>
                    <p class="font-semibold text-sm">${ticket.nombre}</p>
                    <p class="text-xs text-gray-600">${date} - ${ticket.origen} → ${ticket.destino}</p>
                </div>
                <p class="font-bold text-green-600">$${ticket.amountPaid.toFixed(2)}</p>
            `;
            recentSales.appendChild(div);
        });
    }
    
    // Asientos más populares
    const popularSeats = document.getElementById('popularSeats');
    if (popularSeats) {
        const seatCount = {};
        adminState.tickets.forEach(ticket => {
            seatCount[ticket.asiento] = (seatCount[ticket.asiento] || 0) + 1;
        });
        
        const topSeats = Object.entries(seatCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        popularSeats.innerHTML = topSeats.map(([seat, count]) => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <p class="font-semibold">Asiento ${seat}</p>
                <span class="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">${count} veces</span>
            </div>
        `).join('');
    }
    
    // Horarios populares
    const popularTimes = document.getElementById('popularTimes');
    if (popularTimes) {
        const timeCount = {};
        adminState.tickets.forEach(ticket => {
            timeCount[ticket.horario] = (timeCount[ticket.horario] || 0) + 1;
        });
        
        const topTimes = Object.entries(timeCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        popularTimes.innerHTML = topTimes.map(([time, count]) => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <p class="font-semibold">${time}</p>
                <span class="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm">${count} reservas</span>
            </div>
        `).join('');
    }
}

/**
 * Abrir modal de nueva ruta
 */
function openNewRouteModal() {
    document.getElementById('newRouteModal').classList.remove('hidden');
}

/**
 * Cerrar modal de nueva ruta
 */
function closeNewRouteModal() {
    document.getElementById('newRouteModal').classList.add('hidden');
    document.getElementById('newRouteForm').reset();
}

/**
 * Agregar campo de horario
 */
function addScheduleField() {
    const container = document.getElementById('schedulesContainer');
    const scheduleItem = document.createElement('div');
    scheduleItem.className = 'schedule-item grid grid-cols-4 gap-2';
    scheduleItem.innerHTML = `
        <input type="time" placeholder="Salida" class="p-2 border rounded" required>
        <input type="time" placeholder="Llegada" class="p-2 border rounded" required>
        <select class="p-2 border rounded" required>
            <option value="Ejecutivo">Ejecutivo</option>
            <option value="Primera Clase">Primera Clase</option>
            <option value="Lujo">Lujo</option>
        </select>
        <input type="number" placeholder="Precio" step="0.01" min="0" class="p-2 border rounded" required>
    `;
    container.appendChild(scheduleItem);
}

/**
 * Guardar nueva ruta
 */
async function saveNewRoute(event) {
    event.preventDefault();
    
    const origin = document.getElementById('routeOrigin').value.trim();
    const destination = document.getElementById('routeDestination').value.trim();
    const duration = document.getElementById('routeDuration').value.trim();
    const distance = document.getElementById('routeDistance').value.trim();
    const basePrice = parseFloat(document.getElementById('routeBasePrice').value);
    
    // Recopilar horarios
    const scheduleItems = document.querySelectorAll('.schedule-item');
    const schedules = [];
    
    scheduleItems.forEach((item, index) => {
        const inputs = item.querySelectorAll('input, select');
        schedules.push({
            time: inputs[0].value,
            arrival: inputs[1].value,
            type: inputs[2].value,
            price: parseFloat(inputs[3].value)
        });
    });
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/routes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origin,
                destination,
                duration,
                distance,
                basePrice,
                schedules
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error creando ruta');
        }
        
        showToast('Ruta creada exitosamente', 'success');
        closeNewRouteModal();
        await loadRoutes();
        
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Editar ruta
 */
async function editRoute(routeKey) {
    const route = adminState.routes[routeKey];
    if (!route) return;
    
    const [origin, destination] = routeKey.split('-');
    
    // Prellenar formulario
    document.getElementById('routeOrigin').value = origin;
    document.getElementById('routeDestination').value = destination;
    document.getElementById('routeDuration').value = route.duration;
    document.getElementById('routeDistance').value = route.distance || '';
    document.getElementById('routeBasePrice').value = route.basePrice;
    
    // Limpiar horarios existentes
    const container = document.getElementById('schedulesContainer');
    container.innerHTML = '';
    
    // Cargar horarios de la ruta
    route.schedules.forEach(schedule => {
        const scheduleItem = document.createElement('div');
        scheduleItem.className = 'schedule-item grid grid-cols-4 gap-2';
        scheduleItem.innerHTML = `
            <input type="time" value="${schedule.time}" class="p-2 border rounded" required>
            <input type="time" value="${schedule.arrival}" class="p-2 border rounded" required>
            <select class="p-2 border rounded" required>
                <option value="Ejecutivo" ${schedule.type === 'Ejecutivo' ? 'selected' : ''}>Ejecutivo</option>
                <option value="Primera Clase" ${schedule.type === 'Primera Clase' ? 'selected' : ''}>Primera Clase</option>
                <option value="Lujo" ${schedule.type === 'Lujo' ? 'selected' : ''}>Lujo</option>
            </select>
            <input type="number" value="${schedule.price}" step="0.01" min="0" class="p-2 border rounded" required>
        `;
        container.appendChild(scheduleItem);
    });
    
    // Cambiar el comportamiento del formulario para actualizar
    const form = document.getElementById('newRouteForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        await updateRoute(routeKey);
    };
    
    // Cambiar título del modal
    document.querySelector('#newRouteModal h3').textContent = 'Editar Ruta';
    
    openNewRouteModal();
}

/**
 * Actualizar ruta existente
 */
async function updateRoute(routeKey) {
    const duration = document.getElementById('routeDuration').value.trim();
    const distance = document.getElementById('routeDistance').value.trim();
    const basePrice = parseFloat(document.getElementById('routeBasePrice').value);
    
    // Recopilar horarios
    const scheduleItems = document.querySelectorAll('.schedule-item');
    const schedules = [];
    
    scheduleItems.forEach((item) => {
        const inputs = item.querySelectorAll('input, select');
        schedules.push({
            time: inputs[0].value,
            arrival: inputs[1].value,
            type: inputs[2].value,
            price: parseFloat(inputs[3].value)
        });
    });
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/routes/${encodeURIComponent(routeKey)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                duration,
                distance,
                basePrice,
                schedules
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error actualizando ruta');
        }
        
        showToast('Ruta actualizada exitosamente', 'success');
        closeNewRouteModal();
        await loadRoutes();
        
        // Restaurar comportamiento del formulario
        document.getElementById('newRouteForm').onsubmit = saveNewRoute;
        document.querySelector('#newRouteModal h3').textContent = 'Nueva Ruta';
        
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Eliminar ruta
 */
async function deleteRoute(routeKey) {
    if (!confirm(`¿Estás seguro de eliminar la ruta ${routeKey.replace('-', ' → ')}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/routes/${encodeURIComponent(routeKey)}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error eliminando ruta');
        }
        
        showToast('Ruta eliminada exitosamente', 'success');
        await loadRoutes();
        
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Agregar nuevo horario
 */
async function addNewSchedule(routeKey) {
    const time = prompt('Hora de salida (HH:MM):');
    const arrival = prompt('Hora de llegada (HH:MM):');
    const type = prompt('Tipo de servicio (Ejecutivo, Primera Clase, Lujo):');
    const price = parseFloat(prompt('Precio (MXN):'));
    
    if (!time || !arrival || !type || !price) {
        showToast('Operación cancelada o datos incompletos', 'info');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/routes/${encodeURIComponent(routeKey)}/schedules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ time, arrival, type, price })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error agregando horario');
        }
        
        showToast('Horario agregado exitosamente', 'success');
        await loadRoutes();
        loadSchedulesForRoute();
        
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Editar horario
 */
async function editSchedule(routeKey, scheduleId) {
    const route = adminState.routes[routeKey];
    const schedule = route?.schedules.find(s => s.id === scheduleId);
    
    if (!schedule) {
        showToast('Horario no encontrado', 'error');
        return;
    }
    
    const time = prompt('Hora de salida (HH:MM):', schedule.time);
    const arrival = prompt('Hora de llegada (HH:MM):', schedule.arrival);
    const type = prompt('Tipo de servicio:', schedule.type);
    const price = parseFloat(prompt('Precio (MXN):', schedule.price));
    
    if (!time || !arrival || !type || !price) {
        showToast('Operación cancelada', 'info');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/routes/${encodeURIComponent(routeKey)}/schedules/${scheduleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ time, arrival, type, price })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error actualizando horario');
        }
        
        showToast('Horario actualizado exitosamente', 'success');
        await loadRoutes();
        loadSchedulesForRoute();
        
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Eliminar horario
 */
async function deleteSchedule(routeKey, scheduleId) {
    if (!confirm('¿Eliminar este horario?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/routes/${encodeURIComponent(routeKey)}/schedules/${scheduleId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error eliminando horario');
        }
        
        showToast('Horario eliminado exitosamente', 'success');
        await loadRoutes();
        loadSchedulesForRoute();
        
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Mostrar notificación toast
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.classList.remove('hidden', 'bg-green-500', 'bg-red-500', 'bg-blue-500');
    
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };
    
    toast.classList.add(colors[type] || colors.success);
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

/**
 * Auto-refresh de datos cada 30 segundos
 */
function startAutoRefresh() {
    setInterval(async () => {
        await loadStats();
        await loadTickets();
        
        if (adminState.currentTab === 'tickets') {
            displayTickets();
        } else if (adminState.currentTab === 'reports') {
            loadReports();
        }
    }, 30000);
}

/**
 * Cerrar sesión
 */
function logout() {
    if (confirm('¿Cerrar sesión?')) {
        window.location.href = 'index.html';
    }
}
