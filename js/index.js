// =======================================================
// CONFIGURACIÓN INICIAL
// =======================================================

const EMAILJS_PUBLIC_KEY = "GOcdoUpm_bVEffTdg"; 
const EMAILJS_SERVICE_ID = "service_u7dpkpq"; 
const EMAILJS_TEMPLATE_ID = "template_devd8ae";

// Inicializar EmailJS
(function() {
    emailjs.init(EMAILJS_PUBLIC_KEY);
})();

// Elementos DOM
const searchForm = document.getElementById('search-form');
const mapContainer = document.getElementById('map-container');
const greetingMessage = document.getElementById('greeting-message');
const lugarInput = document.getElementById('lugar');
const queryDisplay = document.getElementById('query-display');
const barDisplay = document.getElementById('bar-display'); // La barra gris/verde
const statusTitle = document.getElementById('status-title');
const routesUiContainer = document.getElementById('routes-ui-container');
const routesList = document.getElementById('routes-list');
const locationModal = document.getElementById('location-modal');
const btnRetryLocation = document.getElementById('btn-retry-location');

// Variables Globales
let userLatitude;
let userLongitude;
let map; 
let routingControl; 

// =======================================================
// MAPA Y UBICACIÓN
// =======================================================
function initMap() {
    map = L.map('map-container').setView([18.4861, -69.9312], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    getUserLocation();
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLatitude = position.coords.latitude;
                userLongitude = position.coords.longitude;
                locationModal.style.display = 'none';
                map.setView([userLatitude, userLongitude], 15);
                L.marker([userLatitude, userLongitude]).addTo(map).bindPopup('¡Estás aquí!').openPopup();
            },
            (error) => {
                showLocationModal();
            }
        );
    } else {
        // Sustituido alert() por console.error()
        console.error("Tu navegador no soporta la Geolocalización.");
    }
}

function showLocationModal() { locationModal.style.display = 'flex'; }
btnRetryLocation.addEventListener('click', () => {
    locationModal.style.display = 'none';
    getUserLocation();
});

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en km
}

// =======================================================
// BÚSQUEDA Y LÓGICA
// =======================================================
searchForm.addEventListener('submit', function(e) {
    e.preventDefault(); 
    
    // Obtener datos
    const nombre = document.getElementById('nombre').value;
    const correo = document.getElementById('correo').value;
    const lugar = document.getElementById('lugar').value;
    const detalle = document.getElementById('detalle').value; 
    
    // Fallback de ubicación si falla
    const startLat = userLatitude || 18.4861;
    const startLon = userLongitude || -69.9312;
    
    findAndDrawRoute(nombre, correo, lugar, detalle, startLat, startLon);
});

async function findAndDrawRoute(userName, userEmail, searchPlace, optionalDetail, startLat, startLon) {
    
    // Reset UI (Volver a gris)
    statusTitle.textContent = 'Searching...';
    statusTitle.classList.remove('title-found');
    barDisplay.classList.remove('bar-success'); 
    routesUiContainer.style.display = 'none';
    greetingMessage.style.display = 'block';
    greetingMessage.textContent = 'Calculando...';

    // Pedimos 10 resultados para tener un rango local
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchPlace)}&format=json&addressdetails=1&countrycodes=DO&limit=10`;

    try {
        const response = await fetch(geocodeUrl);
        let results = await response.json();
        
        // Limpiar mapa
        if (routingControl) map.removeControl(routingControl);
        map.eachLayer(layer => {
            if (layer instanceof L.Marker && layer.getPopup().getContent() !== '¡Estás aquí!') {
                map.removeLayer(layer);
            }
        });

        if (results && results.length > 0) {
            
            // --- Filtrado por Detalle Opcional ---
            if (optionalDetail && optionalDetail.trim() !== "") {
                const keyword = optionalDetail.toLowerCase();
                const filtered = results.filter(place => 
                    place.display_name.toLowerCase().includes(keyword)
                );
                if (filtered.length > 0) {
                    results = filtered;
                    console.log("Filtro aplicado: ", keyword);
                }
            }

            // Calcular distancias y ordenar
            let places = results.map(place => {
                const lat = parseFloat(place.lat);
                const lon = parseFloat(place.lon);
                return {
                    name: place.display_name.split(',')[0],
                    full_name: place.display_name,
                    lat: lat, lon: lon,
                    distance: calculateDistance(startLat, startLon, lat, lon)
                };
            }).sort((a, b) => a.distance - b.distance);
            
            const closest = places[0]; 
            const furthest = places[places.length - 1]; 
            
            // Cálculo del Punto Medio
            const avgLat = places.reduce((sum, p) => sum + p.lat, 0) / places.length;
            const avgLon = places.reduce((sum, p) => sum + p.lon, 0) / places.length;
            let medianPlace = places.reduce((closestP, currentP) => {
                const distToAvg = calculateDistance(avgLat, avgLon, currentP.lat, currentP.lon);
                if (!closestP || distToAvg < closestP.distToAvg) return { ...currentP, distToAvg };
                return closestP;
            }, null);
            const middle = medianPlace ? medianPlace : places[Math.floor(places.length/2)];

            // --- ACTUALIZAR UI: ÉXITO ---
            statusTitle.textContent = 'Found!';
            statusTitle.classList.add('title-found');
            barDisplay.classList.add('bar-success'); 
            greetingMessage.style.display = 'none';

            // Generar lista de rutas
            routesUiContainer.style.display = 'block';
            routesList.innerHTML = ''; 
            createRouteOption('closest', 'Más Cercano', 'option-green', closest);
            
            if(middle.lat !== closest.lat) createRouteOption('middle', 'Punto Medio', 'option-yellow', middle);
            if(furthest.lat !== closest.lat && furthest.lat !== middle.lat) createRouteOption('furthest', 'Más Lejano (En rango)', 'option-red', furthest);

            // Dibujar la verde por defecto
            selectRoute('closest', 'option-green', closest);

            // --- CORRECCIÓN: Ahora pasamos optionalDetail ---
            sendRealEmail(userName, userEmail, searchPlace, optionalDetail, closest);

        } else {
            statusTitle.textContent = 'Not Found';
            greetingMessage.style.display = 'block';
            greetingMessage.textContent = `No se encontró "${searchPlace}" con ese detalle.`;
        }

    } catch (error) {
        console.error(error);
        statusTitle.textContent = 'Error';
    }
}

// =======================================================
// ENVÍO DE CORREO (EmailJS) - CORREGIDO
// =======================================================
// Acepta 5 argumentos, incluyendo optionalDetail, para poder pasarlo a templateParams
function sendRealEmail(name, email, placeName, optionalDetail, placeData) {
    
    // Preparamos los parámetros que coinciden con tu Template de EmailJS
    const templateParams = {
        to_name: name,
        to_email: email, // ¡Esto asegura que el correo se envía al usuario!
        
        // Datos del formulario
        place_searched: placeName,
        additional_detail: optionalDetail || 'Ninguno especificado', // Campo del detalle opcional
        
        // Datos de la ruta
        best_match: placeData.name,
        distance: placeData.distance.toFixed(2) + " km",
        map_link: `https://www.google.com/maps/search/?api=1&query=${placeData.lat},${placeData.lon}`
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
        .then(function(response) {
            console.log('CORREO ENVIADO CON ÉXITO!', response.status, response.text);
            // Sustituido alert() por console.log()
            console.log(`¡Ruta enviada a ${email}!`);
        }, function(error) {
            console.error('FALLÓ EL ENVÍO...', error);
            // Sustituido alert() por console.error()
            console.error('Error al enviar el correo. Revisa la consola o tu configuración de EmailJS.');
        });
}

// =======================================================
// INTERFAZ DE RUTAS
// =======================================================
function createRouteOption(id, label, colorClass, pointData) {
    const div = document.createElement('div');
    div.className = `route-option ${colorClass}`;
    div.id = `btn-${id}`;
    div.innerHTML = `
        <div class="route-checkbox"></div>
        <div class="route-info"><strong>${label}</strong><br>${pointData.name} (${pointData.distance.toFixed(2)} km)</div>
    `;
    div.addEventListener('click', () => selectRoute(id, colorClass, pointData));
    routesList.appendChild(div);
}

function selectRoute(id, colorClass, pointData) {
    document.querySelectorAll('.route-option').forEach(el => el.classList.remove('active'));
    document.getElementById(`btn-${id}`).classList.add('active');
    
    let colorHex = '#2ecc71'; // verde
    if (colorClass === 'option-yellow') colorHex = '#f1c40f';
    if (colorClass === 'option-red') colorHex = '#e74c3c';

    drawRouteOnMap(pointData.lat, pointData.lon, colorHex);
}

function drawRouteOnMap(destLat, destLon, colorHex) {
    const startLat = userLatitude || 18.4861;
    const startLon = userLongitude || -69.9312;
    if (routingControl) map.removeControl(routingControl);

    routingControl = L.Routing.control({
        waypoints: [ L.latLng(startLat, startLon), L.latLng(destLat, destLon) ],
        routeWhileDragging: false, language: 'es', show: true,
        lineOptions: { styles: [{ color: colorHex, opacity: 0.8, weight: 6 }] },
        createMarker: function(i, wp, nWps) { return L.marker(wp.latLng); }
    }).addTo(map);
}

// Actualización input
lugarInput.addEventListener('input', function() {
    queryDisplay.textContent = lugarInput.value === '' ? '' : lugarInput.value;
});

initMap();