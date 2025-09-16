import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import DualSearchInterface from './components/search/DualSearchInterface';
import AdminPanel from './components/admin/AdminPanel';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import { apiService } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [serverStatus, setServerStatus] = useState('checking');
  const [systemStats, setSystemStats] = useState(null);
  const [appInfo, setAppInfo] = useState(null);

  useEffect(() => {
    checkServerHealth();
    loadSystemStats();
  }, []);

  const checkServerHealth = async () => {
    try {
      const health = await apiService.checkHealth();
      setServerStatus(health.status === 'healthy' ? 'healthy' : 'unhealthy');
      setAppInfo(health);
    } catch (error) {
      console.error('health check failed:', error);
      setServerStatus('unhealthy');
    }
  };

  const loadSystemStats = async () => {
    try {
      const stats = await apiService.getSystemStats();
      setSystemStats(stats.data);
    } catch (error) {
      console.error('failed to load system stats:', error);
      setSystemStats(null);
    }
  };

  const tabs = [
    {
      id: 'search',
      label: 'Searching & Mapping',
      icon: '🔍',
      component: DualSearchInterface,
      description: 'Creating NAMASTE and ICD-11 mappings'
    },
    {
      id: 'admin',
      label: 'System Info',
      icon: '📊',
      component: AdminPanel,
      description: 'view system statistics and data overview'
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  if (serverStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">connecting to ayuniq server...</p>
          <p className="mt-2 text-sm text-gray-500">loading namaste terminology data...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Header 
          serverStatus={serverStatus}
          systemStats={systemStats}
          appInfo={appInfo}
        />
        
        <Navigation 
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {serverStatus === 'unhealthy' && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 mx-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <strong>server connection issue:</strong> unable to connect to ayuniq backend. 
                  please ensure the server is running on port 8000.
                </p>
                <button 
                  onClick={checkServerHealth}
                  className="mt-2 text-sm text-red-600 underline hover:text-red-800"
                >
                  retry connection
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="container mx-auto px-4 py-6">
          {/* system status banner */}
          {/* {appInfo && serverStatus === 'healthy' && (
            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  {/* <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-green-800 font-medium">system online</span>
                    </div>
                    
                    {appInfo.data && (
                      <div className="text-sm text-green-700">
                        <span className="font-medium">{appInfo.data.totalTerms || 0}</span> namaste terms loaded
                      </div>
                    )}
                  </div> */}

                  {/* <div className="flex items-center space-x-6 text-sm text-green-600"> */}
                    {/* <div>
                      <span className="font-medium">data:</span> {appInfo.services?.dataLoader || 'unknown'}
                    </div> */}
                    {/* <div>
                      <span className="font-medium">who api:</span> {appInfo.services?.whoIcdApi || 'unknown'}
                    </div> */}
                  {/* </div> */}
                {/* </div> */}
              {/* </div> */}
            {/* </div> */}
         {/* )} */}

          {/* active tab header */}
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    {tabs.find(t => t.id === activeTab)?.icon}
                    <span className="ml-2">{tabs.find(t => t.id === activeTab)?.label}</span>
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {tabs.find(t => t.id === activeTab)?.description}
                  </p>
                </div>
                
                {systemStats && (
                  <div className="text-right">
                    <div className="text-sm text-gray-500">system status</div>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="text-xs">
                        <span className="font-medium">{systemStats.overview?.totalTerms || 0}</span>
                        <span className="text-gray-500"> terms</span>
                      </div>
                      <div className="text-xs">
                        <span className="font-medium">{systemStats.overview?.cachedTranslations || 0}</span>
                        <span className="text-gray-500"> translations</span>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        serverStatus === 'healthy' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {serverStatus}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* main content */}
          {ActiveComponent && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <ActiveComponent 
                serverStatus={serverStatus}
                onStatsUpdate={loadSystemStats}
                systemStats={systemStats}
                appInfo={appInfo}
              />
            </div>
          )}

          {/* quick stats */}
          {serverStatus === 'healthy' && systemStats && (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {systemStats.overview?.totalTerms || 0}
                </div>
                <div className="text-sm text-gray-600">total terms</div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {systemStats.overview?.cachedTranslations || 0}
                </div>
                <div className="text-sm text-gray-600">translations cached</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {systemStats.overview?.systemsAvailable || 0}
                </div>
                <div className="text-sm text-gray-600">medical systems</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className={`text-2xl font-bold ${
                  systemStats.overview?.whoApiStatus === 'connected' ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {systemStats.overview?.whoApiStatus === 'connected' ? '🌐' : '⚠️'}
                </div>
                <div className="text-sm text-gray-600">who icd-11 api</div>
              </div>
            </div>
          )}
        </main>

        {/* footer */}
        <footer className="bg-white border-t border-gray-200 py-8 mt-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <div className="text-sm text-gray-600">
                  <strong>ayuniq</strong> - bridging traditional and modern medicine
                </div>
                <div className="text-xs text-gray-500">
                  namaste to icd-11 translation | fhir r4 compliant
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <span>version 1.0.0</span>
                {appInfo && (
                  <span>backend: {appInfo.appName || 'ayuniq'}</span>
                )}
              </div>
            </div>

            {/* data attribution */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500 text-center">
                namaste terminology data provided by ministry of ayush, government of india
                • icd-11 codes from who international classification of diseases
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
