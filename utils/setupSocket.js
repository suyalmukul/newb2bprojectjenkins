// /**************************************************************************** */
// const express = require("express");
// const http = require("http");
// const colors = require("colors");
// const socketIO = require("socket.io");
// let io;

// exports.setupSocket = (server) => {
//   //   const app = express();
//   //   const server = http.createServer(app);
//   io = socketIO(server, {
//     cors: {
//       origin: "*",
//       methods: ["GET", "POST"],
//     },
//   });
//     // socket.on('fiber', (data) => {
//     //   console.log('Received fiber event:', data);
//     //   socket.emit('fiber', data);
//     // });
//     io.on("connection", (socket) => {
//       const userId = socket.handshake.query.userId; // Assuming userId is sent on connection
//       if (userId) {
//         userSockets.set(userId, socket.id);
//       }

//     /*******************************************************/

//     socket.on("sampletesting", (data) => {
//       console.log(colors.cyan("data add Successfully", data));
//       io.sockets.emit("gettingTesting", data);
//       console.log(colors.cyan("data get Successfully", data));

//     });

//     // socket.on("clientData", (data) => {
//     //   console.log(data);
//     // })

//     socket.on("message", (data) => {
//       console.log(colors.cyan("data add Successfully", data));
//       io.sockets.emit("gettingMessage", data);
//       console.log(colors.cyan("data get Successfully", data));

//     });

//     /********************************************************/

//     socket.on('disconnect', () => {
//       console.log(colors.blue('A user disconnected'));
//     });
//   });

//   socket.on("disconnect", () => {
//     userSockets.delete(userId);
//   });

// }

// module.exports.getIO = function () {
//   return io;
// };

const socketIO = require("socket.io");
const colors = require("colors");

let io;
const userSockets = new Map(); // Store userId -> socketId mapping

exports.setupSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(colors.green("New user connected:", socket.id));
    // Capture user ID from query params
    const userId = socket.handshake.query.user_id;
    if (userId) {
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
      console.log(
        colors.yellow(`User ${userId} connected with socket ID: ${socket.id}`)
      );
    }

    // Event: Sample Testing
    socket.on("sampletesting", (data) => {
      console.log(colors.cyan("Data added successfully:", data));
      io.to(socket.id).emit("gettingTesting", data);
      console.log(colors.cyan("Data sent successfully:", data));
    });

    // Event: Messaging
    socket.on("message", (data) => {
      console.log(colors.magenta("Message received:", data));
      io.to(socket.id).emit("gettingMessage", data);
      console.log(colors.magenta("Message sent successfully:", data));
    });
    socket.on("join-store", ({ storeId, role }) => {
      socket.join(`${storeId}_${role}`);
      console.log(`storeId ${role} joined room ${storeId}_${role}`);
    });
    socket.on("customer-join", ({ orderId, customerId }) => {
      if (!customerId) {
        socket.emit("error", { message: "Invalid order or customer details" });
        return;
      }
      socket.join(`order_${orderId}`);
      socket.join(`${customerId}`);
      console.log(`Customer ${customerId} joined room order_${orderId}`);
      socket.emit("joined", { role: "customer", orderId });
      socket.emit("joined customer", { role: "customer", customerId });
    });
    socket.on("superadmin-join", async ({ superadmin_id }) => {
      if (!superadmin_id) {
        socket.emit("error", { message: "Invalid superadmin_id" });
        return;
      }
      socket.join(`superadmin_L100`);
      socket.emit("joined", { role: "superadmin", superadmin_id });
    });
    socket.on("update-order", ({ orderId, updateData }) => {
      if (!orderId) {
        socket.emit("error", { message: "Missing orderId or status" });
        return;
      }

      console.log("Order Update:", updateData);

      io.to(`order_${orderId}`).emit("order-update", updateData);

      io.to("superadmin_L100").emit("order-update", updateData);
    });
    socket.on("orders-update", ({ customerId, updateData }) => {
      if (!orderId) {
        socket.emit("error", { message: "Missing orderId or status" });
        return;
      }

      console.log("Order Update:", updateData);

      io.to(`${customerId}`).emit("orders-update", updateData);

      io.to("superadmin_L100").emit("order-update", updateData);
    });
    socket.on("disconnect", () => {
      console.log(colors.blue(`User disconnected: ${socket.id}`));
      if (userId) {
        const sockets = userSockets.get(userId);
        sockets?.delete(socket.id);
        if (sockets?.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });
};

// Function to get the Socket.IO instance
exports.getIO = () => io;

// Function to get user socket ID
exports.getUserSocketId = (userId) => userSockets.get(userId);

exports.emitToStore = (storeId, role, event, data) => {
  console.log({ storeId, role, event, data });
  io.to(`${storeId}_${role}`).emit(event, data);
};
