import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "DreamCar API",
      version: "1.0.0",
      description: "API documentation for the DreamCar used car marketplace",
      contact: { name: "DreamCar Team" },
    },
    servers: [
      { url: "/api", description: "API base" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
        Car: {
          type: "object",
          properties: {
            _id: { type: "string" },
            title: { type: "string" },
            brand: { type: "string" },
            model: { type: "string" },
            year: { type: "number" },
            price: { type: "number" },
            fuelType: { type: "string" },
            transmission: { type: "string" },
            kilometersDriven: { type: "number" },
            location: { type: "string" },
            city: { type: "string" },
            status: { type: "string", enum: ["approved", "pending", "rejected"] },
            images: { type: "array", items: { type: "object", properties: { url: { type: "string" } } } },
          },
        },
        User: {
          type: "object",
          properties: {
            googleId: { type: "string" },
            email: { type: "string" },
            name: { type: "string" },
            role: { type: "string", enum: ["user", "admin", "inspector"] },
          },
        },
        MessageThread: {
          type: "object",
          properties: {
            _id: { type: "string" },
            carTitle: { type: "string" },
            participant: { type: "object" },
            lastMessageAt: { type: "string", format: "date-time" },
            unreadCount: { type: "number" },
          },
        },
        Notification: {
          type: "object",
          properties: {
            _id: { type: "string" },
            type: { type: "string" },
            title: { type: "string" },
            message: { type: "string" },
            read: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Cars", description: "Car listings CRUD" },
      { name: "Messages", description: "Chat and messaging" },
      { name: "Inspections", description: "Vehicle inspection flow" },
      { name: "Payments", description: "Payment processing" },
      { name: "Users", description: "User profile management" },
      { name: "Notifications", description: "In-app notifications" },
      { name: "Admin", description: "Admin operations" },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
