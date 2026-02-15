const express = require("express");
const app = express();

app.use(express.json());

app.post("/api", (req, res) => {
  console.log("Received:", req.body);

  res.json({
    status: "success",
    data: req.body
  });
});

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server started on port " + PORT);
});
