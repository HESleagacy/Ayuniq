
// -------------
// ./dataloader is handling this...
// -------------



// // Main Translation Engine - Combines Multiple Sources
// const whoIcdService = require('./whoIcdService');
// const Translation = require('../models/Translation');

// class TranslationEngine {
//   constructor() {
//     this.translationSources = {
//       WHO_Ayurveda: this.translateViaWHO.bind(this),
//       Ayush_Ministry: this.translateViaAyushGlossary.bind(this),
//       Classical_Texts: this.translateViaClassicalTexts.bind(this),
//       Modern_Literature: this.translateViaModernLiterature.bind(this),
//       Machine_Learning: this.translateViaML.bind(this)
//     };
    
//     // Pre-built high-confidence translations for common terms
//     this.commonTranslations = new Map([
//       ['अमवात', { english: 'Rheumatoid Arthritis', confidence: 0.95, icd11: 'TM26.0' }],
//       ['ज्वर', { english: 'Fever', confidence: 0.90, icd11: 'TM25.1' }],
//       ['कास', { english: 'Cough', confidence: 0.88, icd11: 'TM22.3' }],
//       ['श्वास', { english: 'Asthma', confidence: 0.92, icd11: 'TM21.2' }],
//       ['अतिसार', { english: 'Diarrhea', confidence: 0.85, icd11: 'TM30.1' }],
//       ['मधुमेह', { english: 'Diabetes', confidence: 0.94, icd11: 'TM40.2' }],
//       ['वातरक्त', { english: 'Gout', confidence: 0.89, icd11: 'TM26.5' }],
//       ['उदररोग', { english: 'Abdominal Disease', confidence: 0.82, icd11: 'TM30.Z' }],
//       ['कामला', { english: 'Jaundice', confidence: 0.87, icd11: 'TM35.1' }],
//       ['प्रमेह', { english: 'Urinary Disorder', confidence: 0.79, icd11: 'TM45.Z' }],
//       ['गुल्म', { english: 'Abdominal Tumor', confidence: 0.83, icd11: 'TM30.3' }],
//       ['अर्श', { english: 'Hemorrhoids', confidence: 0.91, icd11: 'TM32.1' }],
//       ['भगन्दर', { english: 'Fistula-in-ano', confidence: 0.88, icd11: 'TM32.2' }],
//       ['नाडीव्रण', { english: 'Sinus', confidence: 0.76, icd11: 'TM60.4' }],
//       ['व्रण', { english: 'Wound/Ulcer', confidence: 0.85, icd11: 'TM60.Z' }],
//       ['कुष्ठ', { english: 'Skin Disease', confidence: 0.80, icd11: 'TM50.Z' }],
//       ['किटिभ', { english: 'Psoriasis', confidence: 0.84, icd11: 'TM50.2' }],
//       ['विचर्चिका', { english: 'Eczema', confidence: 0.86, icd11: 'TM50.3' }],
//       ['शिरःशूल', { english: 'Headache', confidence: 0.89, icd11: 'TM15.1' }],
//       ['कर्णशूल', { english: 'Earache', confidence: 0.87, icd11: 'TM12.2' }],
//       ['नेत्ररोग', { english: 'Eye Disease', confidence: 0.81, icd11: 'TM11.Z' }],
//       ['दन्तशूल', { english: 'Toothache', confidence: 0.90, icd11: 'TM13.1' }],
//       ['कण्ठरोग', { english: 'Throat Disease', confidence: 0.83, icd11: 'TM14.Z' }],
//       ['हृदयरोग', { english: 'Heart Disease', confidence: 0.88, icd11: 'TM20.Z' }],
//       ['प्लीहरोग', { english: 'Spleen Disease', confidence: 0.78, icd11: 'TM35.3' }],
//       ['यकृत्रोग', { english: 'Liver Disease', confidence: 0.85, icd11: 'TM35.Z' }],
//       ['मूत्रकृच्छ', { english: 'Dysuria', confidence: 0.84, icd11: 'TM45.1' }],
//       ['मूत्राघात', { english: 'Urinary Retention', confidence: 0.82, icd11: 'TM45.2' }],
//       ['प्रदर', { english: 'Leucorrhea', confidence: 0.86, icd11: 'TM70.1' }],
//       ['रजःकृच्छ', { english: 'Dysmenorrhea', confidence: 0.87, icd11: 'TM70.2' }]
//     ]);
//   }

//   async translateDiseaseName(sanskritName, hindiName = '', context = {}) {
//     console.log(` Starting translation for: "${sanskritName}"`);
    
//     const translationResults = [];
//     const startTime = Date.now();
    
//     try {
//       // Check common translations first for speed
//       const commonTranslation = this.getCommonTranslation(sanskritName, hindiName);
//       if (commonTranslation) {
//         translationResults.push({
//           source: 'Common_Knowledge',
//           ...commonTranslation,
//           metadata: { source: 'Pre-built high-confidence mapping' }
//         });
//       }

//       // Try multiple translation sources in parallel
//       const translationPromises = Object.entries(this.translationSources).map(async ([sourceName, translateFn]) => {
//         try {
//           const result = await translateFn(sanskritName, hindiName, context);
//           if (result) {
//             return { source: sourceName, ...result };
//           }
//         } catch (error) {
//           console.warn(` Translation source ${sourceName} failed:`, error.message);
//         }
//         return null;
//       });

//       // Wait for all translation attempts
//       const sourceResults = await Promise.all(translationPromises);
//       translationResults.push(...sourceResults.filter(result => result !== null));

//       // Consolidate and rank translations
//       const bestTranslation = this.consolidateTranslations(translationResults);
      
//       const processingTime = Date.now() - startTime;
      
//       return {
//         sanskritName,
//         hindiName,
//         ...bestTranslation,
//         alternatives: translationResults.filter(t => t.source !== bestTranslation.primarySource).slice(0, 3),
//         processingTime,
//         timestamp: new Date()
//       };
      
//     } catch (error) {
//       console.error(' Translation failed:', error.message);
//       return {
//         sanskritName,
//         hindiName,
//         englishTranslation: `${sanskritName} (Translation Failed)`,
//         confidence: 0.10,
//         primarySource: 'Fallback',
//         error: error.message,
//         processingTime: Date.now() - startTime
//       };
//     }
//   }

//   getCommonTranslation(sanskritName, hindiName) {
//     // Check Sanskrit first
//     if (this.commonTranslations.has(sanskritName)) {
//       return this.commonTranslations.get(sanskritName);
//     }
    
//     // Check Hindi if provided
//     if (hindiName && this.commonTranslations.has(hindiName)) {
//       return this.commonTranslations.get(hindiName);
//     }
    
//     // Check for partial matches
//     for (const [term, translation] of this.commonTranslations.entries()) {
//       if (sanskritName.includes(term) || term.includes(sanskritName)) {
//         return {
//           ...translation,
//           confidence: translation.confidence * 0.8, // Reduce confidence for partial match
//           note: 'Partial match'
//         };
//       }
//     }
    
//     return null;
//   }

//   async translateViaWHO(sanskritName, hindiName, context) {
//     try {
//       console.log(` Trying WHO ICD-11 API for: "${sanskritName}"`);
      
//       const result = await whoIcdService.translateSanskritToWHO(sanskritName, context);
      
//       if (result) {
//         return {
//           translation: result.translation,
//           confidence: result.confidence,
//           whoCode: result.whoCode,
//           system: result.system,
//           module: result.module,
//           definition: result.definition,
//           alternatives: result.alternatives,
//           metadata: {
//             source: 'WHO ICD-11 API',
//             module: result.module,
//             searchScore: result.searchScore
//           }
//         };
//       }
      
//       return null;
//     } catch (error) {
//       console.error(' WHO translation failed:', error.message);
//       return null;
//     }
//   }

//   async translateViaAyushGlossary(sanskritName, hindiName, context) {
//     // This would integrate with Ministry of Ayush official glossaries
//     // For now, implementing basic pattern matching
    
//     const ayushTerms = {
//       'अमवात': { english: 'Amavata (Rheumatoid Arthritis)', confidence: 0.90 },
//       'ज्वर': { english: 'Fever', confidence: 0.88 },
//       'कफज ज्वर': { english: 'Kapha-type Fever', confidence: 0.85 },
//       'पित्तज ज्वर': { english: 'Pitta-type Fever', confidence: 0.85 },
//       'वातज ज्वर': { english: 'Vata-type Fever', confidence: 0.85 },
//       'सन्निपातज ज्वर': { english: 'Sannipataja Fever', confidence: 0.82 },
//       'विषम ज्वर': { english: 'Intermittent Fever', confidence: 0.80 }
//     };
    
//     const term = ayushTerms[sanskritName] || ayushTerms[hindiName];
//     if (term) {
//       return {
//         translation: term.english,
//         confidence: term.confidence,
//         metadata: {
//           source: 'Ayush Ministry Glossary (Simulated)',
//           reference: 'Official terminology database'
//         }
//       };
//     }
    
//     return null;
//   }

//   async translateViaClassicalTexts(sanskritName, hindiName, context) {
//     // This would integrate with digitized classical Ayurveda texts
//     // Implementing basic pattern matching for demonstration
    
//     const classicalReferences = {
//       'अमवात': {
//         english: 'Amavata (Joint inflammation due to Ama)',
//         confidence: 0.85,
//         reference: 'Madhava Nidana, Chapter 25'
//       },
//       'गुल्म': {
//         english: 'Gulma (Abdominal lump/tumor)',
//         confidence: 0.83,
//         reference: 'Charaka Samhita, Chikitsa Sthana'
//       },
//       'अर्श': {
//         english: 'Arsha (Hemorrhoids)',
//         confidence: 0.87,
//         reference: 'Sushruta Samhita, Chikitsa Sthana'
//       }
//     };
    
//     const term = classicalReferences[sanskritName];
//     if (term) {
//       return {
//         translation: term.english,
//         confidence: term.confidence,
//         metadata: {
//           source: 'Classical Ayurveda Texts',
//           reference: term.reference,
//           note: 'Based on traditional Sanskrit medical literature'
//         }
//       };
//     }
    
//     return null;
//   }

//   async translateViaModernLiterature(sanskritName, hindiName, context) {
//     // This would integrate with modern Ayurveda research and publications
//     // Basic implementation for now
    
//     if (context.category) {
//       const contextualHints = {
//         'respiratory': 'Respiratory Disorder',
//         'digestive': 'Digestive Disorder',
//         'joint': 'Joint Disorder',
//         'skin': 'Skin Disorder',
//         'neurological': 'Neurological Disorder'
//       };
      
//       const hint = contextualHints[context.category.toLowerCase()];
//       if (hint) {
//         return {
//           translation: `${sanskritName} (${hint})`,
//           confidence: 0.65,
//           metadata: {
//             source: 'Modern Ayurveda Literature (Contextual)',
//             category: context.category,
//             note: 'Contextual translation based on category'
//           }
//         };
//       }
//     }
    
//     return null;
//   }

//   async translateViaML(sanskritName, hindiName, context) {
//     // This would use machine learning models for translation
//     // Basic pattern matching for now
    
//     // Simple linguistic analysis
//     let confidence = 0.50;
//     let englishTranslation = sanskritName;
    
//     // Common Sanskrit suffixes and their meanings
//     const suffixPatterns = {
//       'रोग': 'Disease',
//       'शूल': 'Pain',
//       'ज्वर': 'Fever',
//       'कास': 'Cough',
//       'श्वास': 'Breathing disorder',
//       'प्रमेह': 'Urinary disorder',
//       'व्रण': 'Wound/Ulcer'
//     };
    
//     for (const [suffix, meaning] of Object.entries(suffixPatterns)) {
//       if (sanskritName.includes(suffix)) {
//         englishTranslation = `${sanskritName.replace(suffix, '')} ${meaning}`.trim();
//         confidence = 0.60;
//         break;
//       }
//     }
    
//     return {
//       translation: englishTranslation,
//       confidence,
//       metadata: {
//         source: 'Machine Learning (Basic Pattern)',
//         method: 'Suffix pattern matching',
//         note: 'Generated translation - requires validation'
//       }
//     };
//   }

//   consolidateTranslations(translationResults) {
//     if (translationResults.length === 0) {
//       return {
//         englishTranslation: 'Translation not found',
//         confidence: 0.10,
//         primarySource: 'None',
//         sources: []
//       };
//     }

//     // Sort by confidence
//     const sortedResults = translationResults.sort((a, b) => b.confidence - a.confidence);
//     const bestResult = sortedResults[0];
    
//     // Calculate weighted average confidence if multiple high-confidence sources agree
//     const highConfidenceResults = sortedResults.filter(r => r.confidence >= 0.80);
//     let finalConfidence = bestResult.confidence;
    
//     if (highConfidenceResults.length > 1) {
//       // Check for agreement among high-confidence sources
//       const agreementCount = highConfidenceResults.filter(r => 
//         this.calculateSimilarity(r.translation, bestResult.translation) > 0.8
//       ).length;
      
//       if (agreementCount > 1) {
//         // Boost confidence for multiple source agreement
//         finalConfidence = Math.min(0.98, finalConfidence + 0.05);
//       }
//     }
    
//     return {
//       englishTranslation: bestResult.translation,
//       confidence: finalConfidence,
//       primarySource: bestResult.source,
//       sources: translationResults.map(r => ({
//         name: r.source,
//         translation: r.translation,
//         confidence: r.confidence,
//         metadata: r.metadata
//       })),
//       whoCode: bestResult.whoCode,
//       system: bestResult.system,
//       module: bestResult.module,
//       definition: bestResult.definition
//     };
//   }

//   calculateSimilarity(str1, str2) {
//     const longer = str1.length > str2.length ? str1 : str2;
//     const shorter = str1.length > str2.length ? str2 : str1;
    
//     if (longer.length === 0) return 1.0;
    
//     const distance = this.levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
//     return (longer.length - distance) / longer.length;
//   }

//   levenshteinDistance(str1, str2) {
//     const matrix = [];
//     for (let i = 0; i <= str2.length; i++) {
//       matrix[i] = [i];
//     }
//     for (let j = 0; j <= str1.length; j++) {
//       matrix[0][j] = j;
//     }
    
//     for (let i = 1; i <= str2.length; i++) {
//       for (let j = 1; j <= str1.length; j++) {
//         if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
//           matrix[i][j] = matrix[i - 1][j - 1];
//         } else {
//           matrix[i][j] = Math.min(
//             matrix[i - 1][j - 1] + 1,
//             matrix[i][j - 1] + 1,
//             matrix[i - 1][j] + 1
//           );
//         }
//       }
//     }
    
//     return matrix[str2.length][str1.length];
//   }

//   // Batch processing method for handling multiple translations
//   async batchTranslate(translations, batchSize = 10) {
//     console.log(` Starting batch translation of ${translations.length} terms`);
    
//     const results = [];
//     const failed = [];
    
//     for (let i = 0; i < translations.length; i += batchSize) {
//       const batch = translations.slice(i, i + batchSize);
      
//       console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(translations.length / batchSize)}`);
      
//       const batchPromises = batch.map(async (translation) => {
//         try {
//           const result = await this.translateDiseaseName(
//             translation.sanskritName,
//             translation.hindiName,
//             { 
//               category: translation.category,
//               system: translation.system 
//             }
//           );
          
//           return {
//             namasteCode: translation.namasteCode,
//             ...result,
//             status: result.confidence >= 0.85 ? 'processed' : 'needs_review'
//           };
//         } catch (error) {
//           console.error(` Batch translation failed for ${translation.namasteCode}:`, error.message);
//           return {
//             namasteCode: translation.namasteCode,
//             error: error.message,
//             status: 'failed'
//           };
//         }
//       });

//       const batchResults = await Promise.all(batchPromises);
//       results.push(...batchResults.filter(r => !r.error));
//       failed.push(...batchResults.filter(r => r.error));
      
//       // Add small delay between batches to avoid overwhelming external APIs
//       if (i + batchSize < translations.length) {
//         await new Promise(resolve => setTimeout(resolve, 1000));
//       }
//     }
    
//     console.log(` Batch translation completed: ${results.length} successful, ${failed.length} failed`);
    
//     return {
//       successful: results,
//       failed,
//       stats: {
//         total: translations.length,
//         successful: results.length,
//         failed: failed.length,
//         highConfidence: results.filter(r => r.confidence >= 0.85).length,
//         needsReview: results.filter(r => r.confidence < 0.85).length
//       }
//     };
//   }
// }

// // Create singleton instance
// const translationEngine = new TranslationEngine();

// module.exports = translationEngine;



// -------------
// ./dataloader is handling this...
// -------------