// Log the found petrol pumps to the console for debugging
function logPetrolPumpData(petrolPumps) {
    console.log(`Found ${petrolPumps.length} petrol pump(s) nearby.`);
    petrolPumps.forEach((pump, index) => {
        console.log(`Petrol Pump ${index + 1}: ${pump.lat}, ${pump.lon}, Name: ${pump.tags.name || 'Unknown'}`);
    });
}