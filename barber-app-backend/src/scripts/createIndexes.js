require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("🟢 Conectado a MongoDB");
  } catch (err) {
    console.error("❌ Error al conectar a MongoDB:", err);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    console.log("📊 Creando índices para optimización...");

    // Índices para Bookings
    await db.collection('bookings').createIndex({ barber: 1, date: 1 });
    await db.collection('bookings').createIndex({ user: 1, date: 1 });
    await db.collection('bookings').createIndex({ barbershop: 1, date: 1 });
    await db.collection('bookings').createIndex({ startTime: 1, endTime: 1 });
    await db.collection('bookings').createIndex({ status: 1, date: 1 });
    await db.collection('bookings').createIndex({ createdAt: -1 });
    console.log("✅ Índices de Bookings creados");

    // Índices para Users
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ barbershop: 1 });
    console.log("✅ Índices de Users creados");

    // Índices para Barbershops
    await db.collection('barbershops').createIndex({ owner: 1 });
    await db.collection('barbershops').createIndex({ isActive: 1 });
    await db.collection('barbershops').createIndex({ 
      name: 'text', 
      address: 'text', 
      description: 'text' 
    });
    console.log("✅ Índices de Barbershops creados");

    // Índices para AvailabilityBlocks
    await db.collection('availabilityblocks').createIndex({ barber: 1, start: 1, end: 1 });
    await db.collection('availabilityblocks').createIndex({ appliesToAllBarbers: 1, start: 1, end: 1 });
    await db.collection('availabilityblocks').createIndex({ start: 1, end: 1 });
    await db.collection('availabilityblocks').createIndex({ createdBy: 1 });
    console.log("✅ Índices de AvailabilityBlocks creados");

    // Listar todos los índices
    console.log("\n📋 Índices existentes:");
    const collections = ['bookings', 'users', 'barbershops', 'availabilityblocks'];
    
    for (const collection of collections) {
      const indexes = await db.collection(collection).indexes();
      console.log(`\n${collection.toUpperCase()}:`);
      indexes.forEach(index => {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      });
    }

    console.log("\n🎉 Todos los índices han sido creados exitosamente!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error al crear índices:", err);
    process.exit(1);
  }
};

connectDB().then(createIndexes);
