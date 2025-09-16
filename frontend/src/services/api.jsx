// WORKING API Service - Clean and Simple
class APIService {
  constructor(baseURL = 'http://localhost:8000/api') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Health and System
  async checkHealth() {
    return this.request('/health');
  }

  async getSystemStats() {
    return this.request('/admin/statistics');
  }

  // SIMPLE Search - No loops
  async searchTerms(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      limit: options.limit || 20
    });

    return this.request(`/search?${params.toString()}`);
  }

  // SIMPLE Translation - No recursive calls
  async translateTerm(term, sourceLanguage = 'auto', targetLanguage = 'en') {
    return this.request('/translate', {
      method: 'POST',
      body: JSON.stringify({
        term,
        sourceLanguage,
        targetLanguage
      })
    });
  }

  // FHIR Operations - Simple endpoints
  async lookupCode(code, system, options = {}) {
    return this.request('/fhir/lookup', {
      method: 'POST',
      body: JSON.stringify({
        code,
        system,
        ...options
      })
    });
  }

  async translateNAMASTEToICD11(namasteCode) {
    return this.request('/fhir/translate', {
      method: 'POST',
      body: JSON.stringify({
        code: namasteCode,
        system: 'https://ayush.gov.in/fhir/CodeSystem/namaste',
        targetsystem: 'http://id.who.int/icd/release/11/mms'
      })
    });
  }

  // Admin operations
  async getProcessingStats() {
    try {
      const stats = await this.getSystemStats();
      return {
        success: true,
        data: stats.data
      };
    } catch (error) {
      throw error;
    }
  }
}

// Create and export singleton instance
export const apiService = new APIService();
export { APIService };