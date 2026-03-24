const path = require("path");
const { randomUUID } = require("crypto");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const { sequelize } = require("../config/db");
const { Barbershop, User } = require("../models");

const DEFAULT_SERVICES_TEMPLATE = [
  {
    name: "Corte",
    description: "Corte clásico de cabello",
    price: 150,
    duration: 30,
    category: "haircut",
    isActive: true,
    isRequired: false,
  },
  {
    name: "Barba",
    description: "Perfilado y arreglo de barba",
    price: 120,
    duration: 20,
    category: "beard",
    isActive: true,
    isRequired: false,
  },
  {
    name: "Corte + Barba",
    description: "Servicio combinado de corte y barba",
    price: 220,
    duration: 45,
    category: "haircut",
    isActive: true,
    isRequired: false,
  },
];

const normalizeService = (service) => {
  const id = service.id || service._id || randomUUID();
  return {
    id,
    _id: id,
    name: service.name || "Servicio",
    description: service.description || "",
    price: Number.isFinite(Number(service.price)) ? Number(service.price) : 0,
    duration: Number.isFinite(Number(service.duration))
      ? Number(service.duration)
      : 30,
    category: service.category || "other",
    isActive: service.isActive !== undefined ? !!service.isActive : true,
    isRequired: service.isRequired !== undefined ? !!service.isRequired : false,
  };
};

const buildDefaultServices = () =>
  DEFAULT_SERVICES_TEMPLATE.map((service) => normalizeService(service));

const run = async () => {
  const summary = {
    shopsWithInsertedDefaults: 0,
    shopsWithNormalizedServices: 0,
    barbersUpdatedCustomPrices: 0,
    customPriceEntriesInserted: 0,
  };

  try {
    await sequelize.authenticate();
    console.log("✅ Conectado a la base de datos");

    const barbershops = await Barbershop.findAll();
    const shopServiceMap = new Map();

    for (const shop of barbershops) {
      const currentServices = Array.isArray(shop.services) ? shop.services : [];
      let changed = false;
      let services;

      if (currentServices.length === 0) {
        services = buildDefaultServices();
        changed = true;
        summary.shopsWithInsertedDefaults += 1;
      } else {
        services = currentServices.map((service) => {
          const normalized = normalizeService(service);
          if (
            normalized.id !== service.id ||
            normalized._id !== service._id ||
            normalized.name !== service.name ||
            normalized.description !== (service.description || "") ||
            normalized.price !== Number(service.price) ||
            normalized.duration !== Number(service.duration) ||
            normalized.category !== (service.category || "other") ||
            normalized.isActive !==
              (service.isActive !== undefined ? !!service.isActive : true) ||
            normalized.isRequired !==
              (service.isRequired !== undefined ? !!service.isRequired : false)
          ) {
            changed = true;
          }
          return normalized;
        });
      }

      if (changed) {
        shop.services = services;
        await shop.save();
        if (currentServices.length > 0) {
          summary.shopsWithNormalizedServices += 1;
        }
      }

      shopServiceMap.set(shop.id, services || currentServices);
    }

    const barbers = await User.findAll({ where: { role: "barber" } });

    for (const barber of barbers) {
      if (!barber.barbershopId) continue;
      const services = shopServiceMap.get(barber.barbershopId);
      if (!Array.isArray(services) || services.length === 0) continue;

      const currentCustomPrices =
        barber.customPrices && typeof barber.customPrices === "object"
          ? { ...barber.customPrices }
          : {};
      let changed = false;

      for (const service of services) {
        const serviceId = service.id || service._id;
        if (!serviceId) continue;

        if (!currentCustomPrices[serviceId]) {
          currentCustomPrices[serviceId] = {
            price: service.price,
            isActive: true,
          };
          summary.customPriceEntriesInserted += 1;
          changed = true;
          continue;
        }

        const current = currentCustomPrices[serviceId];
        const normalizedCurrent = {
          price: Number.isFinite(Number(current.price))
            ? Number(current.price)
            : service.price,
          isActive:
            current.isActive !== undefined ? !!current.isActive : true,
        };

        if (
          normalizedCurrent.price !== current.price ||
          normalizedCurrent.isActive !== current.isActive
        ) {
          currentCustomPrices[serviceId] = normalizedCurrent;
          changed = true;
        }
      }

      if (changed) {
        barber.customPrices = currentCustomPrices;
        await barber.save();
        summary.barbersUpdatedCustomPrices += 1;
      }
    }

    console.log("✅ Backfill completado");
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  } catch (error) {
    console.error("❌ Error en backfill de servicios:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

if (require.main === module) {
  run();
}

module.exports = run;
