const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// import services
const dataLoader = require('./services/dataLoader');
const whoIcdService = require('./services/whoIcdService');

// import routes
const fhirRoutes = require('./routes/fhir-routes');
const adminRoutes = require('./routes/admin-routes');

const app = express();
const PORT = process.env.PORT || 8000;

// middleware setup
app.use(cors({
  origin: process.env.NODE_ENV ==='production' ?
    ['https://ayuniq.in', 'https://www.ayuniq.in'] :
    ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const whoHealthy = await whoIcdService.isHealthy();
    const dataStats = dataLoader.getStats();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      appName: 'Ayuniq',
      services: {
        dataLoader: dataStats.isLoaded ? 'loaded' : 'loading',
        whoIcdApi: whoHealthy ? 'connected' : 'disconnected',
        server: 'running'
      },
      data: {
        totalTerms: dataStats.totalTerms,
        cachedTranslations: dataStats.translationsCache,
        systemBreakdown: dataStats.systemBreakdown
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// dual-table search endpoint for manual mapping interface
app.get('/api/search', async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;
    if (!query || query.length < 2) {
      return res.json({
        namaste: { results: [], total: 0 },
        icd11: { results: [], total: 0 },
        query,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`# dual search for: "${query}"`);

    // search namaste database first
    const namasteResults = dataLoader.fuzzySearch(query, { limit: Math.floor(limit * 0.6) });
    const processedNamaste = namasteResults.map(result => ({
      id: result.code,
      code: result.code,
      sanskrit: result.sanskrit || '',
      sanskritDiacritic: result.sanskritDiacritic || '',
      devanagari: result.devanagari || '',
      english: result.english || '',
      display: result.display,
      definition: result.definition || '',
      system: result.system || 'Ayurveda',
      category: result.category || 'General',
      confidence: Math.round((result.relevanceScore || 0) * 100),
      source: 'NAMASTE'
    }));

    // search who icd-11 database
    let processedICD11 = [];
    try {
      const whoResults = await whoIcdService.searchTerms(query, Math.floor(limit * 0.4));
      processedICD11 = whoResults.map(result => ({
        id: result.code,
        code: result.code,
        display: result.display,
        definition: result.definition || '',
        system: result.system,
        systemName: result.systemName || 'WHO ICD-11',
        module: result.module || (result.code && result.code.startsWith('TM') ? 'Traditional Medicine' : 'Biomedicine'),
        type: result.code && result.code.startsWith('TM') ? 'Traditional Medicine' : 'Biomedicine',
        url: result.url || '',
        confidence: Math.round(result.searchScore || 0),
        source: 'ICD11',
        isTM2: result.code && result.code.startsWith('TM')
      }));
      // sort with tm2 codes first
      processedICD11.sort((a, b) => {
        if (a.isTM2 && !b.isTM2) return -1;
        if (!a.isTM2 && b.isTM2) return 1;
        return b.confidence - a.confidence;
      });
    } catch (error) {
      console.log('# who search failed:', error.message);
    }

    res.json({
      namaste: {
        results: processedNamaste,
        total: processedNamaste.length,
        source: 'NAMASTE CSV Database'
      },
      icd11: {
        results: processedICD11,
        total: processedICD11.length,
        source: 'WHO ICD-11 v2 API'
      },
      query,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('# dual search failed:', error);
    res.status(500).json({
      error: 'Search failed',
      details: error.message,
      namaste: { results: [], total: 0 },
      icd11: { results: [], total: 0 }
    });
  }
});

// manual mapping creation endpoint
app.post('/api/mapping/create', async (req, res) => {
  try {
    const { namasteCode, icd11Code, doctorId, confidence, notes, icd11Display } = req.body;
    if (!namasteCode || !icd11Code) {
      return res.status(400).json({ error: 'Both namasteCode and icd11Code are required' });
    }
    const namasteTerm = dataLoader.getTermByCode(namasteCode);
    if (!namasteTerm) {
      return res.status(404).json({ error: 'NAMASTE term not found' });
    }
    const mapping = {
      id: `MAP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      namasteCode,
      icd11Code,
      namasteDisplay: namasteTerm.display,
      icd11Display: icd11Display || '',
      confidence: confidence || 85,
      status: 'PENDING_REVIEW',
      createdBy: doctorId || 'anonymous',
      createdAt: new Date().toISOString(),
      notes: notes || '',
      validatedBy: null,
      validatedAt: null
    };
    if (!global.manualMappings) global.manualMappings = new Map();
    global.manualMappings.set(mapping.id, mapping);
    console.log(`# manual mapping created: ${namasteCode} → ${icd11Code} by ${doctorId}`);
    res.json({
      success: true,
      mapping: mapping,
      message: 'Manual mapping created successfully'
    });
  } catch (error) {
    console.error('# mapping creation failed:', error);
    res.status(500).json({ error: 'Mapping creation failed', details: error.message });
  }
});

// get list of manual mappings
app.get('/api/mapping/list', (req, res) => {
  try {
    const mappings = global.manualMappings ?
      Array.from(global.manualMappings.values()) : [];
    res.json({
      success: true,
      mappings: mappings.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      ),
      total: mappings.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve mappings',
      details: error.message
    });
  }
});

// api routes
app.use('/api/fhir', fhirRoutes);
app.use('/api/admin', adminRoutes);

// root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Ayuniq API Server',
    version: '1.0.0',
    description: 'FHIR R4-compliant API for NAMASTE and ICD-11 terminology integration',
    endpoints: {
      search: '/api/search',
      mapping: '/api/mapping',
      fhir: '/api/fhir',
      admin: '/api/admin',
      health: '/api/health'
    }
  });
});

// error handling middleware
app.use((err, req, res, next) => {
  console.error('# server error:', err);
  res.status(err.status || 500).json({
    error: 'Internal server error',
    details: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// server startup function
async function startServer() {
  try {
    console.log('# starting ayuniq backend server...');
    await dataLoader.initialize();
    const stats = dataLoader.getStats();
    console.log(`- total namaste terms: ${stats.totalTerms}`);
    
    const server = app.listen(PORT, () => {
      console.log(`## server running on http://localhost:${PORT}`);
      console.log(`- api base: http://localhost:${PORT}/api`);
      console.log(`- search: http://localhost:${PORT}/api/search`);
      console.log(`- mapping: http://localhost:${PORT}/api/mapping`);
    });
    
    process.on('SIGTERM', () => { 
      console.log('# shutting down server...');
      server.close(() => process.exit(0)); 
    });
    process.on('SIGINT', () => { 
      console.log('# shutting down server...');
      server.close(() => process.exit(0)); 
    });
  } catch (error) {
    console.error('# failed to start server:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (err) => { 
  console.error('# unhandled promise rejection:', err); 
});

startServer();

module.exports = app;