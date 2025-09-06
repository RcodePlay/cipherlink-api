// app.js
import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

// routes
app.post("/register", async (req, res) => {
  const { userId, deviceId, pubkey } = req.body;
  try {
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, pubkey },
    });
    const device = await prisma.device.create({
      data: { id: deviceId, userId: user.id },
    });
    res.json({ ok: true, device });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/send", async (req, res) => {
  const { fromId, toId, ciphertext } = req.body;
  try {
    const msg = await prisma.message.create({
      data: { fromId, toId, ciphertext },
    });
    res.json({ ok: true, msgId: msg.id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/recv", async (req, res) => {
  const { deviceId } = req.body;
  const msgs = await prisma.message.findMany({
    where: { toId: deviceId, read: false },
    orderBy: { sentAt: "asc" },
  });
  res.json(msgs);
});

app.post("/ack", async (req, res) => {
  const { msgId } = req.body;
  await prisma.message.update({
    where: { id: msgId },
    data: { read: true },
  });
  res.json({ ok: true });
});

export default app;
