// FHIR R4 Compliant API Routes - FIXED with proper endpoints
const express = require('express');
const router = express.Router();
const dataLoader = require('../services/dataLoader');
const whoIcdService = require('../services/whoIcdService');

// FHIR Capability Statement
router.get('/metadata', (req, res) => {
  const capabilityStatement = {
    resourceType: 'CapabilityStatement',
    id: 'ayuniq-capability',
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString()
    },
    url: 'https://ayuniq.in/fhir/CapabilityStatement/ayuniq',
    version: '1.0.0',
    name: 'AyuniqCapability',
    title: 'Ayuniq FHIR R4 Capability Statement',
    status: 'active',
    experimental: false,
    date: new Date().toISOString(),
    publisher: 'Ayuniq Team',
    description: 'FHIR R4 capability statement for Ayuniq NAMASTE-ICD11 integration platform',
    kind: 'instance',
    fhirVersion: '4.0.1',
    format: ['application/fhir+json', 'application/json'],
    rest: [{
      mode: 'server',
      documentation: 'FHIR R4 server for NAMASTE and ICD-11 terminology services',
      security: {
        cors: true,
        description: 'CORS enabled for web applications'
      },
      resource: [
        {
          type: 'CodeSystem',
          interaction: [
            { code: 'read' },
            { code: 'search-type' }
          ]
        }
      ]
    }]
  };

  res.json(capabilityStatement);
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        dataLoader: dataLoader.getStats().isLoaded ? 'loaded' : 'loading',
        whoApi: await whoIcdService.isHealthy() ? 'connected' : 'disconnected',
        server: 'running'
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

// FIXED: Code lookup endpoint (was missing)
router.post('/lookup', async (req, res) => {
  try {
    const { code, system } = req.body;
    
    if (!code) {
      return res.status(400).json({
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'error',
          code: 'required',
          diagnostics: 'Parameter "code" is required'
        }]
      });
    }

    console.log(`🔍 FHIR lookup for code: ${code}`);

    const namasteResult = dataLoader.getTermByCode(code);
    
    if (namasteResult) {
      return res.json({
        resourceType: 'Parameters',
        parameter: [
          { name: 'name', valueString: 'NAMASTE' },
          { name: 'version', valueString: '1.0.0' },
          { name: 'display', valueString: namasteResult.display },
          { name: 'system', valueUri: 'https://ayush.gov.in/fhir/CodeSystem/namaste' },
          { name: 'definition', valueString: namasteResult.definition || '' },
          ...(namasteResult.designation || []).map(d => ({
            name: 'designation',
            part: [
              { name: 'language', valueCode: d.language },
              { name: 'value', valueString: d.value }
            ]
          }))
        ]
      });
    }

    res.status(404).json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'not-found',
        diagnostics: `Code '${code}' not found`
      }]
    });

  } catch (error) {
    res.status(500).json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'processing',
        diagnostics: error.message
      }]
    });
  }
});

// FIXED: Translation endpoint (was missing)
router.post('/translate', async (req, res) => {
  try {
    const { code, system, targetsystem } = req.body;
    
    if (!code || !system) {
      return res.status(400).json({
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'error',
          code: 'required',
          diagnostics: 'Parameters "code" and "system" are required'
        }]
      });
    }

    console.log(`🔄 FHIR translation: ${code} from ${system} to ${targetsystem}`);

    // Get NAMASTE term
    const namasteResult = dataLoader.getTermByCode(code);
    
    if (namasteResult) {
      try {
        // Try to get translation
        const translation = await dataLoader.getTranslation(namasteResult);
        
        if (translation) {
          return res.json({
            resourceType: 'Parameters',
            parameter: [
              { name: 'result', valueBoolean: true },
              {
                name: 'match',
                part: [
                  { name: 'equivalence', valueCode: 'equivalent' },
                  {
                    name: 'concept',
                    valueCoding: {
                      system: targetsystem || 'http://id.who.int/icd/release/11/mms',
                      code: translation.icd11Code,
                      display: translation.englishTranslation
                    }
                  },
                  { name: 'confidence', valueDecimal: translation.confidence },
                  { name: 'source', valueString: translation.source }
                ]
              }
            ]
          });
        }
      } catch (error) {
        console.error('Translation failed:', error.message);
      }
    }

    // No translation found
    res.json({
      resourceType: 'Parameters',
      parameter: [
        { name: 'result', valueBoolean: false },
        { name: 'message', valueString: `No translation found for code '${code}'` }
      ]
    });

  } catch (error) {
    console.error('# Translation error:', error);
    res.status(500).json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'processing',
        diagnostics: error.message
      }]
    });
  }
});

// Mock CodeSystem endpoint
router.get('/CodeSystem', async (req, res) => {
  try {
    const stats = dataLoader.getStats();
    
    const mockCodeSystems = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: 1,
      entry: [{
        resource: {
          resourceType: 'CodeSystem',
          id: 'namaste',
          url: 'https://ayush.gov.in/fhir/CodeSystem/namaste',
          name: 'NAMASTE',
          title: 'National AYUSH Morbidity & Standardized Terminologies Electronic',
          status: 'active',
          content: 'complete',
          count: stats.totalTerms,
          concept: stats.sampleTerm ? [{
            code: stats.sampleTerm.code,
            display: stats.sampleTerm.display,
            definition: stats.sampleTerm.definition,
            designation: stats.sampleTerm.designation || []
          }] : []
        }
      }]
    };

    res.json(mockCodeSystems);
  } catch (error) {
    res.status(500).json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'processing',
        diagnostics: error.message
      }]
    });
  }
});

module.exports = router;