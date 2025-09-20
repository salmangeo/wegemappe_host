// Initialize the map
const map = L.map('map').setView([49.013995, 8.404420], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Initialize draggable markers for start and end points
let startMarker = L.marker([49.012255, 8.386279], { draggable: true }).addTo(map).bindPopup('Start Point').openPopup();
let endMarker = L.marker([49.009432, 8.406766], { draggable: true }).addTo(map).bindPopup('End Point').openPopup();

let routeLayer = null; // To store the current route layer
let petrolPumpMarkers = []; // To store the petrol pump markers
let shortestDistance = []; //To store shortest distance from table request of petrol pumps

// Update route based on markers
function updateRoute() {
    const start = startMarker.getLatLng();
    const end = endMarker.getLatLng();
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (routeLayer) map.removeLayer(routeLayer); // Remove previous route
            if (data.routes && data.routes.length > 0) {
                routeLayer = L.geoJSON(data.routes[0].geometry).addTo(map);
                map.fitBounds(routeLayer.getBounds());
                showRouteDistance(data.routes[0].distance); // Show distance of the first route
                findNearbyPetrolPumps(routeLayer.getBounds()); // Find petrol stations along the route
            } else {
                alert("No route found!");
            }
        })
        .catch(error => console.error("Error fetching route:", error));
}


// Show route distance on the map (in kilometers)
function showRouteDistance(distance) {
    const distanceInKm = (distance / 1000).toFixed(2);
    const distancePopup = L.popup()
        .setLatLng(routeLayer.getBounds().getCenter())
        .setContent(`Distance: ${distanceInKm} km`)
        .openOn(map);
}

// Geo-coding function to place markers based on address input
function geocodeAddress(address, isStartPoint = true) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                if (isStartPoint) {
                    startMarker.setLatLng([lat, lon]);
                    map.setView([lat, lon], 13);
                } else {
                    endMarker.setLatLng([lat, lon]);
                    map.setView([lat, lon], 13);
                }
                updateRoute(); // Update the route after moving the marker
            } else {
                alert("Address not found!");
            }
        })
        .catch(error => console.error("Error during geocoding:", error));
}

// Event listeners for the buttons
document.getElementById("set-start").addEventListener("click", () => {
    const address = document.getElementById("address-input").value;
    geocodeAddress(address, true);
});

document.getElementById("set-end").addEventListener("click", () => {
    const address = document.getElementById("address-input").value;
    geocodeAddress(address, false);
});

document.getElementById("calculate-route").addEventListener("click", updateRoute);

// Reset the map
document.getElementById("reset-map").addEventListener("click", () => {
    map.setView([49.013995, 8.404420], 13);
    startMarker.setLatLng([49.012255, 8.386279]);
    endMarker.setLatLng([49.009432, 8.406766]);
    if (routeLayer) map.removeLayer(routeLayer);
    petrolPumpMarkers.forEach(marker => map.removeLayer(marker));
    petrolPumpMarkers = [];
});

//function that returns column index of min column sum of distance table, then used to get min distance pump
function findMinColumnIndex(matrix) {
    if (!Array.isArray(matrix) || matrix.length === 0 || !Array.isArray(matrix[0])) {
        throw new Error("Invalid matrix");
    }

    const numRows = matrix.length;
    const numCols = matrix[0].length;

    // Calculate the sum of each column
    const columnSums = Array(numCols).fill(0);
    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            columnSums[col] += matrix[row][col];
        }
    }

    // Find the minimum value greater than 0, excluding the first two columns
    let minSum = Infinity;
    let minIndex = -1;

    for (let col = 2; col < numCols; col++) { // Start from column 2 to skip the first two columns
        if (columnSums[col] > 0 && columnSums[col] < minSum) {
            minSum = columnSums[col];
            minIndex = col;
        }
    }

    return minIndex; // Return the index of the column, or -1 if no valid column is found
};

//Short pump route TESTER BUTTON
document.getElementById("test-shortpumprouter").addEventListener("click", async () => {

    const [start, pump, end] = await shortestDistancePump(startMarker, endMarker, petrolPumpMarkers);
    console.log(`the array is ${[start, pump, end]}`);
    });


//Table request for getting shortest distance pump
document.getElementById("optimize-pump-route").addEventListener("click", () => {
    shortestDistancePump(startMarker,endMarker,petrolPumpMarkers);
    });

async function shortestDistancePump(startMarker, endMarker, petrolPumpMarkers) {
    const start = startMarker.getLatLng();
    const end = endMarker.getLatLng();
    let pump = {};

    const arrayline = [start, end];
    console.log("shortestDistancePump called with " + petrolPumpMarkers.length + " pumps");
    petrolPumpMarkers.forEach(marker => arrayline.push(marker.getLatLng()));

    console.log("Arrayline next:");
    console.log(arrayline);

    let str = arrayline.map(point => `${point.lng},${point.lat}`).join(";");
    const distanceTableUrl = `https://router.project-osrm.org/table/v1/driving/${str}?sources=0;1&annotations=distance`;

    try {
        const distanceResponse = await fetch(distanceTableUrl);
        const distanceData = await distanceResponse.json();
        console.log("data.distances Next:");
        console.log(distanceData.distances);

        const index = findMinColumnIndex(distanceData.distances);
        console.log("index NEXT:");
        console.log(index);

        pump = distanceData.destinations[index].location;
        pump = L.latLng(pump[1],pump[0])

        const routeUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${pump.lng},${pump.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

        const routeResponse = await fetch(routeUrl);
        const routeData = await routeResponse.json();

        if (routeData.routes && routeData.routes.length > 0) {
            routeLayer = L.geoJSON(routeData.routes[0].geometry).addTo(map);
            showRouteDistance(routeData.routes[0].distance);

            // Return start, pump, and end
            return [start, pump, end];
        } else {
            alert("No route found!");
            return [start, null, end];
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        return [start, null, end]; // Handle failure gracefully
    }
}



    

//This function assumes you are starting trip with a full tank
async function minimize_Distance_pumps(maxFuel, minFuelLimit, efficiency) {
    if (maxFuel === "" || minFuelLimit === "" || efficiency === "") {
        alert("All fields must be filled");
        throw new Error("Inputs missing");
    }

    const autonomy = maxFuel * efficiency; // Vehicle autonomy in Km
    minFuelLimit = minFuelLimit / 100; // Convert to decimal
    const start = startMarker.getLatLng();
    const end = endMarker.getLatLng();
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

    let results = []; // Array to collect concatenated results

    try {
        const routeResponse = await fetch(url);
        const data = await routeResponse.json();

        if (routeLayer) map.removeLayer(routeLayer); // Remove previous route

        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0].geometry;
            const totalDistance = turf.length(route); // Total distance of trip
            console.log(`Total distance: ${totalDistance} Km`);
            console.log(`Max Fuel: ${maxFuel} L`);
            console.log(`Fuel limit: ${minFuelLimit * 100}%`);
            console.log(`Efficiency: ${efficiency} Km/L`);
            console.log(`Autonomy: ${autonomy} Km`);

            const tripSegments = Math.floor(totalDistance / autonomy); // Number of trip segments
            console.log(`Trip segments: ${tripSegments}`);

            if (tripSegments < 1) {
                alert("No pump needed for this trip!");
                throw new Error("No pump needed");
            }

            const searchRadius = autonomy * minFuelLimit * 1000;

            for (let i = 0; i < tripSegments; i++) {
                const entryPumpSearchDistance =
                    autonomy * (i + 1) - (minFuelLimit + minFuelLimit / 2) * maxFuel * efficiency;
                const exitPumpSearchDistance =
                    autonomy * (i + 1) - (minFuelLimit - minFuelLimit / 2) * maxFuel * efficiency;

                console.log(`Search range: ${entryPumpSearchDistance} - ${exitPumpSearchDistance}`);

                const entryToPumpSearchArea = turf.along(route, entryPumpSearchDistance);
                const exitFromPumpSearchArea = turf.along(route, exitPumpSearchDistance);

                const Lentry = L.geoJSON(entryToPumpSearchArea);
                const Lexit = L.geoJSON(exitFromPumpSearchArea);

                const entrypointLeaflet = L.latLng(Lentry.getBounds().getCenter().lat, Lentry.getBounds().getCenter().lng);
                const exitpointLeaflet = L.latLng(Lexit.getBounds().getCenter().lat, Lexit.getBounds().getCenter().lng);

                const bounds = L.latLngBounds(entrypointLeaflet, exitpointLeaflet);

                const ini = L.marker(entrypointLeaflet).addTo(map);
                const fin = L.marker(exitpointLeaflet).addTo(map);

                try {
                    const petrolPumps = await findNearbyPetrolPumps(bounds, searchRadius);
                    console.log("Found petrol pumps, routing after this line");

                    const shortestDistanceResults = await shortestDistancePump(ini, fin, petrolPumpMarkers);
                    const uni_pump = shortestDistanceResults[2];
                    const marker = L.marker([uni_pump.lat, uni_pump.lng], {
                        icon: L.icon({
                            iconUrl: 'chosen-fuel-icon.png', // Path to your fuel icon image
                            iconSize: [32, 32],
                                    })
                    }).addTo(map);

                    // Concatenate the results into the results array
                    results = results.concat(shortestDistanceResults);
                } catch (error) {
                    console.error("Error finding nearby petrol pumps or routing:", error);
                }
            }

            // Add startMarker and endMarker to the results
            results.unshift(startMarker.getLatLng()); // Add startMarker as the first element
            results.push(endMarker.getLatLng()); // Add endMarker as the last element

            return results; // Return concatenated results
        } else {
            alert("No route found!");
            return results; // Return empty array if no route is found
        }
    } catch (error) {
        console.error("Error fetching route:", error);
        return results; // Return empty array in case of errors
    }
}

//Long trip form and function
document.getElementById("LongTripForm").addEventListener("submit", async function(event){
    event.preventDefault();
    const maxFuel = document.getElementById("maxFuel").value;
    console.log(maxFuel);
    const minFuelLimit = document.getElementById("minFuelLimit").value;
    console.log(minFuelLimit);
    const efficiency = document.getElementById("efficiency").value;
    console.log(efficiency);

    const results = await minimize_Distance_pumps(maxFuel, minFuelLimit, efficiency);
    console.log(`the final array route is: ${results}`)

    let str = results.map(point => `${point.lng},${point.lat}`).join(";");
    const finalrouteUrl = `https://router.project-osrm.org/route/v1/driving/${str}?overview=full&geometries=geojson`;
    const finalrouteResponse = await fetch(finalrouteUrl);
        const routeData = await finalrouteResponse.json();

        if (routeData.routes && routeData.routes.length > 0) {
            routeLayer = L.geoJSON(routeData.routes[0].geometry).addTo(map);
            showRouteDistance(routeData.routes[0].distance);} else {
                alert("No route found!");}

});


//location
function showAllPoints() {
    const url = "http://localhost:8080/geoserver/wegemappe/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=wegemappe:gas_locations&outputFormat=application/json&srsName=EPSG:4326";

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            if (!response.headers.get("content-type").includes("application/json")) {
                throw new Error("Invalid content type. Expected application/json.");
            }
            return response.json();
        })
        .then(data => {
            if (!data || !data.features) throw new Error("Invalid GeoJSON data.");

            L.geoJSON(data, {
                onEachFeature: function (feature, layer) {
                    // 使用 feature.id 来绑定弹出框内容
                    const id = feature.id || "Unnamed ID";
                    layer.bindPopup(`Gas Station ID: ${id}`);
                }
            }).addTo(map);
        })
        .catch(error => {
            console.error("Error loading GeoServer data:", error);
            alert("Failed to load GeoServer data.");
        });
}



// 初始化
updateInputFields();
showAllPoints();