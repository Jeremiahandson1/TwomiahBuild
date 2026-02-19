/**
 * Fleet / Vehicle GPS Tracking Service
 * 
 * Track company vehicles:
 * - Real-time location
 * - Trip history
 * - Mileage tracking
 * - Maintenance reminders
 * - Fuel tracking
 * - Driver assignment
 */



// ============================================
// VEHICLES
// ============================================

/**
 * Create vehicle
 */
import { prisma } from '../index.js';
export async function createVehicle(companyId, data) {
  return prisma.vehicle.create({
    data: {
      companyId,
      name: data.name,
      type: data.type || 'truck', // truck, van, car, trailer
      make: data.make,
      model: data.model,
      year: data.year,
      vin: data.vin,
      licensePlate: data.licensePlate,
      color: data.color,
      
      // Mileage
      currentMileage: data.currentMileage || 0,
      
      // Maintenance
      nextOilChangeMiles: data.nextOilChangeMiles,
      nextServiceMiles: data.nextServiceMiles,
      registrationExpires: data.registrationExpires ? new Date(data.registrationExpires) : null,
      insuranceExpires: data.insuranceExpires ? new Date(data.insuranceExpires) : null,
      
      // Assignment
      assignedUserId: data.assignedUserId,
      
      // Tracking device
      gpsDeviceId: data.gpsDeviceId,
      
      status: 'active',
      imageUrl: data.imageUrl,
    },
    include: {
      assignedUser: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

/**
 * Get vehicles
 */
export async function getVehicles(companyId, { status = 'active', assignedUserId } = {}) {
  const where = { companyId };
  if (status) where.status = status;
  if (assignedUserId) where.assignedUserId = assignedUserId;

  return prisma.vehicle.findMany({
    where,
    include: {
      assignedUser: { select: { id: true, firstName: true, lastName: true } },
      currentLocation: true,
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Get single vehicle with details
 */
export async function getVehicle(vehicleId, companyId) {
  return prisma.vehicle.findFirst({
    where: { id: vehicleId, companyId },
    include: {
      assignedUser: true,
      currentLocation: true,
      trips: {
        take: 20,
        orderBy: { startTime: 'desc' },
      },
      maintenanceRecords: {
        take: 10,
        orderBy: { date: 'desc' },
      },
      fuelEntries: {
        take: 10,
        orderBy: { date: 'desc' },
      },
    },
  });
}

/**
 * Update vehicle
 */
export async function updateVehicle(vehicleId, companyId, data) {
  return prisma.vehicle.updateMany({
    where: { id: vehicleId, companyId },
    data,
  });
}

/**
 * Assign vehicle to user
 */
export async function assignVehicle(vehicleId, companyId, userId) {
  return prisma.vehicle.updateMany({
    where: { id: vehicleId, companyId },
    data: { assignedUserId: userId },
  });
}

// ============================================
// LOCATION TRACKING
// ============================================

/**
 * Update vehicle location
 */
export async function updateLocation(vehicleId, companyId, { lat, lng, speed, heading, accuracy }) {
  // Update or create current location
  await prisma.vehicleLocation.upsert({
    where: { vehicleId },
    create: {
      vehicleId,
      lat,
      lng,
      speed,
      heading,
      accuracy,
      timestamp: new Date(),
    },
    update: {
      lat,
      lng,
      speed,
      heading,
      accuracy,
      timestamp: new Date(),
    },
  });

  // Add to location history
  await prisma.vehicleLocationHistory.create({
    data: {
      vehicleId,
      lat,
      lng,
      speed,
      heading,
      accuracy,
      timestamp: new Date(),
    },
  });

  // Check if vehicle is moving - update trip
  if (speed > 5) { // More than 5 mph
    await updateActiveTrip(vehicleId, { lat, lng });
  }

  return { success: true };
}

/**
 * Get vehicle location history
 */
export async function getLocationHistory(vehicleId, companyId, { startDate, endDate } = {}) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, companyId },
  });

  if (!vehicle) throw new Error('Vehicle not found');

  const where = { vehicleId };
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);
  }

  return prisma.vehicleLocationHistory.findMany({
    where,
    orderBy: { timestamp: 'asc' },
    take: 1000, // Limit for performance
  });
}

/**
 * Get all vehicle locations (fleet map)
 */
export async function getFleetLocations(companyId) {
  return prisma.vehicle.findMany({
    where: { companyId, status: 'active' },
    select: {
      id: true,
      name: true,
      licensePlate: true,
      assignedUser: { select: { firstName: true, lastName: true } },
      currentLocation: true,
    },
  });
}

// ============================================
// TRIPS
// ============================================

/**
 * Start a trip
 */
export async function startTrip(vehicleId, companyId, { startLat, startLng, startAddress, userId, jobId }) {
  // End any active trip first
  await endActiveTrips(vehicleId);

  return prisma.vehicleTrip.create({
    data: {
      vehicleId,
      companyId,
      startTime: new Date(),
      startLat,
      startLng,
      startAddress,
      startMileage: await getCurrentMileage(vehicleId),
      status: 'active',
      driverId: userId,
      jobId,
    },
  });
}

/**
 * End a trip
 */
export async function endTrip(tripId, companyId, { endLat, endLng, endAddress, endMileage }) {
  const trip = await prisma.vehicleTrip.findFirst({
    where: { id: tripId, companyId },
  });

  if (!trip) throw new Error('Trip not found');

  const distance = endMileage 
    ? endMileage - trip.startMileage
    : calculateDistance(trip.startLat, trip.startLng, endLat, endLng);

  const duration = Math.round((Date.now() - new Date(trip.startTime).getTime()) / 60000);

  await prisma.vehicleTrip.update({
    where: { id: tripId },
    data: {
      endTime: new Date(),
      endLat,
      endLng,
      endAddress,
      endMileage: endMileage || trip.startMileage + distance,
      distance,
      duration,
      status: 'completed',
    },
  });

  // Update vehicle mileage
  await prisma.vehicle.update({
    where: { id: trip.vehicleId },
    data: { currentMileage: { increment: distance } },
  });

  return trip;
}

async function updateActiveTrip(vehicleId, { lat, lng }) {
  const trip = await prisma.vehicleTrip.findFirst({
    where: { vehicleId, status: 'active' },
  });

  if (!trip) return;

  // Update distance incrementally
  // This is simplified - real implementation would track polyline
}

async function endActiveTrips(vehicleId) {
  const activeTrips = await prisma.vehicleTrip.findMany({
    where: { vehicleId, status: 'active' },
  });

  for (const trip of activeTrips) {
    await prisma.vehicleTrip.update({
      where: { id: trip.id },
      data: {
        status: 'completed',
        endTime: new Date(),
      },
    });
  }
}

async function getCurrentMileage(vehicleId) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { currentMileage: true },
  });
  return vehicle?.currentMileage || 0;
}

/**
 * Get trips
 */
export async function getTrips(companyId, { vehicleId, driverId, startDate, endDate, page = 1, limit = 50 } = {}) {
  const where = { companyId };
  if (vehicleId) where.vehicleId = vehicleId;
  if (driverId) where.driverId = driverId;
  if (startDate || endDate) {
    where.startTime = {};
    if (startDate) where.startTime.gte = new Date(startDate);
    if (endDate) where.startTime.lte = new Date(endDate);
  }

  const [data, total] = await Promise.all([
    prisma.vehicleTrip.findMany({
      where,
      include: {
        vehicle: { select: { id: true, name: true, licensePlate: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
        job: { select: { id: true, title: true, number: true } },
      },
      orderBy: { startTime: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vehicleTrip.count({ where }),
  ]);

  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

// ============================================
// MAINTENANCE
// ============================================

/**
 * Add maintenance record
 */
export async function addMaintenance(vehicleId, companyId, data) {
  const record = await prisma.vehicleMaintenance.create({
    data: {
      vehicleId,
      companyId,
      date: data.date ? new Date(data.date) : new Date(),
      type: data.type, // oil_change, tire_rotation, brake_service, inspection, repair, other
      description: data.description,
      mileage: data.mileage,
      cost: data.cost || 0,
      vendor: data.vendor,
      notes: data.notes,
    },
  });

  // Update vehicle mileage and next service
  const updates = {};
  if (data.mileage) {
    updates.currentMileage = data.mileage;
  }
  if (data.type === 'oil_change') {
    updates.nextOilChangeMiles = (data.mileage || 0) + 5000;
  }

  if (Object.keys(updates).length > 0) {
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: updates,
    });
  }

  return record;
}

/**
 * Get maintenance due
 */
export async function getMaintenanceDue(companyId) {
  const vehicles = await prisma.vehicle.findMany({
    where: { companyId, status: 'active' },
  });

  const due = [];
  const now = new Date();

  for (const v of vehicles) {
    const alerts = [];

    if (v.nextOilChangeMiles && v.currentMileage >= v.nextOilChangeMiles - 500) {
      alerts.push({ type: 'oil_change', message: 'Oil change due soon' });
    }
    if (v.nextServiceMiles && v.currentMileage >= v.nextServiceMiles - 1000) {
      alerts.push({ type: 'service', message: 'Service due soon' });
    }
    if (v.registrationExpires && new Date(v.registrationExpires) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
      alerts.push({ type: 'registration', message: 'Registration expiring' });
    }
    if (v.insuranceExpires && new Date(v.insuranceExpires) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
      alerts.push({ type: 'insurance', message: 'Insurance expiring' });
    }

    if (alerts.length > 0) {
      due.push({ vehicle: v, alerts });
    }
  }

  return due;
}

// ============================================
// FUEL
// ============================================

/**
 * Add fuel entry
 */
export async function addFuelEntry(vehicleId, companyId, data) {
  // Get previous entry to calculate MPG
  const prevEntry = await prisma.vehicleFuel.findFirst({
    where: { vehicleId },
    orderBy: { date: 'desc' },
  });

  let mpg = null;
  if (prevEntry && data.mileage && data.gallons) {
    const milesDriven = data.mileage - prevEntry.mileage;
    mpg = milesDriven / data.gallons;
  }

  const entry = await prisma.vehicleFuel.create({
    data: {
      vehicleId,
      companyId,
      date: data.date ? new Date(data.date) : new Date(),
      gallons: data.gallons,
      pricePerGallon: data.pricePerGallon,
      totalCost: data.gallons * data.pricePerGallon,
      mileage: data.mileage,
      mpg,
      station: data.station,
      notes: data.notes,
    },
  });

  // Update vehicle mileage
  if (data.mileage) {
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { currentMileage: data.mileage },
    });
  }

  return entry;
}

/**
 * Get fuel stats
 */
export async function getFuelStats(vehicleId, companyId, { months = 3 } = {}) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const entries = await prisma.vehicleFuel.findMany({
    where: {
      vehicleId,
      companyId,
      date: { gte: startDate },
    },
    orderBy: { date: 'asc' },
  });

  const totalGallons = entries.reduce((sum, e) => sum + e.gallons, 0);
  const totalCost = entries.reduce((sum, e) => sum + Number(e.totalCost), 0);
  const avgMpg = entries.filter(e => e.mpg).reduce((sum, e, _, arr) => sum + e.mpg / arr.length, 0);

  return {
    entries,
    totalGallons,
    totalCost,
    avgMpg: Math.round(avgMpg * 10) / 10,
    avgPricePerGallon: totalGallons > 0 ? Math.round(totalCost / totalGallons * 100) / 100 : 0,
  };
}

// ============================================
// REPORTS
// ============================================

/**
 * Get fleet stats
 */
export async function getFleetStats(companyId) {
  const [vehicles, trips, fuel] = await Promise.all([
    prisma.vehicle.count({ where: { companyId, status: 'active' } }),
    prisma.vehicleTrip.aggregate({
      where: {
        companyId,
        startTime: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      _sum: { distance: true },
      _count: true,
    }),
    prisma.vehicleFuel.aggregate({
      where: {
        companyId,
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      _sum: { totalCost: true, gallons: true },
    }),
  ]);

  return {
    totalVehicles: vehicles,
    tripsThisMonth: trips._count,
    milesThisMonth: trips._sum.distance || 0,
    fuelCostThisMonth: fuel._sum.totalCost || 0,
    gallonsThisMonth: fuel._sum.gallons || 0,
  };
}

// Helper
function calculateDistance(lat1, lng1, lat2, lng2) {
  // Haversine formula - returns miles
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default {
  createVehicle,
  getVehicles,
  getVehicle,
  updateVehicle,
  assignVehicle,
  updateLocation,
  getLocationHistory,
  getFleetLocations,
  startTrip,
  endTrip,
  getTrips,
  addMaintenance,
  getMaintenanceDue,
  addFuelEntry,
  getFuelStats,
  getFleetStats,
};
