const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dataLoader = require('../services/dataLoader');
const whoIcdService = require('../services/whoIcdService');

// configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `namaste-${timestamp}-${file.originalname}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50mb limit
  }
});

// upload csv endpoint
router.post('/upload-namaste-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file provided'
      });
    }

    console.log(`# processing uploaded csv: ${req.file.filename}`);
    
    // move uploaded file to data directory
    const targetPath = path.join(__dirname, '../data/namaste.csv');
    fs.copyFileSync(req.file.path, targetPath);
    
    // reload data with new csv
    await dataLoader.initialize();
    const stats = dataLoader.getStats();
    
    // clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      message: 'CSV uploaded and processed successfully',
      data: {
        filename: req.file.filename,
        size: req.file.size,
        termsLoaded: stats.totalTerms
      }
    });

  } catch (error) {
    console.error('# csv upload failed:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: 'CSV processing failed',
      details: error.message
    });
  }
});

// get manual mappings list
router.get('/manual-mappings', async (req, res) => {
  try {
    const mappings = global.manualMappings ? 
      Array.from(global.manualMappings.values()) : [];
    
    res.json({
      success: true,
      data: {
        mappings: mappings.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        ),
        total: mappings.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// update mapping status (approve/reject)
router.post('/mapping/:id/review', async (req, res) => {
  try {
    const { approved, reviewerNotes, reviewerId } = req.body;
    const mappingId = req.params.id;
    
    if (!global.manualMappings || !global.manualMappings.has(mappingId)) {
      return res.status(404).json({
        success: false,
        error: 'Mapping not found'
      });
    }
    
    const mapping = global.manualMappings.get(mappingId);
    mapping.status = approved ? 'APPROVED' : 'REJECTED';
    mapping.reviewerNotes = reviewerNotes || '';
    mapping.validatedBy = reviewerId || 'admin';
    mapping.validatedAt = new Date().toISOString();
    
    global.manualMappings.set(mappingId, mapping);
    
    console.log(`# mapping ${mappingId} ${approved ? 'approved' : 'rejected'} by ${reviewerId}`);
    
    res.json({
      success: true,
      message: `Mapping ${approved ? 'approved' : 'rejected'} successfully`,
      data: mapping
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// who icd-11 connection test
router.post('/test-who-connection', async (req, res) => {
  try {
    console.log('# testing who icd-11 connection...');
    
    const isHealthy = await whoIcdService.isHealthy();
    
    if (isHealthy) {
      res.json({
        success: true,
        message: 'WHO ICD-11 API connection successful',
        data: {
          status: 'connected',
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'WHO ICD-11 API connection failed'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      details: error.message
    });
  }
});

// clear translation cache
router.post('/clear-cache', async (req, res) => {
  try {
    const cacheSize = dataLoader.translationCache.size;
    dataLoader.translationCache.clear();
    
    res.json({
      success: true,
      message: `Translation cache cleared (${cacheSize} entries removed)`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// reload namaste data
router.post('/reload-data', async (req, res) => {
  try {
    console.log('# reloading namaste data...');
    await dataLoader.initialize();
    const stats = dataLoader.getStats();
    
    res.json({
      success: true,
      message: 'NAMASTE data reloaded successfully',
      data: {
        totalTerms: stats.totalTerms,
        isLoaded: stats.isLoaded
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Data reload failed',
      details: error.message
    });
  }
});

module.exports = router;