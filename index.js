const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

let connection = null;
let realViewers = 0;
let simulatedPool = []; // [{id, expiresAt}]

/* تنظيف المحاكاة المنتهية كل 5 ثواني */
setInterval(() => {
  const now = Date.now();
  simulatedPool = simulatedPool.filter(v => v.expiresAt > now);
  io.emit("simulatedCount", simulatedPool.length);
}, 5000);

app.get("/", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Live Monitor PRO</title>
    <style>
      body { background:#111; color:#fff; font-family:Arial; text-align:center; }
      input,button{padding:8px;margin:5px}
      #chat{height:200px;overflow:auto;border:1px solid #333;padding:10px;text-align:left}
    </style>
  </head>
  <body>
    <h2>Live Monitor</h2>

    <input id="username" placeholder="اسم الحساب">
    <button onclick="start()">ابدأ</button>
    <button onclick="stop()">إيقاف</button>

    <h3>
      👀 Real: <span id="real">0</span> |
      🧪 Simulated: <span id="sim">0</span> |
      📊 Total (لوحة فقط): <span id="total">0</span>
    </h3>

    <hr>

    <input id="simCount" type="number" placeholder="عدد للمحاكاة">
    <button onclick="simulate()">إضافة 5 دقائق (محاكاة)</button>

    <div id="chat"></div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
      const socket = io();

      function start(){
        fetch("/start",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            username:document.getElementById("username").value
          })
        });
      }

      function stop(){
        fetch("/stop",{method:"POST"});
      }

      function simulate(){
        fetch("/simulate",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            count:document.getElementById("simCount").value
          })
        });
      }

      let real=0, sim=0;

      socket.on("realViewers", v=>{
        real=v;
        document.getElementById("real").innerText=v;
        updateTotal();
      });

      socket.on("simulatedCount", v=>{
        sim=v;
        document.getElementById("sim").innerText=v;
        updateTotal();
      });

      socket.on("chat", msg=>{
        const div=document.createElement("div");
        div.textContent=msg;
        document.getElementById("chat").appendChild(div);
      });

      function updateTotal(){
        document.getElementById("total").innerText = real + sim;
      }
    </script>
  </body>
  </html>
  `);
});

/* بدء البث */
app.post("/start", async (req,res)=>{
  const username=req.body.username?.replace("@","").trim();
  if(!username) return res.json({error:"اكتب اسم الحساب"});

  if(connection) connection.disconnect();

  connection=new WebcastPushConnection(username);

  try{
    await connection.connect();

    connection.on("roomUser", data=>{
      realViewers=data.viewerCount;
      io.emit("realViewers", realViewers);
    });

    connection.on("chat", data=>{
      io.emit("chat","💬 "+data.nickname+": "+data.comment);
    });

    res.json({status:"connected"});
  }catch{
    res.json({error:"فشل الاتصال"});
  }
});

/* إيقاف */
app.post("/stop",(req,res)=>{
  if(connection){
    connection.disconnect();
    connection=null;
  }
  realViewers=0;
  simulatedPool=[];
  io.emit("realViewers",0);
  io.emit("simulatedCount",0);
  res.json({status:"stopped"});
});

/* إضافة محاكاة 5 دقائق */
app.post("/simulate",(req,res)=>{
  const count=parseInt(req.body.count);
  if(!count || count<=0) return res.json({error:"عدد غير صالح"});

  const expiresAt=Date.now()+5*60*1000;

  for(let i=0;i<count;i++){
    simulatedPool.push({
      id: "sim_"+Math.random().toString(36).slice(2,10),
      expiresAt
    });
  }

  io.emit("simulatedCount", simulatedPool.length);
  res.json({status:"added"});
});

const PORT=3000;
server.listen(PORT,()=>console.log("🔥 Server running"));
