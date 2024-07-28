const dotenv = require("dotenv");
dotenv.config();  // Load environment variables from .env file

const multer = require("multer");
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const File = require("./models/File");

const app = express();
const upload = multer({ dest: "uploads" });

// Log environment variables for debugging purposes
console.log("DB_URL:", process.env.DB_URL);
console.log("PORT:", process.env.PORT);

// Connect to MongoDB
mongoose.connect(process.env.DB_URL)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch(err => {
    console.error("Error connecting to MongoDB:", err.message);
  });

// Set EJS as the templating engine
app.set("view engine", "ejs");

// Middleware for parsing form data
app.use(express.urlencoded({ extended: true }));

// Middleware for serving static files
app.use(express.static('uploads'));

// Define routes
app.get('/', (req, res) => {
  res.render("index");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const fileData = {
      path: req.file.path,
      originalName: req.file.originalname,
    };

    if (req.body.password != null && req.body.password !== "") {
      fileData.password = await bcrypt.hash(req.body.password, 10);
    }

    const file = await File.create(fileData);
    res.render("index", { fileLink: `${req.headers.origin}/file/${file.id}` });

  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.route("/file/:id").get(handleDownload).post(handleDownload);

async function handleDownload(req, res) {
  const file = await File.findById(req.params.id);

  if (!file) {
    return res.status(404).send("File not found");
  }

  if (file.password != null) {
    if (req.body.password == null) {
      return res.render("password");
    }

    if (!(await bcrypt.compare(req.body.password, file.password))) {
      return res.render("password", { error: true });
    }
  }

  file.downloadCount++;
  await file.save();
  console.log(file.downloadCount);

  res.download(file.path, file.originalName);
}

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
