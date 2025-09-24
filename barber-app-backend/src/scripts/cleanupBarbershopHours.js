const mongoose = require('mongoose');
const Barbershop = require('../models/Barbershop'); // Ajusta la ruta si es necesario

const MONGO_URI = 'mongodb://localhost:27017/barberApp'; // Cambia por tu URI real

const cleanUpOldHourFields = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Conectado a MongoDB');

    const result = await Barbershop.updateMany(
      {},
      { $unset: { openHour: "", closeHour: "" } }
    );

    console.log(`Se eliminaron los campos openHour/closeHour antiguos de ${result.modifiedCount} barberías`);
  } catch (error) {
    console.error('Error limpiando los campos:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
};

cleanUpOldHourFields();