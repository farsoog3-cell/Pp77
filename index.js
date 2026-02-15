const express = require('express');
const app = express();

// تحديد البورت حسب متغير البيئة الذي توفره Render
const PORT = process.env.PORT || 3000;

// راوت رئيسي
app.get('/', (req, res) => {
  res.send('مرحباً! السيرفر يعمل على Render 🚀');
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
