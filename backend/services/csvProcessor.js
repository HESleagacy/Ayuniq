// CSV Processing Service for NAMASTE Data
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const CodeSystem = require('../models/CodeSystem');
const Translation = require('../models/Translation');

class CSVProcessor {
  constructor() {
    this.processingStats = {
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      startTime: null,
      endTime: null
    };
    this.progressCallback = null;
  }

  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  updateProgress(processed, total, currentItem = null) {
    this.processingStats.processed = processed;
    this.processingStats.total = total;
    
    if (this.progressCallback) {
      this.progressCallback({
        processed,
        total,
        percentage: Math.round((processed / total) * 100),
        currentItem,
        successful: this.processingStats.successful,
        failed: this.processingStats.failed
      });
    }
  }

  async processNAMASTECSV(csvFilePath) {
    console.log('📁 Processing NAMASTE CSV file:', csvFilePath);
    this.processingStats.startTime = new Date();
    
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found at path: ${csvFilePath}`);
    }

    const concepts = [];
    const translations = [];
    let rowCount = 0;

    return new Promise((resolve, reject) => {
      // First pass: count total rows
      const countStream = fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', () => rowCount++)
        .on('end', () => {
          this.processingStats.total = rowCount;
          console.log(`📊 Found ${rowCount} rows in CSV`);
          
          // Second pass: process data
          let processedCount = 0;
          fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
              try {
                processedCount++;
                const processedRow = this.processCSVRow(row, processedCount);
                
                if (processedRow.concept) {
                  concepts.push(processedRow.concept);
                }
                
                if (processedRow.translation) {
                  translations.push(processedRow.translation);
                }
                
                this.processingStats.successful++;
                this.updateProgress(processedCount, rowCount, processedRow.concept?.display);
                
              } catch (error) {
                console.error(`❌ Error processing row ${processedCount}:`, error.message);
                this.processingStats.failed++;
                this.updateProgress(processedCount, rowCount);
              }
            })
            .on('end', async () => {
              try {
                console.log('💾 Saving processed data to database...');
                
                // Create FHIR CodeSystem
                const codeSystemResult = await this.createNAMASTECodeSystem(concepts);
                
                // Save translations for processing
                const translationResults = await this.saveTranslationsForProcessing(translations);
                
                this.processingStats.endTime = new Date();
                
                const result = {
                  success: true,
                  stats: this.processingStats,
                  codeSystemId: codeSystemResult.id,
                  conceptsCreated: concepts.length,
                  translationsCreated: translations.length,
                  processingTime: this.processingStats.endTime - this.processingStats.startTime
                };
                
                console.log('✅ CSV processing completed successfully');
                resolve(result);
                
              } catch (error) {
                console.error('❌ Database save failed:', error);
                reject(error);
              }
            })
            .on('error', reject);
        })
        .on('error', reject);
    });
  }

  processCSVRow(row, rowNumber) {
    // Expected CSV columns (adjust based on actual NAMASTE CSV structure)
    // Common structures: code, sanskrit_name, hindi_name, english_name, system, category
    
    const namasteCode = row.code || row.Code || row.ID || `NAM${String(rowNumber).padStart(4, '0')}`;
    const sanskritName = row.sanskrit_name || row.Sanskrit || row.sanskrit || row.term_sanskrit;
    const hindiName = row.hindi_name || row.Hindi || row.hindi || row.term_hindi;
    const englishName = row.english_name || row.English || row.english || row.term_english;
    const system = row.system || row.System || row.medicine_system || 'Ayurveda';
    const category = row.category || row.Category || row.classification || 'General';
    
    // Validate required fields
    if (!sanskritName && !hindiName) {
      throw new Error(`Missing both Sanskrit and Hindi names in row ${rowNumber}`);
    }

    // Create FHIR Concept
    const concept = {
      code: namasteCode,
      display: englishName || sanskritName || hindiName,
      definition: `Traditional medicine term from ${system} system`,
      designation: [
        ...(sanskritName ? [{
          language: 'sa', // Sanskrit
          use: {
            system: 'http://terminology.hl7.org/CodeSystem/designation-usage',
            code: 'display'
          },
          value: sanskritName
        }] : []),
        ...(hindiName ? [{
          language: 'hi', // Hindi
          use: {
            system: 'http://terminology.hl7.org/CodeSystem/designation-usage',
            code: 'display'
          },
          value: hindiName
        }] : []),
        ...(englishName ? [{
          language: 'en', // English
          use: {
            system: 'http://terminology.hl7.org/CodeSystem/designation-usage',
            code: 'display'
          },
          value: englishName
        }] : [])
      ],
      property: [
        {
          code: 'traditional-system',
          valueString: system
        },
        {
          code: 'category',
          valueString: category
        },
        {
          code: 'source',
          valueString: 'NAMASTE-CSV'
        }
      ]
    };

    // Create Translation record for processing
    const translation = {
      namasteCode,
      sanskritName: sanskritName || '',
      hindiName: hindiName || '',
      system,
      category,
      englishTranslation: englishName || `${sanskritName || hindiName} (Needs Translation)`,
      finalConfidence: englishName ? 0.90 : 0.30, // High confidence if English provided, low if needs translation
      status: englishName ? 'processed' : 'pending',
      sources: englishName ? [{
        name: 'NAMASTE_CSV',
        translation: englishName,
        confidence: 0.90,
        metadata: {
          source: 'Original CSV data'
        }
      }] : [],
      processingNotes: englishName ? 'English translation provided in CSV' : 'Requires English translation'
    };

    return { concept, translation };
  }

  async createNAMASTECodeSystem(concepts) {
    try {
      const codeSystemId = uuidv4();
      
      // Check if NAMASTE CodeSystem already exists
      let existingCodeSystem = await CodeSystem.findOne({ 
        url: 'https://ayush.gov.in/fhir/CodeSystem/namaste' 
      });

      if (existingCodeSystem) {
        console.log('📋 Updating existing NAMASTE CodeSystem');
        existingCodeSystem.concept = concepts;
        existingCodeSystem.count = concepts.length;
        existingCodeSystem.meta.lastUpdated = new Date();
        await existingCodeSystem.save();
        return existingCodeSystem;
      }

      // Create new CodeSystem
      const codeSystem = new CodeSystem({
        id: codeSystemId,
        url: 'https://ayush.gov.in/fhir/CodeSystem/namaste',
        identifier: [{
          use: 'official',
          system: 'https://ayushbridge.in/fhir/identifier/codesystem',
          value: 'namaste-v1'
        }],
        version: '1.0.0',
        name: 'NAMASTE',
        title: 'National AYUSH Morbidity & Standardized Terminologies Electronic',
        status: 'active',
        experimental: false,
        date: new Date(),
        publisher: 'Ministry of Ayush, Government of India',
        contact: [{
          name: 'Ministry of Ayush',
          telecom: [{
            system: 'url',
            value: 'https://ayush.gov.in'
          }]
        }],
        description: 'NAMASTE code system containing standardized terminologies for Ayurveda, Siddha, Unani, Yoga, Naturopathy, and Homeopathy disorders and treatments',
        useContext: [{
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'focus',
            display: 'Clinical focus'
          },
          valueCodeableConcept: {
            coding: [{
              system: 'http://snomed.info/sct',
              code: '32570681000087105',
              display: 'Traditional medicine'
            }],
            text: 'Traditional and Complementary Medicine'
          }
        }],
        jurisdiction: [{
          coding: [{
            system: 'urn:iso:std:iso:3166',
            code: 'IN',
            display: 'India'
          }]
        }],
        purpose: 'To provide standardized terminologies for traditional medicine systems in India for use in electronic health records and health information systems',
        copyright: '© Ministry of Ayush, Government of India. All rights reserved.',
        caseSensitive: true,
        valueSet: 'https://ayush.gov.in/fhir/ValueSet/namaste-all',
        hierarchyMeaning: 'classified-with',
        compositional: false,
        versionNeeded: false,
        content: 'complete',
        count: concepts.length,
        property: [
          {
            code: 'traditional-system',
            uri: 'https://ayush.gov.in/fhir/CodeSystem/namaste#traditional-system',
            description: 'The traditional medicine system (Ayurveda, Siddha, Unani, etc.)',
            type: 'string'
          },
          {
            code: 'category',
            uri: 'https://ayush.gov.in/fhir/CodeSystem/namaste#category',
            description: 'Clinical category or classification',
            type: 'string'
          },
          {
            code: 'source',
            uri: 'https://ayush.gov.in/fhir/CodeSystem/namaste#source',
            description: 'Source of the terminology',
            type: 'string'
          }
        ],
        concept: concepts,
        text: {
          status: 'generated',
          div: `<div xmlns="http://www.w3.org/1999/xhtml"><h2>NAMASTE CodeSystem</h2><p>Contains ${concepts.length} concepts from traditional medicine systems</p></div>`
        }
      });

      await codeSystem.save();
      console.log(`✅ Created NAMASTE CodeSystem with ${concepts.length} concepts`);
      
      return codeSystem;
    } catch (error) {
      console.error('❌ Failed to create CodeSystem:', error);
      throw error;
    }
  }

  async saveTranslationsForProcessing(translations) {
    try {
      console.log(`💾 Saving ${translations.length} translations for processing...`);
      
      const results = {
        created: 0,
        updated: 0,
        failed: 0
      };

      for (const translationData of translations) {
        try {
          // Check if translation already exists
          const existing = await Translation.findOne({ 
            namasteCode: translationData.namasteCode 
          });

          if (existing) {
            // Update existing translation
            Object.assign(existing, translationData);
            await existing.save();
            results.updated++;
          } else {
            // Create new translation
            const translation = new Translation(translationData);
            await translation.save();
            results.created++;
          }
        } catch (error) {
          console.error(`❌ Failed to save translation ${translationData.namasteCode}:`, error.message);
          results.failed++;
        }
      }

      console.log(`✅ Translation save results: ${results.created} created, ${results.updated} updated, ${results.failed} failed`);
      return results;
    } catch (error) {
      console.error('❌ Failed to save translations:', error);
      throw error;
    }
  }

  async getProcessingStats() {
    const stats = await Translation.getProcessingStats();
    return {
      ...this.processingStats,
      translationStats: stats
    };
  }

  // Utility method to validate CSV structure
  async validateCSVStructure(csvFilePath) {
    return new Promise((resolve, reject) => {
      const headers = [];
      let rowCount = 0;
      
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers.push(...headerList);
        })
        .on('data', (row) => {
          rowCount++;
          if (rowCount === 1) {
            // Analyze first row structure
            const analysis = {
              headers: Object.keys(row),
              sampleData: row,
              hasCode: !!(row.code || row.Code || row.ID),
              hasSanskrit: !!(row.sanskrit_name || row.Sanskrit || row.sanskrit),
              hasHindi: !!(row.hindi_name || row.Hindi || row.hindi),
              hasEnglish: !!(row.english_name || row.English || row.english),
              hasSystem: !!(row.system || row.System || row.medicine_system),
              hasCategory: !!(row.category || row.Category || row.classification)
            };
            
            resolve({
              valid: analysis.hasCode && (analysis.hasSanskrit || analysis.hasHindi),
              analysis,
              totalRows: null // Will be updated after full scan
            });
          }
        })
        .on('end', () => {
          // Final count available here
        })
        .on('error', reject);
    });
  }
}

module.exports = new CSVProcessor();