// Find nearby petrol pumps along the route using Overpass API


function rank_optimize() {
    // Retrieve the selected values
    var commute_c = document.getElementById('commuteType').value;
    var priority_ride = document.getElementById('ridePriority').value;

    // Reference the "priority-token" input field
    var other = document.getElementById('priority-token');

    // Variables to hold descriptive values
    let commuteDescription = "";
    let priorityDescription = "";

    // Determine commute type and assign a value
    switch (commute_c) {
        case 'commute_nearby':
            commuteDescription = "City Ride Selected";
            commute_c = "nearby_commute_value"; // Assign the actual value here
            break;
        case 'commute_long':
            commuteDescription = "Vacations Selected";
            commute_c = "long_commute_value"; // Assign the actual value here
            break;
        default:
            commuteDescription = "Country Side";
            commute_c = "default_commute_value"; // Assign the actual value here
    }

    // Determine priority ride and assign a value
    switch (priority_ride) {
        case 'priority_cheap':
            priorityDescription = "Near Starting Point";
            priority_ride = "cheap_priority_value"; // Assign the actual value here
            break;
        case 'priority_short_route':
            priorityDescription = "Near End Point";
            priority_ride = "short_route_priority_value"; // Assign the actual value here
            break;
        case 'priority_elite':
            priorityDescription = "Middle";
            priority_ride = "elite_priority_value"; // Assign the actual value here
            break;
        default:
            priorityDescription = "Brand";
            priority_ride = "default_priority_value"; // Assign the actual value here
    }

    // Combine the commute and priority descriptions for output
    let result = commuteDescription + " - " + priorityDescription;

    // Output the result to the "priority-token" input field
    other.value = result;

    // Log for debugging
    console.log("Commute Type Value: " + commute_c);
    console.log("Priority Value: " + priority_ride);
    console.log("Result: " + result);

    return [commute_c, priority_ride]
}

const [a,b] = rank_optimize()
console.log([a,b])



function findNearbyPetrolPumps(bounds, around=5000) {
    // Clear existing markers
    petrolPumpMarkers.forEach(marker => map.removeLayer(marker));
    petrolPumpMarkers = [];

     // Get commute and priority values from rank_optimize
     const [commute_c, priority_ride] = rank_optimize();

     // Define the condition based on commute and priority
     let searchLocation; // To determine the focus of the search
 
     if (commute_c === "nearby_commute_value" && priority_ride === "cheap_priority_value") {
         searchLocation = "start"; // Condition A: Start finding petrol station near the starting point
     } else if (commute_c === "nearby_commute_value" && priority_ride === "short_route_priority_value") {
         searchLocation = "middle"; // Condition B: Start finding petrol station in the middle
     } else if (commute_c === "nearby_commute_value" && priority_ride === "elite_priority_value") {
         searchLocation = "end"; // Condition C: Start finding petrol station at the end
     } else {
         searchLocation = "default"; // Default condition
     }
 
     console.log("Search Location:", searchLocation);
 
     // Determine the coordinates based on the search location
     let targetLat, targetLng;
 
     switch (searchLocation) {
         case "start":
             targetLat = bounds.getSouthWest().lat;
             targetLng = bounds.getSouthWest().lng;
             break;
         case "middle":
             targetLat = (bounds.getSouthWest().lat + bounds.getNorthEast().lat) / 2;
             targetLng = (bounds.getSouthWest().lng + bounds.getNorthEast().lng) / 2;
             break;
         case "end":
             targetLat = bounds.getNorthEast().lat;
             targetLng = bounds.getNorthEast().lng;
             break;
         default:
             targetLat = (bounds.getSouthWest().lat + bounds.getNorthEast().lat) / 2;
             targetLng = (bounds.getSouthWest().lng + bounds.getNorthEast().lng) / 2;
     }
 
    
    
    
    //const sw = bounds.getSouthWest();
    //const ne = bounds.getNorthEast();
   
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(node["amenity"="fuel"](around:${around},${targetLat},${targetLng}););out;`;

    //const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(node["amenity"="fuel"](around:${around},${(sw.lat + ne.lat) / 2},${(sw.lng + ne.lng) / 2}););out;`;

    return fetch(overpassUrl)
        .then(response => response.json())
        .then(data => {
            if (data && data.elements.length > 0) {
                data.elements.forEach(pump => {
                    const lat = pump.lat;
                    const lon = pump.lon;
                    const marker = L.marker([lat, lon], {
                        icon: L.icon({
                            iconUrl: 'fuel-icon.png', // Path to your fuel icon image
                            iconSize: [32, 32],
                        })
                    }).addTo(map);
                    //marker.bindPopup(`Petrol Pump: ${pump.tags.name || 'Unknown'}`).openPopup();
                    petrolPumpMarkers.push(marker);
                    
                    //console.log(data.elements);
                    //console.log(data.elements[0]);
                    //console.log(data.elements.length);
                });
                console.log(data);
            } else {
                alert("No petrol pumps found nearby.");
            }
        })
        .catch(error => console.error("Error fetching petrol pumps:", error));
}

