import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";



dotenv.config();

const app = express();
const prisma = new PrismaClient();



// helper: remove sensitive fields before returning user data

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}


app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "fallbacksecret";

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

// ---------------------
// USERS CRUD
// ---------------------

// Create user (staff/admin/customer)
app.post("/users", async (req, res) => {
  try {
    const { salonId, name, email, phone, role, password, commissionRate } = req.body;

    // basic validation
    if (!salonId || !name || !email || !role || !password) {
      return res.status(400).json({ error: "salonId, name, email, role and password are required" });
    }

    // hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // create user
    const newUser = await prisma.user.create({
      data: {
        salonId,
        name,
        email,
        phone: phone || null,
        role,
        passwordHash,
        commissionRate: commissionRate ?? 0,
      },
    });

    // return user without passwordHash
    const created = await prisma.user.findUnique({
      where: { id: newUser.id },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        salonId: true, commissionRate: true, createdAt: true, updatedAt: true
      }
    });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    // handle unique constraint (email/phone) error from Prisma
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "A user with that email or phone already exists." });
    }
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Get all users (optionally filter by salonId ?salonId=2)
app.get("/users", async (req, res) => {
  try {
    const { salonId } = req.query;
    const where = {};
    if (salonId) where.salonId = parseInt(salonId);

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        salonId: true, commissionRate: true, createdAt: true, updatedAt: true
      },
      orderBy: { id: "asc" }
    });

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get single user by id
app.get("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        salonId: true, commissionRate: true, createdAt: true, updatedAt: true
      }
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Update user (partial update allowed)
app.put("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, phone, role, password, salonId, commissionRate } = req.body;

    // build update object dynamically
    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (role !== undefined) data.role = role;
    if (salonId !== undefined) data.salonId = salonId;
    if (commissionRate !== undefined) data.commissionRate = commissionRate;

    // if password provided -> hash it
    if (password !== undefined) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data
    });

    // fetch safe user
    const safe = await prisma.user.findUnique({
      where: { id: updated.id },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        salonId: true, commissionRate: true, createdAt: true, updatedAt: true
      }
    });

    res.json(safe);
  } catch (err) {
    console.error(err);
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Email or phone already in use." });
    }
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete a user
app.delete("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ------------------ LOGIN ROUTE ------------------
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // 3. Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role }, // payload
      JWT_SECRET,                           // secret
      { expiresIn: "1h" }                   // token expiry
    );

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

// ------------------ MIDDLEWARE ------------------

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; // attach decoded user data
    next();
  });
}

// ------------------ PROTECTED ROUTE ------------------
app.get("/users", authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Create payment
app.post("/payments", authMiddleware, async (req, res) => {
  try {
    const { appointmentId, amount, method, status } = req.body;

    if (!appointmentId || !amount || !method) {
      return res.status(400).json({ error: "appointmentId, amount, and method are required" });
    }

    const payment = await prisma.payment.create({
      data: {
        appointmentId,
        amount,
        method,
        status: status || "pending",
      },
    });

    res.json(payment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create payment" });
  }
});
// Get all payments
app.get("/payments", authMiddleware, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: { appointment: true },
    });
    res.json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// Get payment by ID
app.get("/payments/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(id) },
      include: { appointment: true, salon: true },
    });

    if (!payment) return res.status(404).json({ error: "Payment not found" });

    res.json(payment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch payment" });
  }
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

