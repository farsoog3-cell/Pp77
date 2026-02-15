const express = require("express");
const { WebcastPushConnection } = require("tiktok-live-connector");

const app = express();
app.use(express.json());

let tiktokConnection = null;
let clients = [];

app.get("/", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>TikTok Live Viewer</title>
    <style>
      body { font-family: Arial; background:#111; color:#fff; text-align:center; }
      input { padding:10px; width:250px; }
      button { padding:10px 20px; cursor:pointer; }
      #log { margin-top:20px; height:400px; overflow:auto; border:1px solid #444; padding:10px; text-align:left; }
    </style>
  </head>
  <body>
    <h2>تحليل بث TikTok مباشر</h2>
    <input id="username" placeholder="ادخل اسم الحساب فقط">
    <button onclick="start()">ابدأ</button>
    <div id="log"></div>

    <script>
      function start() {
        const username = document.getElementById("username").value;
        fetch("/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username })
        });

        const eventSource = new EventSource("/events");
        eventSource.onmessage = function(event) {
          const log = document.getElementById("log");
          log.innerHTML += event.data + "<br>";
          log.scrollTop = log.scrollHeight;
        };
      }
    </script>
  </body>
  </html>
  `);
});

app.post("/start", async (req, res) => {
  const username = req.body.username;

  if (!username) {
    return res.json({ error: "ادخل اسم الحساب" });
  }

  if (tiktokConnection) {
    tiktokConnection.disconnect();
  }

  tiktokConnection = new WebcastPushConnection(username);

  try {
    await tiktokConnection.connect();
    broadcast("✅ تم الاتصال بالبث");

    tiktokConnection.on("roomUser", data => {
      broadcast("👀 المشاهدين الآن: " + data.viewerCount);
    });

    tiktokConnection.on("chat", data => {
      broadcast("💬 " + data.nickname + ": " + data.comment);
    });

  } catch (err) {
    broadcast("❌ البث غير موجود أو غير مباشر");
  }

  res.json({ status: "connecting" });
});

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  clients.push(res);

  req.on("close", () => {
    clients = clients.filter(c => c !== res);
  });
});

function broadcast(message) {
  clients.forEach(client => {
    client.write("data: " + message + "\\n\\n");
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
