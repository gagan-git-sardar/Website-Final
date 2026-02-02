// Data Cache
let boroughData = {};

// Configuration
const MAP_CENTER = [51.505, -0.09];
const MAP_ZOOM_DEFAULT = 10;
const MAP_ZOOM_SELECTED = 12;
const MAP_ZOOM_THRESHOLD = 11; // Explicit threshold

// State
let currentYear = 2025;
let currentType = 'all'; // 'all', 'detached', 'semi', 'terraced', 'flat'
let maxPrice = 5000000;
let currentMode = 'price'; // 'price', 'crime', 'central', 'culture'
let geoJsonLayer;
let map;

// DOM Elements
const priceDisplay = document.getElementById('price-display');
const priceRange = document.getElementById('price-range');
const yearSelect = document.getElementById('year-select');
const typeSelect = document.getElementById('type-select');
const detailsPanel = document.getElementById('borough-details');
const legendContent = document.getElementById('legend-content');
const modeButtons = document.querySelectorAll('.mode-btn');

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    initMap();
    initControls();
    await loadData();
});

function initMap() {
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView(MAP_CENTER, MAP_ZOOM_DEFAULT);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
}

function initControls() {
    // Populate Years
    const years = Array.from({ length: 12 }, (_, i) => 2015 + i); // 2015 to 2026
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.text = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    });

    // Event Listeners
    priceRange.addEventListener('input', (e) => {
        maxPrice = parseInt(e.target.value);
        priceDisplay.textContent = `£${maxPrice.toLocaleString()}+`;
        updateMapVisuals();
    });

    yearSelect.addEventListener('change', (e) => {
        currentYear = parseInt(e.target.value);
        updateMapVisuals();
    });

    typeSelect.addEventListener('change', (e) => {
        currentType = e.target.value;
        updateMapVisuals();
    });

    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            updateMapVisuals();
            updateLegend();
        });
    });
}

// Layer Storage
let boroughLayer;
let postcodeLayer;
let currentZoom = MAP_ZOOM_DEFAULT;

// Data Cache
let realPropertyData = {};

async function loadData() {
    try {
        const [boroughRes, postcodeRes, realDataRes] = await Promise.all([
            fetch('london_boroughs.geojson'),
            fetch('london_postcodes.geojson'),
            fetch('london_data.json').then(res => res.ok ? res.json() : null).catch(() => null)
        ]);

        const boroughDataJson = await boroughRes.json();
        const postcodeDataJson = await postcodeRes.json();

        if (realDataRes) {
            realPropertyData = realDataRes;
            console.log("Loaded real data for", Object.keys(realPropertyData).length, "postcodes");
        }

        // Generate data for Boroughs
        boroughDataJson.features.forEach(feature => {
            const name = feature.properties.name;
            if (name && !boroughData[name]) {
                boroughData[name] = getCombinedData(name);
            }
        });

        // Generate data for Postcodes
        postcodeDataJson.features.forEach(feature => {
            const name = feature.properties.name;
            if (name && !boroughData[name]) {
                boroughData[name] = getCombinedData(name);
            }
        });

        // Create Borough Layer (Default Visible)
        boroughLayer = L.geoJSON(boroughDataJson, {
            style: styleBorough,
            onEachFeature: onEachBorough
        }).addTo(map);

        // Add Borough Labels
        boroughDataJson.features.forEach(feature => {
            if (feature.properties && feature.properties.name) {
                const layer = L.geoJSON(feature);
                const center = layer.getBounds().getCenter();
                L.marker(center, {
                    icon: L.divIcon({
                        className: 'borough-label',
                        html: feature.properties.name,
                        iconSize: [80, 20],
                        iconAnchor: [40, 10]
                    }),
                    interactive: false
                }).addTo(boroughLayer);
            }
        });

        // Create Postcode Layer (Hidden initially)
        postcodeLayer = L.geoJSON(postcodeDataJson, {
            style: stylePostcode,
            onEachFeature: onEachPostcode
        });

        // Add zoomed listener to toggle layers
        map.on('zoomend', handleZoomChange);

        updateLegend();
    } catch (error) {
        console.error('Error loading GeoJSON or Data:', error);
        alert('Failed to load map data. Please ensure you are running a local server.');
    }
}

function getCombinedData(name) {
    // Check if we have real data
    if (realPropertyData[name]) {
        const real = realPropertyData[name];
        // Mock the other metrics that are missing from CSV
        const mock = getMockData(name);

        return {
            prices: real.prices, // Use REAL prices
            crime: mock.crime,
            central: mock.central,
            culture: mock.culture,
            summary: `Real Market Data: ${name} (Source: CSV)`
        };
    }

    // Fallback to full mock
    return getMockData(name);
}

function handleZoomChange() {
    const zoom = map.getZoom();
    currentZoom = zoom;

    if (zoom >= MAP_ZOOM_SELECTED - 1) {
        // Show postcodes, hide boroughs
        if (map.hasLayer(boroughLayer)) map.removeLayer(boroughLayer);

        if (!map.hasLayer(postcodeLayer)) {
            postcodeLayer.addTo(map);
            // Add Postcode Labels by ensuring they are added to map
            postcodeLayer.eachLayer(layer => {
                if (layer.feature.properties.labelMarker) {
                    layer.feature.properties.labelMarker.addTo(map);
                }
            });
        }
    } else {
        // Show boroughs, hide postcodes
        if (map.hasLayer(postcodeLayer)) {
            map.removeLayer(postcodeLayer);
            // Remove Postcode Labels
            postcodeLayer.eachLayer(layer => {
                if (layer.feature.properties.labelMarker) {
                    map.removeLayer(layer.feature.properties.labelMarker);
                }
            });
        }

        if (!map.hasLayer(boroughLayer)) boroughLayer.addTo(map);
    }
}

// Styling Functions
// Styling Functions
let activeBoroughGeometry = null;

function styleBorough(feature) {
    // Focus Mode: If a borough is active...
    if (activeBoroughGeometry) {
        // ...and this IS the active borough
        if (feature === activeBoroughGeometry) {
            // Make it transparent so postcodes show through strictly
            return {
                fillColor: 'transparent',
                weight: 2,
                opacity: 1,
                color: '#666', // Keep border visible? Or hide? Let's keep border for context
                fillOpacity: 0,
                interactive: false // Let clicks pass through to postcodes
            };
        }
        // ...and this is NOT the active borough
        else {
            // Make it "colorless" (Grey)
            return {
                fillColor: '#f5f5f5',
                weight: 1,
                opacity: 1,
                color: '#ddd',
                fillOpacity: 0.5, // Light grey background
                interactive: false // Disable interaction on faded areas? Or allow to switch focus? Let's disable for focus.
            };
        }
    }

    // Default Mode (No focus)
    return getFeatureStyle(feature, 0.8, 2, 'white', 0.6);
}

function stylePostcode(feature) {
    // Only used when zoomed in
    let opacity = 0.8;

    // Strict Focus Mode for Postcodes
    if (activeBoroughGeometry && typeof turf !== 'undefined') {
        const center = turf.center(feature);
        const isInside = turf.booleanPointInPolygon(center, activeBoroughGeometry);

        if (!isInside) {
            // Hide postcodes outside the selection
            return {
                fillColor: 'transparent',
                weight: 0,
                opacity: 0,
                color: 'transparent',
                fillOpacity: 0,
                interactive: false
            };
        } else {
            // Show focused postcodes with thicker white borders
            return getFeatureStyle(feature, 0.9, 1.5, '#fff', 0.9);
        }
    }

    // Fallback if no specific focus (should vary rarely happen if logic is tight)
    return getFeatureStyle(feature, 0.9, 1, '#eee', 0.8);
}

function getFeatureStyle(feature, defaultOpacity, weight, borderColor, fillOp) {
    let countDebug = 0;
    const name = feature.properties.name;
    const data = boroughData[name];

    if (!data) return {
        fillColor: '#ccc',
        weight: weight,
        opacity: 1,
        color: borderColor,
        fillOpacity: 0.2
    };

    let color = '#ccc';
    let opacity = fillOp;
    let value = 0;

    if (currentMode === 'price') {
        // Calculate value based on year and type
        const prices = data.prices[currentYear];

        if (prices) {
            if (currentYear === 2026 && countDebug < 5) {
                console.log(`Debug 2026 [${name}]:`, prices);
                countDebug++;
            }
            if (currentType === 'all') {
                // Calculate average of all types present
                const values = Object.values(prices);
                value = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            } else {
                value = prices[currentType] || 0;
            }
        }

        if (value > maxPrice) {
            // Do not hide, just use max color or darker?
            // User feedback implies they want to see everything
            color = '#431407'; // Max Dark Color
        } else {
            color = getPriceColor(value);
        }
    } else if (currentMode === 'crime') {
        color = getCrimeColor(data.crime);
    } else if (currentMode === 'central') {
        color = getCentralColor(data.central);
    } else if (currentMode === 'culture') {
        color = getCultureColor(data.culture);
    }

    return {
        fillColor: color,
        weight: weight,
        opacity: 1,
        color: borderColor,
        dashArray: '',
        fillOpacity: opacity
    };
}

// Interactions
function onEachBorough(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetBoroughHighlight,
        click: (e) => {
            // Set Active Borough for Focus Mode
            activeBoroughGeometry = feature;

            // Use fitBounds to ensure the whole borough is visible and centered
            map.fitBounds(e.target.getBounds(), { padding: [20, 20] });

            // Force redraw of postcodes
            if (postcodeLayer) postcodeLayer.setStyle(stylePostcode);
            updatePostcodeLabels();
        }
    });
}

function onEachPostcode(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetPostcodeHighlight,
        click: (e) => {
            updateSidebar(e.target.feature.properties);
        }
    });

    // Bind tooltip for postcode labels to show on hover (or permanent if desired)
    // For this request, we are using the 'map-label' markers added in loadData, 
    // but the previous loadData logic for labels needs to be adapted for the toggle.
    // Let's attach the label to the layer for easier management.
    const center = layer.getBounds().getCenter();
    const label = L.marker(center, {
        icon: L.divIcon({
            className: 'map-label',
            html: feature.properties.name,
            iconSize: [40, 20],
            iconAnchor: [20, 10]
        }),
        interactive: false
    });

    // Add label to layer group? No, Leaflet doesn't strictly support adding markers to a GeoJSON layer group easily like this.
    // We will stick to adding them to the map in the zoom handler.
    // Hack: Store label on the feature for easy access
    feature.properties.labelMarker = label;
}

function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
        weight: 3,
        color: '#666',
        fillOpacity: 0.9
    });
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
}

function resetBoroughHighlight(e) {
    boroughLayer.resetStyle(e.target);
}

function resetPostcodeHighlight(e) {
    postcodeLayer.resetStyle(e.target);
}

function getAveragePrice(data) {
    const yearData = data.prices[currentYear];
    if (currentType === 'all') {
        // Average of available types
        const values = Object.values(yearData);
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    return yearData[currentType] || 0;
}

function getPriceColor(price) {
    // Scales: <300k to >1.5M - More distinct orange/red scale
    return price > 1500000 ? '#431407' : // Very Dark (almost black-brown)
        price > 1200000 ? '#7c2d12' : // Dark Brown/Red
            price > 1000000 ? '#c2410c' : // Deep Orange
                price > 800000 ? '#ea580c' : // Orange
                    price > 600000 ? '#f97316' : // Bright Orange
                        price > 450000 ? '#fb923c' : // Light Orange
                            price > 300000 ? '#fdba74' : // Very Light Orange
                                '#fed7aa';   // Pale Orange
}

function getCrimeColor(value) {
    return getScaleColor(value, [255, 255, 255], [220, 38, 38]); // White to Red
}

function getCentralColor(value) {
    return getScaleColor(value, [255, 255, 255], [37, 99, 235]); // White to Blue
}

function getCultureColor(value) {
    return getScaleColor(value, [255, 255, 255], [217, 119, 6]); // White to Orange
}

function getScaleColor(value, startRGB, endRGB) {
    // value 0 to 1
    const r = Math.round(startRGB[0] + (endRGB[0] - startRGB[0]) * value);
    const g = Math.round(startRGB[1] + (endRGB[1] - startRGB[1]) * value);
    const b = Math.round(startRGB[2] + (endRGB[2] - startRGB[2]) * value);
    return `rgb(${r}, ${g}, ${b})`;
}

// Interactions
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
}

function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
        weight: 3,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.9
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
}

function resetHighlight(e) {
    geoJsonLayer.resetStyle(e.target);
}

function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
    updateSidebar(e.target.feature.properties);
}

function updateMapVisuals() {
    if (boroughLayer) boroughLayer.setStyle(styleBorough);
    if (postcodeLayer) postcodeLayer.setStyle(stylePostcode);
}

function updateSidebar(props) {
    const name = props.name;
    const data = boroughData[name];

    if (!data) return;

    const detailsPanel = document.getElementById('borough-details');

    // Calculate current price
    const prices = data.prices[currentYear];
    let currentPrice = 0;

    if (prices) {
        if (currentType === 'all') {
            const values = Object.values(prices);
            currentPrice = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        } else {
            currentPrice = prices[currentType] || 0;
        }
    }

    currentPrice = Math.round(currentPrice); // Ensure distinct integer for display

    detailsPanel.innerHTML = `
        <h3>${name}</h3>
        <p class="summary">${data.summary}</p>
        
        <div class="detail-stat">
            <span>Avg Price (${currentYear})</span>
            <span>£${currentPrice ? currentPrice.toLocaleString() : 'N/A'}</span>
        </div>
    <div class="detail-stat">
        <span>Crime Rate</span>
        <span class="${getScoreClass(data.crime)}">${(data.crime * 100).toFixed(0)}/100</span>
    </div>
    <div class="detail-stat">
        <span>Central Proximity</span>
        <span class="${getScoreClass(data.central)}">${(data.central * 100).toFixed(0)}/100</span>
    </div>
    <div class="detail-stat">
        <span>Cultural Score</span>
        <span class="${getScoreClass(data.culture)}">${(data.culture * 100).toFixed(0)}/100</span>
    </div>
`;
}

function getScoreClass(val) {
    if (val > 0.7) return 'stat-high';
    if (val > 0.4) return 'stat-med';
    return 'stat-low';
}

function getScoreText(val) {
    if (val > 0.7) return 'High';
    if (val > 0.4) return 'Medium';
    return 'Low';
}

function updateLegend() {
    let html = '';
    if (currentMode === 'price') {
        const grades = [0, 400000, 500000, 600000, 800000, 1000000, 1200000, 1500000];
        const labels = ['< £400k', '£400k+', '£500k+', '£600k+', '£800k+', '£1M+', '£1.2M+', '> £1.5M'];

        for (let i = 0; i < grades.length; i++) {
            const nextPrice = grades[i + 1] || 10000000;
            const price = grades[i] + 1;
            html += `
            <div class="legend-item">
                <div class="legend-color" style="background:${getPriceColor(price)}"></div>
                <span>${labels[i]}</span>
            </div>
        `;
        }
    } else {
        const colors = currentMode === 'crime' ? ['white', '#dc2626']
            : currentMode === 'central' ? ['white', '#2563eb']
                : ['white', '#d97706']; // culture

        html += `
        <div class="legend-item">
            <div class="legend-color" style="background:linear-gradient(to right, ${colors[0]}, ${colors[1]})"></div>
            <span>Low to High</span>
        </div>
    `;
    }
    legendContent.innerHTML = html;
}
