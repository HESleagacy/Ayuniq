const axios = require('axios');
require('dotenv').config();

const WHO_ICD_CONFIG = {
  // get credentials from environment variables
  clientId: process.env.WHO_CLIENT_ID,
  clientSecret: process.env.WHO_CLIENT_SECRET,
  
  // who icd-11 api v2 endpoints
  tokenEndpoint: process.env.WHO_TOKEN_URL || 'https://icdaccessmanagement.who.int/connect/token',
  baseUrl: process.env.WHO_API_BASE_URL || 'https://id.who.int/icd',
  apiVersion: 'v2',
  scope: 'icdapi_access',
  grantType: 'client_credentials',
  
  timeout: parseInt(process.env.WHO_API_TIMEOUT) || 15000,
  retryAttempts: 3,
  retryDelay: 1000
};

class WHOIcdService {
  constructor() {
    this.config = WHO_ICD_CONFIG;
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // validate required environment variables
    if (!this.config.clientId || !this.config.clientSecret) {
      console.error('# missing who icd-11 api credentials in environment variables');
      console.error('# required: WHO_CLIENT_ID and WHO_CLIENT_SECRET');
    }
    
    this.axiosInstance = axios.create({
      timeout: this.config.timeout,
      baseURL: this.config.baseUrl
    });
    
    this.setupInterceptors();
  }

  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        await this.ensureValidToken();
        
        if (this.accessToken && !config.url.includes('/connect/token')) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        
        config.headers['API-Version'] = this.config.apiVersion;
        config.headers['Accept'] = 'application/json';
        config.headers['Accept-Language'] = 'en';
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && !error.config._retry) {
          error.config._retry = true;
          this.accessToken = null;
          this.tokenExpiry = null;
          await this.ensureValidToken();
          if (this.accessToken) {
            error.config.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.axiosInstance.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async authenticate() {
    try {
      console.log('# authenticating with who icd-11 api v2...');
      
      const authData = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: this.config.scope,
        grant_type: this.config.grantType
      });

      const response = await axios.post(
        this.config.tokenEndpoint,
        authData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: this.config.timeout
        }
      );

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
        
        console.log('# who icd-11 api v2 authentication successful');
        return this.accessToken;
      } else {
        throw new Error('No access token received from WHO API');
      }
      
    } catch (error) {
      console.error('# who icd-11 authentication failed:', error.response?.data || error.message);
      return null;
    }
  }

  async ensureValidToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  // main search function for icd-11 terms
  async searchTerms(searchTerm, limit = 20, options = {}) {
    try {
      if (!this.accessToken) {
        console.log('# no who access token, skipping who search');
        return [];
      }

      console.log(`- who icd-11 search for: "${searchTerm}"`);

      // search endpoint for icd-11
      const searchEndpoint = '/release/11/2024-01/mms/search';
      
      const searchParams = {
        q: searchTerm,
        subtreeFilterUsesFoundationDescendants: false,
        includeKeywordResult: true,
        useFlexisearch: true,
        flatResults: true,
        highlightingEnabled: false,
        medicalCodingMode: true,
        // prioritize traditional medicine codes if requested
        chapterFilter: options.preferTM2 ? '26' : undefined,
        ...options
      };

      const response = await this.axiosInstance.get(searchEndpoint, {
        params: searchParams
      });

      let searchResults = [];
      
      if (response.data.destinationEntities) {
        searchResults = response.data.destinationEntities;
      } else if (response.data.entity) {
        searchResults = Array.isArray(response.data.entity) ? response.data.entity : [response.data.entity];
      }

      const processedResults = searchResults
        .filter(entity => entity && (entity.theCode || entity.code) && (entity.title || entity.label))
        .map(entity => {
          const code = entity.theCode || entity.code || '';
          const display = entity.title?.['@value'] || entity.title || entity.label?.['@value'] || entity.label || '';
          const isTM2 = code.startsWith('TM');
          
          return {
            code: code,
            display: display,
            definition: entity.definition?.['@value'] || entity.definition || '',
            system: 'http://id.who.int/icd/release/11/mms',
            systemName: isTM2 ? 'WHO ICD-11 TM2' : 'WHO ICD-11',
            module: isTM2 ? 'Traditional Medicine' : 'General Medicine',
            url: entity['@id'] || entity.id,
            searchScore: entity.score || entity.matchingScore || 0,
            source: 'WHO_ICD_API_v2',
            synonyms: entity.synonym ? (Array.isArray(entity.synonym) ? entity.synonym : [entity.synonym]) : [],
            parent: entity.parent?.[0]?.['@id'] || null,
            priority: isTM2 ? 1.2 : 1.0
          };
        })
        .filter(result => result.display.length > 0)
        // sort with tm2 codes first
        .sort((a, b) => {
          if (a.code.startsWith('TM') && !b.code.startsWith('TM')) return -1;
          if (!a.code.startsWith('TM') && b.code.startsWith('TM')) return 1;
          return (b.searchScore || 0) - (a.searchScore || 0);
        })
        .slice(0, limit);

      const icd11Count = processedResults.length;
      console.log(`# who search results: ${icd11Count} total, ${icd11Count} icd-11 codes found`);
      return processedResults;
      
    } catch (error) {
      console.error('# who icd v2 search failed:', error.response?.status, error.message);
      if (error.response?.status === 429) {
        console.log('# who api rate limit reached, backing off...');
      }
      return [];
    }
  }

  // translate term to icd-11 with confidence scoring
  async translateToICD11(term, context = {}) {
    try {
      if (!this.accessToken) {
        console.log('# no who access token, cannot translate');
        return null;
      }

      console.log(`- who translation: "${term}" (preferTM2: ${context.preferTM2 || false})`);
      
      let searchResults = [];
      
      // try tm2-focused search first if requested
      if (context.preferTM2 !== false) {
        console.log('- searching tm2 codes first...');
        searchResults = await this.searchTerms(term, 5, { preferTM2: true });
        
        // filter for tm2 codes specifically
        const tm2Results = searchResults.filter(r => r.code.startsWith('TM'));
        if (tm2Results.length > 0) {
          searchResults = tm2Results;
          console.log(`# found ${tm2Results.length} tm2 matches`);
        }
      }
      
      // fallback to general search if no results
      if (searchResults.length === 0) {
        console.log('- fallback to general icd-11 search...');
        searchResults = await this.searchTerms(term, 3);
      }
      
      // try contextual search with category
      if (searchResults.length === 0 && context.category) {
        const contextualTerm = `${context.category} ${term}`;
        console.log(`- contextual search: "${contextualTerm}"`);
        searchResults = await this.searchTerms(contextualTerm, 3);
      }

      if (searchResults.length > 0) {
        const bestMatch = searchResults[0];
        const confidence = this.calculateConfidence(term, bestMatch.display, bestMatch.searchScore, bestMatch.code.startsWith('TM'));
        
        console.log(`- best match: ${bestMatch.display} (${bestMatch.code}) - ${Math.round(confidence * 100)}%`);
        
        return {
          source: 'WHO_ICD_11_v2',
          englishTranslation: bestMatch.display,
          icd11Code: bestMatch.code,
          confidence: confidence,
          system: bestMatch.system,
          systemName: bestMatch.systemName,
          definition: bestMatch.definition,
          url: bestMatch.url,
          module: bestMatch.module,
          alternatives: searchResults.slice(1, 4).map(result => ({
            display: result.display,
            code: result.code,
            confidence: this.calculateConfidence(term, result.display, result.searchScore, result.code.startsWith('TM')),
            definition: result.definition,
            module: result.module
          }))
        };
      }

      console.log(`# no who translation found for: "${term}"`);
      return null;
      
    } catch (error) {
      console.error('# translation to icd-11 failed:', error.message);
      return null;
    }
  }

  // calculate confidence score for matches
  calculateConfidence(searchTerm, resultDisplay, searchScore = 0, isTM2 = false) {
    if (!searchTerm || !resultDisplay) return 0.1;
    
    const normalizedSearch = searchTerm.toLowerCase().trim();
    const normalizedResult = resultDisplay.toLowerCase().trim();
    
    // base confidence from string matching
    let confidence = 0;
    
    if (normalizedSearch === normalizedResult) {
      confidence = 0.98;
    } else {
      const similarity = this.calculateStringSimilarity(normalizedSearch, normalizedResult);
      const apiScore = Math.min(searchScore / 100, 1) * 0.4;
      const similarityScore = similarity * 0.6;
      confidence = apiScore + similarityScore;
    }
    
    // boost tm2 codes for traditional medicine terms
    if (isTM2) {
      confidence = Math.min(0.98, confidence * 1.15);
    }
    
    // boost for medical terminology matches
    if (this.isMedicalTermMatch(normalizedSearch, normalizedResult)) {
      confidence = Math.min(0.95, confidence * 1.1);
    }
    
    const finalConfidence = Math.min(0.98, Math.max(0.1, confidence));
    
    return finalConfidence;
  }

  isMedicalTermMatch(searchTerm, resultTerm) {
    const medicalKeywords = [
      'fever', 'arthritis', 'cough', 'pain', 'disorder', 'disease', 'syndrome',
      'inflammation', 'infection', 'respiratory', 'digestive', 'cardiovascular'
    ];
    
    return medicalKeywords.some(keyword => 
      searchTerm.includes(keyword) && resultTerm.includes(keyword)
    );
  }

  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    if (longer.includes(shorter)) return 0.85;
    if (shorter.includes(longer)) return 0.85;
    
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

  async isHealthy() {
    try {
      await this.ensureValidToken();
      return !!this.accessToken;
    } catch (error) {
      return false;
    }
  }

  async testConnection() {
    try {
      console.log('- testing who icd api v2 connection...');
      
      const isHealthy = await this.isHealthy();
      if (!isHealthy) {
        throw new Error('Authentication failed');
      }
      
      const testResults = await this.searchTerms('fever', 1);
      
      console.log('# who icd api v2 connection test successful');
      return {
        status: 'connected',
        authenticated: true,
        testSearchResults: testResults.length,
        apiVersion: this.config.apiVersion
      };
      
    } catch (error) {
      console.error('# who icd api v2 connection test failed:', error.message);
      return {
        status: 'failed',
        authenticated: false,
        error: error.message,
        apiVersion: this.config.apiVersion
      };
    }
  }
}

// create singleton instance
const whoIcdService = new WHOIcdService();

module.exports = whoIcdService;
