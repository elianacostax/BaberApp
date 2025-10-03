const mongoose = require('mongoose');
require('dotenv').config();

const Barbershop = require('../models/Barbershop');

// Conectar a MongoDB usando la misma configuración que el servidor
const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
    console.error('❌ MONGO_URI no está definida en las variables de entorno');
    process.exit(1);
}

const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

mongoose.connect(mongoURI, options);

async function addLocationToBarbershops() {
    try {
        console.log('🔍 Buscando barberías sin campo location...');
        
        const barbershops = await Barbershop.find({ location: { $exists: false } });
        
        if (barbershops.length === 0) {
            console.log('✅ Todas las barberías ya tienen el campo location');
            return;
        }
        
        console.log(`📊 Encontradas ${barbershops.length} barberías sin location`);
        
        // Agregar location basado en la dirección
        for (const barbershop of barbershops) {
            let location = 'Ciudad Principal'; // Valor por defecto
            
            // Intentar extraer ciudad de la dirección
            if (barbershop.address) {
                const addressParts = barbershop.address.split(',');
                if (addressParts.length > 1) {
                    location = addressParts[addressParts.length - 1].trim();
                } else {
                    // Si no hay comas, usar la dirección completa
                    location = barbershop.address;
                }
            }
            
            barbershop.location = location;
            await barbershop.save();
            
            console.log(`✅ Actualizada barbería: ${barbershop.name} -> ${location}`);
        }
        
        console.log('🎉 Todas las barberías han sido actualizadas con el campo location');
        
    } catch (error) {
        console.error('❌ Error al actualizar barberías:', error);
    } finally {
        mongoose.connection.close();
    }
}

addLocationToBarbershops();
