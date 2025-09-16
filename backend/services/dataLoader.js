// dataLoader service for loading and processing NAMASTE dataset from CSV
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const whoIcdService = require('./whoIcdService');

class DataLoader {
  constructor() {
    this.namasteData = [];
    this.translationCache = new Map();
    this.isLoaded = false;
    this.loadingPromise = null;
    this.stats = {
      totalTerms: 0,
      translationsCache: 0,
      systemBreakdown: {},
      categoryBreakdown: {},
      isLoaded: false,
      sampleTerm: null
    };
  }

  // Initialize and load data
  async initialize() {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }
    this.loadingPromise = this.loadData();
    return this.loadingPromise;
  }

  async loadData() {
    try {
      console.log('- Loading NAMASTE data from CSV...');
      const csvPath = path.join(__dirname, '../data/namaste.csv');

      console.log('- CSV Path:', csvPath);
      console.log('- CSV exists:', fs.existsSync(csvPath));

      if (!fs.existsSync(csvPath)) {
        console.error('# NAMASTE CSV file not found at:', csvPath);
        this.createSampleCSV(csvPath);
        return;
      }

      this.analyzeCSVStructure(csvPath);
      await this.loadNAMASTECSV(csvPath);
      
      this.isLoaded = true;
      this.updateStats();
      console.log(`# Data loading complete: ${this.namasteData.length} terms loaded`);
      
    } catch (error) {
      console.error('# Data loading failed:', error);
      throw error;
    }
  }

  // Analyze the structure of the CSV file
  analyzeCSVStructure(csvPath) {
    console.log('- ANALYZING CSV STRUCTURE...');
    try {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const lines = csvContent.split('\n').slice(0, 5);
      
      console.log('- First 5 lines of CSV:');
      lines.forEach((line, index) => {
        console.log(`Line ${index}:`, line.substring(0, 200));
      });

      const firstLine = lines[0];
      const commaCount = (firstLine.match(/,/g) || []).length;
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      
      console.log(' Delimiter analysis:');
      console.log(`- Commas: ${commaCount}`);
      console.log(`- Semicolons: ${semicolonCount}`);
      
      const hasIndianChars = /[\u0900-\u097F]/.test(csvContent);
      console.log(`Contains Devanagari characters: ${hasIndianChars}`);
      
    } catch (error) {
      console.error('# CSV analysis failed:', error);
    }
  }

  async loadNAMASTECSV(csvPath) {
    return new Promise((resolve, reject) => {
      const results = [];
      let rowCount = 0;
      let headers = [];
      let errorCount = 0;

      console.log('- Starting CSV parsing...');

      fs.createReadStream(csvPath, { encoding: 'utf8' })
        .pipe(csv({
          // separator: '\t',
          skipEmptyLines: true,
          skipLinesWithError: true
        }))
        .on('headers', (headerList) => {
          headers = headerList;
          console.log('- CSV Headers detected:', headers.slice(0, 10).join(', '));
          console.log(`- Total columns: ${headers.length}`);
        })
        .on('data', (row) => {
          try {
            rowCount++;
            if (rowCount % 1000 === 0) {
              console.log(`- Processed ${rowCount} rows...`);
            }
            
            const processedRow = this.processNAMASTERow(row, rowCount, headers);
            if (processedRow) {
              results.push(processedRow);
            }
          } catch (error) {
            errorCount++;
            if (errorCount <= 5) {
              console.error(`# Error processing row ${rowCount}:`, error.message);
            }
          }
        })
        .on('end', () => {
          console.log(`# CSV parsing complete:`);
          console.log(`- Total rows processed: ${rowCount}`);
          console.log(`- Valid terms loaded: ${results.length}`);
          console.log(`- Errors encountered: ${errorCount}`);
          
          this.namasteData = results;
          resolve(results);
        })
        .on('error', (error) => {
          console.error('# CSV parsing error:', error);
          reject(error);
        });
    });
  }

  // Process a single row of the NAMASTE CSV
  processNAMASTERow(row, rowNumber, headers) {
    try {
      const getColumnValue = (possibleNames) => {
        for (const name of possibleNames) {
          const value = row[name];
          if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value).trim();
          }
        }
        return '';
      };

      const code = getColumnValue([
        'NAMC_CODE', 'Code', 'code', 'ID', 'id', 'Term_Code', 'NAMC_ID',
        'Sr No.', 'Serial', 'Index'
      ]) || `NAM${String(rowNumber).padStart(4, '0')}`;

      const sanskrit = getColumnValue([
        'NAMC_term', 'Sanskrit', 'sanskrit', 'Term', 'Sanskrit_Term', 
        'NAMC_term_transliteration', 'Sanskrit_Name'
      ]);

      const sanskritDiacritic = getColumnValue([
        'NAMC_term_diacritical', 'Diacritical', 'Sanskrit_Diacritical',
        'NAMC_term_diacritical_marks', 'Sanskrit_Diacritic'
      ]);

      const devanagari = getColumnValue([
        'NAMC_term_DEVANAGARI', 'Devanagari', 'Hindi', 'Sanskrit_Devanagari',
        'NAMC_term_devanagari', 'Sanskrit_Hindi', 'Hindi_Name'
      ]);

      const english = getColumnValue([
        'English', 'english', 'English_Name', 'Translation', 
        'English_Translation', 'Meaning', 'English_Meaning'
      ]);

      const definition = getColumnValue([
        'Short_definition', 'Definition', 'description', 'Description',
        'Long_definition', 'Meaning', 'Details', 'Short_Definition'
      ]);

      const system = getColumnValue([
        'System', 'system', 'Medicine_System', 'Medical_System',
        'Ontology_branches', 'Branch', 'Type'
      ]) || 'Ayurveda';

      const category = getColumnValue([
        'Category', 'category', 'Classification', 'Type',
        'Ontology_Category', 'Medical_Category', 'Domain'
      ]) || this.deriveCategory(definition, sanskrit);

      if (!sanskrit && !sanskritDiacritic && !devanagari && !english) {
        return null;
      }

      const displayName = english || sanskritDiacritic || sanskrit || devanagari || code;
      const cleanSystem = this.cleanSystem(system);
      const cleanCategory = this.cleanCategory(category, definition);

      return {
        code: code,
        sanskrit: sanskrit || '',
        sanskritDiacritic: sanskritDiacritic || '',
        devanagari: devanagari || '',
        english: english || '',
        display: displayName,
        definition: definition || '',
        system: cleanSystem,
        category: cleanCategory,
        designation: this.createDesignations(sanskrit, sanskritDiacritic, devanagari, english),
        searchTerms: this.createSearchTerms(sanskrit, sanskritDiacritic, devanagari, english, code, definition)
      };

    } catch (error) {
      console.error(`# Error processing NAMASTE row ${rowNumber}:`, error.message);
      return null;
    }
  }

  // Create designations for the processed NAMASTE row
  createDesignations(sanskrit, sanskritDiacritic, devanagari, english) {
    const designations = [];
    
    if (sanskrit) {
      designations.push({ language: 'sa', use: 'transliteration', value: sanskrit });
    }
    if (sanskritDiacritic) {
      designations.push({ language: 'sa', use: 'diacritic', value: sanskritDiacritic });
    }
    if (devanagari) {
      designations.push({ language: 'sa', use: 'devanagari', value: devanagari });
    }
    if (english) {
      designations.push({ language: 'en', use: 'display', value: english });
    }
    
    return designations;
  }

  
  createSearchTerms(sanskrit, sanskritDiacritic, devanagari, english, code, definition) {
    const terms = new Set();
    
    [sanskrit, sanskritDiacritic, devanagari, english, code].forEach(term => {
      if (term) {
        terms.add(term.toLowerCase());
        term.split(/[-\s_]+/).forEach(part => {
          if (part.length > 2) {
            terms.add(part.toLowerCase());
          }
        });
      }
    });
    
    if (definition) {
      const defWords = definition.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !['this', 'that', 'with', 'from', 'such', 'could', 'would', 'characterized', 'condition'].includes(word));
      
      defWords.slice(0, 8).forEach(word => terms.add(word));
    }

    return Array.from(terms);
  }

  cleanSystem(system) {
    if (!system) return 'Ayurveda';
    
    const systemMap = {
      'ayurveda': 'Ayurveda',
      'siddha': 'Siddha', 
      'unani': 'Unani',
      'yoga': 'Yoga',
      'naturopathy': 'Naturopathy',
      'homeopathy': 'Homeopathy'
    };
    
    const lower = system.toLowerCase();
    for (const [key, value] of Object.entries(systemMap)) {
      if (lower.includes(key)) {
        return value;
      }
    }
    
    return 'Ayurveda';
  }

  cleanCategory(category, definition) {
    if (!category && !definition) return 'General';
    
    const text = (category + ' ' + definition).toLowerCase();
    
    const categoryMap = {
      'fever|temperature|pyrexia': 'Fever',
      'joint|arthritis|pain': 'Joint Disorder',
      'respiratory|breathing|cough|asthma': 'Respiratory',
      'digestive|stomach|gastro|intestinal': 'Digestive',
      'skin|dermatological|rash': 'Dermatological',
      'cardiovascular|heart|cardiac': 'Cardiovascular',
      'neurological|nervous|brain': 'Neurological',
      'mental|psychiatric|psychological': 'Mental Health',
      'reproductive|gynecological|obstetric': 'Reproductive',
      'urinary|kidney|renal': 'Urogenital'
    };
    
    for (const [keywords, cat] of Object.entries(categoryMap)) {
      const regex = new RegExp(keywords, 'i');
      if (regex.test(text)) {
        return cat;
      }
    }
    
    return category || 'General';
  }

  deriveCategory(definition, sanskrit) {
    const text = (definition + ' ' + sanskrit).toLowerCase();
    
    if (text.includes('fever') || text.includes('jvara')) return 'Fever';
    if (text.includes('joint') || text.includes('amavata')) return 'Joint Disorder';
    if (text.includes('cough') || text.includes('kasa')) return 'Respiratory';
    if (text.includes('breathing') || text.includes('svasa')) return 'Respiratory';
    if (text.includes('digestive') || text.includes('agni')) return 'Digestive';
    
    return 'General';
  }

  // Get translation for a term
  async getTranslation(term) {
    const cacheKey = term.code || term.display;
    
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    try {
      console.log(`- Translating term: ${term.display || term.sanskrit}`);
      
      const searchTerms = this.buildSearchTerms(term);
      let bestTranslation = null;
      
      for (const searchTerm of searchTerms) {
        try {
          console.log(`- WHO search for: "${searchTerm}"`);
          
          const translation = await whoIcdService.translateToICD11(searchTerm, {
            category: term.category,
            system: term.system,
            preferTM2: true
          });

          if (translation && translation.confidence > (bestTranslation?.confidence || 0)) {
            bestTranslation = translation;
            console.log(`- Found translation: ${searchTerm} -> ${translation.icd11Code} (${Math.round(translation.confidence * 100)}%)`);
          }

          if (translation && translation.confidence > 0.8) {
            break;
          }

        } catch (error) {
          console.log(`- WHO search failed for "${searchTerm}":`, error.message);
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (!bestTranslation || bestTranslation.confidence < 0.6) {
        bestTranslation = this.getSemanticTranslation(term);
      }

      if (bestTranslation) {
        this.translationCache.set(cacheKey, bestTranslation);
        console.log(`- Cached translation for ${term.display}: ${bestTranslation.icd11Code}`);
        return bestTranslation;
      }

      console.log(`- No translation found for: ${term.display}`);
      return null;
      
    } catch (error) {
      console.error(`- Translation error for ${term.code}:`, error);
      return null;
    }
  }

  buildSearchTerms(term) {
    const terms = [];
    
    if (term.english) terms.push(term.english);
    if (term.sanskritDiacritic) terms.push(term.sanskritDiacritic);
    if (term.definition) {
      const keyTerms = term.definition.match(/\b\w{4,}\b/g);
      if (keyTerms) {
        terms.push(keyTerms.slice(0, 2).join(' '));
      }
    }
    if (term.sanskrit) terms.push(term.sanskrit);
    
    if (term.category && term.category !== 'General') {
      if (term.english) {
        terms.push(`${term.category.toLowerCase()} ${term.english}`);
      }
    }
    
    return terms.filter(t => t && t.length > 2).slice(0, 5);
  }

  // Get semantic translation for a term
  getSemanticTranslation(term) {
    const commonMappings = {
      'fever': { icd11: 'TM25.1', english: 'Fever', confidence: 0.9 },
      'jvara': { icd11: 'TM25.1', english: 'Fever', confidence: 0.95 },
      'jwara': { icd11: 'TM25.1', english: 'Fever', confidence: 0.95 },
      'arthritis': { icd11: 'TM26.0', english: 'Arthritis', confidence: 0.85 },
      'amavata': { icd11: 'TM26.0', english: 'Rheumatoid Arthritis', confidence: 0.95 },
      'sandhi': { icd11: 'TM26.1', english: 'Joint disorder', confidence: 0.8 },
      'cough': { icd11: 'TM23.2', english: 'Cough', confidence: 0.9 },
      'kasa': { icd11: 'TM23.2', english: 'Cough', confidence: 0.95 },
      'kasha': { icd11: 'TM23.2', english: 'Cough', confidence: 0.95 },
      'svasa': { icd11: 'TM23.1', english: 'Dyspnea', confidence: 0.9 },
      'shvasa': { icd11: 'TM23.1', english: 'Dyspnea', confidence: 0.9 },
      'arsa': { icd11: 'TM21.4', english: 'Hemorrhoids', confidence: 0.92 },
      'arsha': { icd11: 'TM21.4', english: 'Hemorrhoids', confidence: 0.92 },
      'grahani': { icd11: 'TM21.2', english: 'Digestive disorder', confidence: 0.85 },
      'atisara': { icd11: 'TM21.1', english: 'Diarrhea', confidence: 0.9 },
      'kushta': { icd11: 'TM22.1', english: 'Skin disease', confidence: 0.85 },
      'kshudra': { icd11: 'TM22.2', english: 'Minor skin disorder', confidence: 0.8 }
    };
    
    const searchText = [
      term.sanskrit,
      term.sanskritDiacritic, 
      term.english,
      term.display
    ].filter(Boolean).join(' ').toLowerCase();
    
    for (const [key, mapping] of Object.entries(commonMappings)) {
      if (searchText.includes(key.toLowerCase())) {
        return {
          source: 'SEMANTIC_MAPPING',
          englishTranslation: mapping.english,
          icd11Code: mapping.icd11,
          confidence: mapping.confidence,
          alternatives: []
        };
      }
    }
    
    return null;
  }

  fuzzySearch(query, options = {}) {
    if (!this.isLoaded || this.namasteData.length === 0) {
      console.log('- Data not loaded yet, returning empty results');
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    const limit = options.limit || 20;
    const results = [];

    for (const term of this.namasteData) {
      let relevanceScore = 0;

      if (term.code && term.code.toLowerCase() === searchTerm) {
        relevanceScore = 1.0;
      } else if (term.searchTerms && term.searchTerms.some(searchableItem => searchableItem === searchTerm)) {
        relevanceScore = 0.95;
      } else if (term.searchTerms && term.searchTerms.some(searchableItem => searchableItem.startsWith(searchTerm))) {
        relevanceScore = 0.8;
      } else if (term.searchTerms && term.searchTerms.some(searchableItem => searchableItem.includes(searchTerm))) {
        relevanceScore = 0.6;
      } else if (term.searchTerms && term.searchTerms.length > 0) {
        const bestFuzzyMatch = Math.max(
          ...term.searchTerms.map(searchableItem => 
            this.calculateSimilarity(searchTerm, searchableItem)
          )
        );
        if (bestFuzzyMatch > 0.5) {
          relevanceScore = bestFuzzyMatch * 0.4;
        }
      }

      if (relevanceScore > 0 && term.definition) {
        relevanceScore = Math.min(1.0, relevanceScore * 1.1);
      }

      if (relevanceScore > 0) {
        results.push({
          ...term,
          relevanceScore,
          systemName: 'NAMASTE',
          source: 'NAMASTE_CSV'
        });
      }
    }

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    if (longer.includes(shorter)) return 0.8;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return Math.max(0, (longer.length - distance) / longer.length);
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  getTermByCode(code) {
    return this.namasteData.find(term => term.code === code);
  }

  updateStats() {
    const systemBreakdown = {};
    const categoryBreakdown = {};
    
    this.namasteData.forEach(term => {
      systemBreakdown[term.system] = (systemBreakdown[term.system] || 0) + 1;
      categoryBreakdown[term.category] = (categoryBreakdown[term.category] || 0) + 1;
    });

    this.stats = {
      totalTerms: this.namasteData.length,
      translationsCache: this.translationCache.size,
      systemBreakdown,
      categoryBreakdown,
      isLoaded: this.isLoaded,
      sampleTerm: this.namasteData[0] || null
    };
  }

  getStats() {
    return this.stats;
  }

  // Create a sample CSV file for testing
//   createSampleCSV(csvPath) {
//     console.log('📝 Creating sample CSV for testing...');
//     const sampleData = `Code,Sanskrit,Sanskrit_Diacritical,Devanagari,English,System,Category,Definition
// NAM001,amavata,āmavāta,आमवात,Rheumatoid Arthritis,Ayurveda,Joint Disorder,A condition characterized by joint pain and stiffness
// NAM002,jvara,jvara,ज्वर,Fever,Ayurveda,Infectious Disease,Elevated body temperature with systemic symptoms
// NAM003,kasa,kāsa,कास,Cough,Ayurveda,Respiratory,Forceful expulsion of air from lungs
// NAM004,svasa,śvāsa,श्वास,Dyspnea,Ayurveda,Respiratory,Difficulty in breathing or shortness of breath
// NAM005,arsa,arśa,अर्श,Hemorrhoids,Ayurveda,Digestive,Swollen veins in the rectum and anus`;
    
//     try {
//       fs.writeFileSync(csvPath, sampleData, 'utf8');
//       console.log('✅ Sample CSV created successfully');
//     } catch (error) {
//       console.error('❌ Failed to create sample CSV:', error);
//     }
//   }
}
const dataLoader = new DataLoader();
module.exports = dataLoader;
