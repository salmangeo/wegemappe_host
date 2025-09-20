//This function assumes you are starting trip with a full tank
function minimize_Distance_pumps(maxFuel,minFuelLimit,efficiency){

    var autonomy = (maxFuel)*efficiency; //autonomy of vehicle (how far it can drive) in Km
    const start = startMarker.getLatLng();
    const end = endMarker.getLatLng();
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (routeLayer) map.removeLayer(routeLayer); // Remove previous route
            if (data.routes && data.routes.length > 0) {
                routeLayer = L.geoJSON(data.routes[0].geometry);
                //or delete &geometries=geojson and return polyline, then convert through Polyline.toGeoJSON()
                //polyline = data.routes[0]
                //var lineString = polyline.toGeoJSON();
                var totalDistance = turf.lineDistance(routeLayer); //give total distance of trip
                var tripSegments = totalDistance/autonomy; //number of segments of trip, each segment between searchPoints from which pumps are searched in a radius
                //var searchPoints = {"type":"FeatureCollection","features":[]};
                var searchPoints = [];
                var pumps = [];

                
                for(let i = 0;i<tripSegments;i++){
                    //fix to use along point, otherwise think of another way
                    var along = turf.along(routeLayer,autonomy*(i+1)); //gets point along 'routeLayer' at an 'autonomy*(i+1)' distance from start point 
                    var entryPumpSearchDistance = autonomy - (minFuelLimit+minFuelLimit/2)*maxFuel*efficiency;
                    var exitPumpSearchDistance = autonomy - (minFuelLimit-minFuelLimit/2)*maxFuel*efficiency
                    var entryToPumpSearchArea = turf.along(routeLayer,entryPumpSearchDistance);
                    var exitFromPumpSearchArea = turf.along(routeLayer,exitPumpSearchDistance);
                    var bounds = turf.bbox(turf.featureCollection([entryToPumpSearchArea,exitFromPumpSearchArea]));
                    //transform bounds to leaflet geojson
                    var searchRadius = (autonomy*0.15);
                    findNearbyPetrolPumps(bounds,searchRadius);//search around for pumps
                    //transform entryToPumpSearchArea to leaflet point LentryPumpAreaPoint
                    //transform exitFromPumpSearchArea to leaflet point LexitPumpAreaPoint
                    //save leaflet points on an array
                    shortestDistancePump(LentryPumpAreaPoint,LexitPumpAreaPoint); //this will draw the route
                    //keep pump, this should return startpointsearcharea, endpointsearcharea and the pump

                    


                    
                }
                
                
            } else {
                alert("No route found!");
            }
        })
        .catch(error => console.error("Error fetching route:", error));


};