// Header Component - Ayuniq Branding
import React from 'react';

const Header = ({ serverStatus, systemStats, appInfo }) => {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                AYUNIQ
              </h1>
              <p className="text-blue-100 mt-2">
                NAMASTE & ICD-11 Mapping Platform
              </p>
            </div>
            
            {/* Real-time Data Display */}
            {appInfo && appInfo.data && (
              <div className="hidden md:flex items-center space-x-6 ml-8 text-blue-100">
                <div className="text-sm">
                  <div className="font-medium text-white">{appInfo.data.totalTerms}</div>
                  <div className="text-xs">Terms Loaded</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-white">{appInfo.data.cachedTranslations}</div>
                  <div className="text-xs">Translations</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-white">
                    {Object.keys(appInfo.data.systemBreakdown || {}).length}
                  </div>
                  <div className="text-xs">Medical Systems</div>
                </div>
              </div>
            )}
          </div>
          
          <div className="text-right">
            {/* Server Status */}
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              serverStatus === 'healthy' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                serverStatus === 'healthy' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              {serverStatus === 'healthy' ? 'System Online' : 'System Offline'}
            </div>
            
            {/* Service Status Indicators */}
            {appInfo && appInfo.services && (
              <div className="flex items-center space-x-4 mt-2 text-xs text-blue-100">
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    appInfo.services.dataLoader === 'loaded' ? 'bg-green-400' : 'bg-yellow-400'
                  }`}></div>
                  <span>Data: {appInfo.services.dataLoader}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    appInfo.services.whoIcdApi === 'connected' ? 'bg-green-400' : 'bg-orange-400'
                  }`}></div>
                  <span>WHO API: {appInfo.services.whoIcdApi}</span>
                </div>
              </div>
            )}

            {/* Medical Systems Available */}
            {appInfo && appInfo.data && appInfo.data.systemBreakdown && (
              <div className="text-xs text-blue-100 mt-2">
                Systems: {Object.keys(appInfo.data.systemBreakdown).join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Quick Access Info Bar */}
        {serverStatus === 'healthy' && appInfo && (
          <div className="mt-4 pt-4 border-t border-blue-500/30">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-6 text-blue-100">
                <span>🔍 Real-time Search</span>
                <span>🔄 Live Translation</span>
                <span>🏥 FHIR R4 Compliant</span>
                <span>🌐 WHO ICD-11 Integration</span>
              </div>
              
              <div className="text-blue-100">
                Version: {appInfo.version || '1.0.0'}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;