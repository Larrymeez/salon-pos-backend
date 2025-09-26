import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Salon POS API is running!");
});

// GET all salons
app.get("/salons", async (req, res) => {
  try {
    const salons = await prisma.salon.findMany();
    res.json(salons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch salons" });
  }
});

// POST create a new salon
app.post("/salons", async (req, res) => {
  try {
    const { name, location, phone } = req.body;

    // Basic validation
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const newSalon = await prisma.salon.create({
      data: {
        name,
        location: location || null,
        phone: phone || null,
      },
    });

    res.status(201).json(newSalon);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create salon" });
  }
});

import bcrypt from "bcrypt";

// POST create a new staff user
app.post("/users", async (req, res) => {
  try {
    const { name, email, phone, role, password, salonId, commissionRate } = req.body;

    // Basic validation
    if (!name || !email || !password || !role || !salonId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        role,
        salonId,
        passwordHash,
        commissionRate: commissionRate || 0,
      },
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// POST create a new appointment
app.post("/appointments", async (req, res) => {
  try {
    const {
      salonId,
      staffId,
      serviceId,
      customerName,
      customerPhone,
      appointmentTime,
      status,
      paymentStatus
    } = req.body;

    // Basic validation
    if (!salonId || !customerName) {
      return res.status(400).json({ error: "Salon ID and customer name are required" });
    }

    // Create appointment
    const newAppointment = await prisma.appointment.create({
      data: {
        salonId,
        staffId: staffId || null, // optional
        serviceId: serviceId || null, // optional
        customerName,
        customerPhone: customerPhone || null,
        appointmentTime: appointmentTime ? new Date(appointmentTime) : null,
        status: status || "scheduled",
        paymentStatus: paymentStatus || "unpaid",
      },
    });

    res.status(201).json(newAppointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create appointment" });
  }
});
// ========================
// SERVICES ROUTES
// ========================

// Create a new service
app.post("/services", async (req, res) => {
  try {
    const { salonId, name, description, price, durationMin } = req.body;
    const service = await prisma.service.create({
      data: { salonId, name, description, price, durationMin },
    });
    res.json(service);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create service" });
  }
});

// Get all services
app.get("/services", async (req, res) => {
  try {
    const services = await prisma.service.findMany();
    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

// Get a single service by ID
app.get("/services/:id", async (req, res) => {
  try {
    const service = await prisma.service.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!service) return res.status(404).json({ error: "Service not found" });
    res.json(service);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch service" });
  }
});

// Update a service
// Update a service (partial update allowed)
app.put('/services/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, durationMin } = req.body;

  try {
    // Build updateData dynamically so only provided fields are updated
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (durationMin !== undefined) updateData.durationMin = durationMin;

    const updatedService = await prisma.service.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json(updatedService);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Delete a service
app.delete("/services/:id", async (req, res) => {
  try {
    await prisma.service.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Service deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete service" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

