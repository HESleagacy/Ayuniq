// who icd-11 api config.
require('dotenv').config();

const WHO_ICD_CONFIG = {
  // auth. creds. (from .env)
  clientId: process.env.WHO_CLIENT_ID,
  clientSecret: process.env.WHO_CLIENT_SECRET,

  // who icd-11 v2 endpoints
  tokenEndpoint: process.env.WHO_TOKEN_URL || 'https://icdaccessmanagement.who.int/connect/token',
  baseUrl: process.env.WHO_API_BASE_URL || 'https://id.who.int/icd',
  apiVersion: 'v2',
  
  // API endpoints
  endpoints: {
    search: '/release/11/2024-01/mms/search',
    lookup: '/release/11/2024-01/mms',
    tm2: '/release/11/2024-01/mms/TM',
    biomedicine: '/release/11/2024-01/mms'
  },
  
  // auth. settings
  scope: 'icdapi_access',
  grantType: 'client_credentials',
  
  // request settings
  timeout: parseInt(process.env.WHO_API_TIMEOUT) || 15000,
  retryAttempts: 3,
  retryDelay: 1000,

  // rate limiting
  maxRequestsPerMinute: parseInt(process.env.WHO_API_REQUESTS_PER_MINUTE) || 60,
  requestDelay: parseInt(process.env.WHO_API_REQUEST_DELAY) || 200
};

// basic validation 
if (!WHO_ICD_CONFIG.clientId || !WHO_ICD_CONFIG.clientSecret) {
  console.error('# Missing WHO ICD-11 API credentials in environment variables');
  console.error('# Required: WHO_CLIENT_ID and WHO_CLIENT_SECRET');
}

module.exports = WHO_ICD_CONFIG;
