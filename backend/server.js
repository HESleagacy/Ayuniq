const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// import services
const dataLoader = require('./services/dataLoader');
const whoIcdService = require('./services/whoIcdService');

// import routes
const fhirRoutes = require('./routes/fhir-routes');
const adminRoutes = require('./routes/admin-routes');

const app = express();
const PORT = process.env.PORT || 8000;

// microservice urls
const FHIR_SERVICE_URL = process.env.FHIR_SERVICE_URL || 'http://localhost:6000';
const INSURANCE_SERVICE_URL = process.env.INSURANCE_SERVICE_URL || 'http://localhost:3002';

// debug logging
console.log(`# fhir service url: ${FHIR_SERVICE_URL}`);
console.log(`# insurance service url: ${INSURANCE_SERVICE_URL}`);

// middleware setup
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ?
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
      appName: 'ayuniq',
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

// dual-table search endpoint
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

    // search namaste database
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
        source: 'namaste csv database'
      },
      icd11: {
        results: processedICD11,
        total: processedICD11.length,
        source: 'who icd-11 v2 api'
      },
      query,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('# dual search failed:', error);
    res.status(500).json({
      error: 'search failed',
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
      return res.status(400).json({ error: 'both namasteCode and icd11Code are required' });
    }
    const namasteTerm = dataLoader.getTermByCode(namasteCode);
    if (!namasteTerm) {
      return res.status(404).json({ error: 'namaste term not found' });
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
      message: 'manual mapping created successfully'
    });
  } catch (error) {
    console.error('# mapping creation failed:', error);
    res.status(500).json({ error: 'mapping creation failed', details: error.message });
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
      error: 'failed to retrieve mappings',
      details: error.message
    });
  }
});

// generate fhir claim endpoint using axios
app.post('/api/generate-fhir-claim', async (req, res) => {
  try {
    const { patientId, diagnosis, namasteCode, icd11Code } = req.body;
    
    if (!patientId || !diagnosis) {
      return res.status(400).json({ 
        error: 'patientId and diagnosis are required' 
      });
    }

    console.log(`# generating fhir for patient: ${patientId}, codes: ${namasteCode}, ${icd11Code}`);
    
    // determine codes to use
    let codes = [];
    if (namasteCode && icd11Code) {
      codes = [`NAMASTE:${namasteCode}`, `ICD11:${icd11Code}`];
    } else {
      codes = ["NAMASTE:NAM999", "ICD11:TM99.Z"];
    }

    // step 1: call FHIR service using axios
    console.log(`# calling fhir service`);
    const fhirPayload = {
      name: req.body.patientName || "patient",
      diagnosis: diagnosis,
      patient_id: patientId,
      codes: codes
    };

    let fhirResponse;
    try {
      fhirResponse = await axios.post(`${FHIR_SERVICE_URL}/fhir/generate`, fhirPayload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (axiosError) {
      console.error(`# fhir service error: ${axiosError.message}`);
      if (axiosError.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          error: 'fhir service unavailable',
          details: 'cannot connect to FHIR service on port 6000',
          note: 'ensure FHIR service is running'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'fhir service failed',
        details: axiosError.message
      });
    }

    const fhirBundle = fhirResponse.data.bundle;
    console.log(`# fhir bundle generated: ${fhirBundle.id}`);

    // step 2: call insurance service using axios
    console.log(`# calling insurance service`);
    const insurancePayload = {
      bundle: fhirBundle,
      api_url: "https://api.hcx.gov.in/submit"
    };

    let insuranceResponse;
    try {
      insuranceResponse = await axios.post(`${INSURANCE_SERVICE_URL}/insurance/submit`, insurancePayload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (axiosError) {
      console.error(`# insurance service error: ${axiosError.message}`);
      if (axiosError.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          error: 'insurance service unavailable',
          details: 'cannot connect to insurance service on port 3002',
          note: 'ensure insurance service is running'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'insurance service failed',
        details: axiosError.message
      });
    }

    const insuranceResult = insuranceResponse.data;
    console.log(`# insurance claim submitted: ${insuranceResult.claim_id}`);

    // step 3: return combined result
    res.json({
      success: true,
      patient_id: patientId,
      diagnosis: diagnosis,
      fhir_bundle: fhirBundle,
      insurance_claim: insuranceResult,
      codes_used: codes,
      message: 'fhir bundle generated and insurance claim submitted successfully'
    });

  } catch (error) {
    console.error('# fhir generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'unexpected error',
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
    message: 'ayuniq api server',
    version: '1.0.0',
    endpoints: {
      search: '/api/search',
      mapping: '/api/mapping',
      fhir_claim: '/api/generate-fhir-claim'
    },
    microservices: {
      fhir_service: FHIR_SERVICE_URL,
      insurance_service: INSURANCE_SERVICE_URL
    }
  });
});

// error handling
app.use((err, req, res, next) => {
  console.error('# server error:', err);
  res.status(500).json({ error: 'internal server error', details: err.message });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'endpoint not found', path: req.originalUrl });
});

// startup
async function startServer() {
  try {
    console.log('# starting ayuniq backend server...');
    await dataLoader.initialize();
    const stats = dataLoader.getStats();
    console.log(`- namaste terms loaded: ${stats.totalTerms}`);
    
    const server = app.listen(PORT, () => {
      console.log(`## ayuniq server running on http://localhost:${PORT}`);
      console.log(`# microservices:`);
      console.log(`- fhir service: ${FHIR_SERVICE_URL}`);
      console.log(`- insurance service: ${INSURANCE_SERVICE_URL}`);
    });
    
    process.on('SIGTERM', () => { 
      server.close(() => process.exit(0)); 
    });
    process.on('SIGINT', () => { 
      server.close(() => process.exit(0)); 
    });
  } catch (error) {
    console.error('# server startup failed:', error);
    process.exit(1);
  }
}

startServer();
module.exports = app;
