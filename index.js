const express = require('express');
const app = express();
app.use(express.json({ limit:'10mb' }));
app.use(express.static('frontend'));

const PORT = process.env.PORT || 3000;

// قاعدة البيانات المؤقتة
let users = {}; // {userId: {name, verified, posts: []}}
let posts = {}; // {postId: {userId, content, comments: [], rating: 0}}
let chat = []; // الدردشة الجماعية
let bannedUsers = []; // حظر المستخدمين
let siteStatus = { online: true }; // تشغيل/اغلاق الموقع

// Middleware لفحص الموقع مغلق
app.use((req,res,next)=>{
  if(!siteStatus.online && !req.url.startsWith('/admin')) 
    return res.send('<h1>الموقع تحت الصيانة</h1>');
  next();
});

// --- واجهة المستخدم ---
app.get('/user', (req,res)=>{
  res.sendFile(__dirname+'/frontend/user.html');
});

// إضافة منشور
app.post('/post', (req,res)=>{
  const { userId, content } = req.body;
  if(bannedUsers.includes(userId)) return res.json({error:'محظور'});
  const postId = Date.now();
  posts[postId] = { userId, content, comments:[], rating:0 };
  if(!users[userId]) users[userId] = {name:'مستخدم'+userId, verified:false, posts:[]};
  users[userId].posts.push(postId);
  res.json({ success:true, postId });
});

// إضافة تعليق
app.post('/comment', (req,res)=>{
  const { postId, userId, comment } = req.body;
  if(!posts[postId]) return res.json({error:'المنشور غير موجود'});
  posts[postId].comments.push({ userId, comment });
  res.json({success:true});
});

// التقييم
app.post('/rate', (req,res)=>{
  const { postId, rating } = req.body;
  if(!posts[postId]) return res.json({error:'المنشور غير موجود'});
  posts[postId].rating += rating;
  res.json({success:true});
});

// الدردشة الجماعية
app.get('/chat', (req,res)=>res.json(chat));
app.post('/chat', (req,res)=>{
  const { userId, message } = req.body;
  chat.push({ userId, message, time: new Date() });
  res.json({success:true});
});

// --- لوحة التحكم ---
app.get('/admin', (req,res)=>{
  res.sendFile(__dirname+'/frontend/admin.html');
});

// تحكم الأدمن: حظر مستخدم
app.post('/admin/ban', (req,res)=>{
  const { userId } = req.body;
  if(!bannedUsers.includes(userId)) bannedUsers.push(userId);
  res.json({success:true});
});

// حذف منشور
app.post('/admin/deletePost', (req,res)=>{
  const { postId } = req.body;
  delete posts[postId];
  res.json({success:true});
});

// حذف تعليق
app.post('/admin/deleteComment', (req,res)=>{
  const { postId, commentIndex } = req.body;
  if(posts[postId]) posts[postId].comments.splice(commentIndex,1);
  res.json({success:true});
});

// وضع علامة تحقق للمستخدم
app.post('/admin/verifyUser', (req,res)=>{
  const { userId } = req.body;
  if(users[userId]) users[userId].verified = true;
  res.json({success:true});
});

// تشغيل/إغلاق الموقع
app.post('/admin/siteStatus', (req,res)=>{
  const { online } = req.body;
  siteStatus.online = online;
  res.json({success:true});
});

app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
