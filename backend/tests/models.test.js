import { describe, it, expect } from "vitest";
import User from "../models/User.js";
import Car from "../models/Car.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";

describe("User Model", () => {
  it("creates a user with required fields", async () => {
    const user = await User.create({
      googleId: "test-google-id",
      email: "test@example.com",
      name: "Test User",
    });
    expect(user.googleId).toBe("test-google-id");
    expect(user.email).toBe("test@example.com");
    expect(user.role).toBe("user");
  });

  it("enforces unique googleId", async () => {
    await User.create({ googleId: "dup-id", email: "a@test.com", name: "A" });
    await expect(
      User.create({ googleId: "dup-id", email: "b@test.com", name: "B" })
    ).rejects.toThrow();
  });
});

describe("Car Model", () => {
  it("creates a car listing with defaults", async () => {
    const car = await Car.create({
      title: "Test Car",
      brand: "Toyota",
      model: "Camry",
      year: 2020,
      price: 500000,
      fuelType: "Petrol",
      transmission: "Automatic",
      kilometersDriven: 30000,
      description: "A test car listing",
      location: "Chennai",
      city: "Chennai",
      ownerId: "owner-123",
      ownerEmail: "owner@test.com",
      ownerName: "Owner",
      rcDocument: { publicId: "test-rc-doc" },
    });
    expect(car.status).toBe("approved");
    expect(car.featured).toBe(false);
  });
});

describe("Message Model", () => {
  it("creates a message with optional image", async () => {
    const msg = await Message.create({
      threadId: "000000000000000000000001",
      senderId: "user-1",
      senderName: "User One",
      text: "Hello",
      readBy: ["user-1"],
    });
    expect(msg.text).toBe("Hello");
    expect(msg.image.url).toBe("");
  });
});

describe("Notification Model", () => {
  it("creates a notification", async () => {
    const notif = await Notification.create({
      recipientId: "user-1",
      type: "application_approved",
      title: "Approved",
      message: "Your application was approved",
    });
    expect(notif.read).toBe(false);
    expect(notif.recipientId).toBe("user-1");
  });
});
