

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

let connection = null;

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("start", async (username) => {
    if (!username) {
      return socket.emit("errorMessage", "❌ أدخل اسم الحساب");
    }

    try {
      if (connection) connection.disconnect();

      connection = new WebcastPushConnection(username);
      await connection.connect();

      socket.emit("status", "✅ متصل بالبث");

      connection.on("roomUser", data => {
        socket.emit("viewers", data.viewerCount);
      });

      connection.on("chat", data => {
        socket.emit("chat", {
          nickname: data.nickname,
          comment: data.comment
        });
      });

    } catch (err) {
      socket.emit("errorMessage", "❌ الحساب غير مباشر أو فشل الاتصال");
    }
  });

  socket.on("stop", () => {
    if (connection) {
      connection.disconnect();
      connection = null;
    }
    socket.emit("status", "⛔ تم الإيقاف");
  });

  socket.on("disconnect", () => {
    if (connection) {
      connection.disconnect();
      connection = null;
    }
    console.log("User disconnected");
  });
});

server.listen(3000, () => console.log("Server running"));
