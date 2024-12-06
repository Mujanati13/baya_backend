const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require('path');
const { log } = require("debug/src/browser");
const fs = require('fs').promises;

// Custom error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors (file size, etc.)
    return res.status(400).json({ 
      error: 'File upload error', 
      details: err.message 
    });
  } else if (err) {
    // Other errors (file type, etc.)
    return res.status(400).json({ 
      error: 'Upload failed', 
      details: err.message 
    });
  }
  next();
};

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.resolve('uploads');
    try {
      // Ensure uploads directory exists
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images are allowed."));
    }
  },
});

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Image upload endpoint
router.post("/upload", 
  upload.single("image"),
  handleMulterError,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    res.json({
      message: "Image uploaded successfully",
      imageUrl: imageUrl,
    });
}));

// CRUD operations with improved error handling
router.post("/", asyncHandler(async (req, res) => {
  const { Nom, Description, Prix, Promotion, ancienPrix, photo, Quantite, Visible, ID_CAT } = req.body;
  console.log("req.body", req.body);
  (req.body);
  if (!Nom || !Prix) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql = `
    INSERT INTO Article (Nom, Description, Prix, Promotion, AncienPrix, Photo, Quantite, Visible, ID_CAT)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, 
      [Nom, Description, Prix, Promotion, 0, photo, Quantite, Visible, ID_CAT], 
      (err, result) => {
        if (err) {
          // Log the full error for server-side debugging
          console.error('Database error:', err);
          return reject(res.status(500).json({ 
            error: "Database insertion failed", 
            details: err.sqlMessage 
          }));
        }
        resolve(res.status(201).json({ 
          id: result.insertId, 
          Nom: Nom,
          message: "Article created successfully" 
        }));
    });
  });
}));

router.get("/", asyncHandler(async (req, res) => {
  const sql = "SELECT * FROM Article";
  return new Promise((resolve, reject) => {
    db.query(sql, (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return reject(res.status(500).json({ 
          error: "Failed to retrieve articles", 
          details: err.sqlMessage 
        }));
      }
      resolve(res.json(results));
    });
  });
}));

router.put("/:id", asyncHandler(async (req, res) => {
  let { Nom, Description, Prix, Promotion, AncienPrix, Photo, Quantite, Visible, ID_CAT } = req.body; // Use let here
  console.log(Nom, Description, Prix, Promotion, AncienPrix, Photo, Quantite, Visible, ID_CAT);

  if (!req.params.id) {
    return res.status(400).json({ error: "Article ID is required" });
  }

  if (Promotion === true) {  // strict equality check
    AncienPrix = Prix;
  }

  const sql = `
    UPDATE Article
    SET Nom = ?, Description = ?, Prix = ?, Promotion = ?, AncienPrix = ?, Photo = ?, Quantite = ?, Visible = ?, ID_CAT = ?
    WHERE ID_ART = ?
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, 
      [Nom, Description, Prix, Promotion, AncienPrix, Photo, Quantite, Visible, ID_CAT, req.params.id], 
      (err, result) => {
        if (err) {
          console.error('Database error:', err);
          return reject(res.status(500).json({ 
            error: "Failed to update article", 
            details: err.sqlMessage 
          }));
        }

        if (result.affectedRows === 0) {
          return resolve(res.status(404).json({ 
            error: "Article not found", 
            id: req.params.id 
          }));
        }

        resolve(res.status(200).json({ 
          message: "Article updated successfully",
          id: req.params.id 
        }));
    });
  });
}));


router.delete("/:id", asyncHandler(async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ error: "Article ID is required" });
  }

  const sql = "DELETE FROM Article WHERE ID_ART = ?";

  return new Promise((resolve, reject) => {
    db.query(sql, [req.params.id], (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return reject(res.status(500).json({ 
          error: "Failed to delete article", 
          details: err.sqlMessage 
        }));
      }

      if (result.affectedRows === 0) {
        return resolve(res.status(404).json({ 
          error: "Article not found", 
          id: req.params.id 
        }));
      }

      resolve(res.status(200).json({ 
        message: "Article deleted successfully", 
        id: req.params.id 
      }));
    });
  });
}));

// Global error handler
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: "Unexpected error occurred", 
    details: err.message 
  });
});

module.exports = router;