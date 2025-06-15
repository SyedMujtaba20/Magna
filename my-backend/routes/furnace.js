// routes/furnace.js (or wherever you define your routes)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Furnace, Campaign, Scan } = require('../models');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename and folder structure
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept only CSV and TXT files
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'text/plain' || 
        file.originalname.endsWith('.csv') || 
        file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and TXT files are allowed'), false);
    }
  }
});

// Your existing uploadFurnace function (slightly modified)
const uploadFurnace = async (req, res) => {
  try {
    const uploadedPath = req.body.path; // full path to uploaded campaign folder
    const campaignFolder = path.basename(uploadedPath); // e.g., "2024-05-01 2024-06-01"
    const furnaceName = path.basename(path.resolve(uploadedPath, "..")); // go one folder back to get furnace name

    const [startDate, endDate] = campaignFolder.split(" ");

    // ✅ Create or find furnace
    let furnace = await Furnace.findOne({ where: { name: furnaceName } });
    if (!furnace) {
      furnace = await Furnace.create({ name: furnaceName });
    }

    // ✅ Create or find campaign
    let campaign = await Campaign.findOne({
      where: {
        furnaceId: furnace.id,
        startDate,
        endDate,
      },
    });

    if (!campaign) {
      campaign = await Campaign.create({
        furnaceId: furnace.id,
        startDate,
        endDate,
      });
    }

    // ✅ Process scan folders inside the campaign folder
    const scanFolders = fs.readdirSync(uploadedPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name); // scan folder names like "2024-05-10"

    for (const scanFolder of scanFolders) {
      const scanDate = scanFolder;
      const scanPath = path.join(uploadedPath, scanFolder);

      // Optional: Check if scan already exists
      const exists = await Scan.findOne({
        where: { campaignId: campaign.id, scanDate },
      });
      if (!exists) {
        await Scan.create({
          campaignId: campaign.id,
          scanDate,
          path: scanPath,
        });
      }
    }

    res.status(200).json({ 
      message: "Furnace, campaign, and scans uploaded successfully.",
      furnace: furnace,
      campaign: campaign,
      scansProcessed: scanFolders.length
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to process upload.", details: error.message });
  }
};

// New endpoint to handle file uploads from React
const handleFileUpload = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Group files by folder structure
    const folderStructure = {};
    
    req.files.forEach(file => {
      // Extract folder path from webkitRelativePath
      const relativePath = file.originalname;
      const pathParts = relativePath.split('/');
      
      if (pathParts.length >= 3) {
        // Assuming structure: furnaceName/campaignFolder/scanFolder/file.csv
        const furnaceName = pathParts[0];
        const campaignFolder = pathParts[1];
        const scanFolder = pathParts[2];
        
        if (!folderStructure[furnaceName]) {
          folderStructure[furnaceName] = {};
        }
        if (!folderStructure[furnaceName][campaignFolder]) {
          folderStructure[furnaceName][campaignFolder] = {};
        }
        if (!folderStructure[furnaceName][campaignFolder][scanFolder]) {
          folderStructure[furnaceName][campaignFolder][scanFolder] = [];
        }
        
        folderStructure[furnaceName][campaignFolder][scanFolder].push({
          filename: file.filename,
          path: file.path,
          originalname: file.originalname
        });
      }
    });

    // Process each furnace/campaign/scan combination
    const results = [];
    
    for (const furnaceName in folderStructure) {
      for (const campaignFolder in folderStructure[furnaceName]) {
        const [startDate, endDate] = campaignFolder.split(" ");
        
        // Create or find furnace
        let furnace = await Furnace.findOne({ where: { name: furnaceName } });
        if (!furnace) {
          furnace = await Furnace.create({ name: furnaceName });
        }

        // Create or find campaign
        let campaign = await Campaign.findOne({
          where: {
            furnaceId: furnace.id,
            startDate,
            endDate,
          },
        });

        if (!campaign) {
          campaign = await Campaign.create({
            furnaceId: furnace.id,
            startDate,
            endDate,
          });
        }

        // Process scans
        for (const scanFolder in folderStructure[furnaceName][campaignFolder]) {
          const scanDate = scanFolder;
          const scanPath = path.join('uploads', furnaceName, campaignFolder, scanFolder);
          
          // Create scan entry
          const existingScan = await Scan.findOne({
            where: { campaignId: campaign.id, scanDate },
          });
          
          if (!existingScan) {
            await Scan.create({
              campaignId: campaign.id,
              scanDate,
              path: scanPath,
            });
          }
        }
        
        results.push({
          furnace: furnace.name,
          campaign: `${startDate} ${endDate}`,
          scansProcessed: Object.keys(folderStructure[furnaceName][campaignFolder]).length
        });
      }
    }

    res.status(200).json({
      message: "Files uploaded and processed successfully",
      results: results,
      totalFiles: req.files.length
    });

  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ 
      error: "Failed to process file upload", 
      details: error.message 
    });
  }
};

// Routes
router.post('/upload-furnace', uploadFurnace);
router.post('/upload-files', upload.array('files'), handleFileUpload);

module.exports = router;