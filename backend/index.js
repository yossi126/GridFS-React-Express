const express = require("express");
const bodyParser = require("body-parser");
const logger = require("morgan");
const dotenv = require("dotenv");
const connectDB = require("./db/config");
const mongoose = require("mongoose");
const { upload } = require("./utils/upload");
// const path = require("path");
dotenv.config();

const app = express();

// Connect to database
connectDB();

// Connect to MongoDB GridFS bucket using mongoose
let bucket;
(() => {
  mongoose.connection.on("connected", () => {
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "filesBucket",
    });
  });
})();

// Middleware for parsing request body and logging requests
app.use(bodyParser.json());
app.use(logger("dev"));

// Routes for API endpoints
// Upload a single file
app.post("/upload/file", upload().single("file"), async (req, res) => {
  try {
    res.status(201).json({ text: "File uploaded successfully !" });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: { text: "Unable to upload the file", error },
    });
  }
});

// Upload multiple files
app.post("/upload/files", upload().array("files"), async (req, res) => {
  try {
    res.status(201).json({ text: "Files uploaded successfully !" });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: { text: `Unable to upload files`, error },
    });
  }
});

// Download a file by id
app.get("/download/file/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;

    // Find the file in the GridFS bucket
    const file = await bucket
      .find({ _id: new mongoose.Types.ObjectId(fileId) })
      .toArray();

    if (!file || file.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }
    // const filename = file[0].filename;
    // const extension = path.extname(filename);
    // const contentType = getContentType(extension);
    // console.log(filename);

    // Set the appropriate headers for the response
    const sanitizedFilename = encodeURIComponent(file[0].filename);
    res.set({
      "Content-Type": file[0].contentType,
      "Content-Disposition": `attachment; filename="${sanitizedFilename}"`,
    });

    // Create a readable stream from the GridFS file and pipe it to the response
    const downloadStream = bucket.openDownloadStream(
      new mongoose.Types.ObjectId(fileId)
    );
    downloadStream.pipe(res);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// function getContentType(extension) {
//   switch (extension) {
//     case ".jpg":
//     case ".jpeg":
//       return "image/jpeg";
//     case ".png":
//       return "image/png";
//     case ".pdf":
//       return "application/pdf";
//     case ".txt":
//       return "text/plain";
//     default:
//       return "application/octet-stream";
//   }
// }

// Server listening on port 3000 for incoming requests
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
