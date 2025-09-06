import request from "supertest";
import app from "../app.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  await prisma.$connect();
  await prisma.user.deleteMany();
  await prisma.device.deleteMany();
  await prisma.message.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Cipherlink API", () => {
  const userId = "user1";
  const deviceId = "dev1";
  const pubkey = "fake_pubkey";

  test("Register a device", async () => {
    const res = await request(app)
      .post("/register")
      .send({ userId, deviceId, pubkey });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.device.id).toBe(deviceId);
  });

  test("Send a message", async () => {
    // first register another device
    await request(app).post("/register").send({
      userId: "user2",
      deviceId: "dev2",
      pubkey: "fake_pubkey2",
    });

    const res = await request(app)
      .post("/send")
      .send({ fromId: deviceId, toId: "dev2", ciphertext: "encrypted_msg" });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.msgId).toBeDefined();
  });

  test("Receive unread messages", async () => {
    const res = await request(app).post("/recv").send({ deviceId: "dev2" });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].ciphertext).toBe("encrypted_msg");
  });

  test("Ack (mark as read)", async () => {
    const msgs = await request(app).post("/recv").send({ deviceId: "dev2" });
    const msgId = msgs.body[0].id;

    const res = await request(app).post("/ack").send({ msgId });
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);

    const msgsAfter = await request(app)
      .post("/recv")
      .send({ deviceId: "dev2" });
    expect(msgsAfter.body.length).toBe(0);
  });
});
