const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

/* تخزين كل البثوث */
const liveRooms = {};

/* إنشاء بث */
app.post("/start", async (req, res) => {
  const username = req.body.username?.replace("@","").trim();
  if (!username) return res.json({ error: "اكتب اسم الحساب" });

  if (liveRooms[username]) {
    return res.json({ error: "البث يعمل بالفعل" });
  }

  const connection = new WebcastPushConnection(username);

  const stats = {
    viewers: 0,
    likes: 0,
    diamonds: 0,
    chatCount: 0,
    gifts: 0,
    startTime: Date.now()
  };

  try {
    await connection.connect();

    liveRooms[username] = { connection, stats };

    /* أحداث البث */
    connection.on("roomUser", data => {
      stats.viewers = data.viewerCount;
      io.to(username).emit("viewers", stats.viewers);
    });

    connection.on("like", data => {
      stats.likes = data.totalLikeCount;
      io.to(username).emit("likes", stats.likes);
    });

    connection.on("chat", data => {
      stats.chatCount++;
      io.to(username).emit("chat", `💬 ${data.nickname}: ${data.comment}`);
    });

    connection.on("gift", data => {
      if (data.repeatEnd) {
        stats.gifts++;
        stats.diamonds += data.diamondCount || 0;
        io.to(username).emit("gift",
          `🎁 ${data.nickname} أرسل ${data.giftName} (${data.diamondCount || 0} 💎)`
        );
      }
    });

    connection.on("disconnected", () => {
      io.to(username).emit("system", "❌ تم قطع الاتصال");
    });

    res.json({ status: "connected" });

  } catch (err) {
    res.json({ error: "فشل الاتصال أو الحساب غير مباشر" });
  }
});

/* إيقاف بث */
app.post("/stop", (req, res) => {
  const username = req.body.username;
  if (!liveRooms[username]) {
    return res.json({ error: "لا يوجد بث بهذا الاسم" });
  }

  liveRooms[username].connection.disconnect();
  delete liveRooms[username];

  io.to(username).emit("system", "⛔ تم إيقاف البث");

  res.json({ status: "stopped" });
});

/* API للإحصائيات */
app.get("/stats/:username", (req, res) => {
  const room = liveRooms[req.params.username];
  if (!room) return res.json({ error: "غير متصل" });

  res.json(room.stats);
});

/* WebSocket */
io.on("connection", socket => {
  socket.on("join", username => {
    socket.join(username);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🔥 PRO Server running on port " + PORT);
});
