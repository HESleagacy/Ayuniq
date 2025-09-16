import React, { useState } from 'react';

const AdminPanel = ({ serverStatus, systemStats, appInfo }) => {
  if (serverStatus !== 'healthy') {
    return (
      <div className="p-6 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            system information requires a healthy backend connection
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">System Overview</h2>
        <p className="text-sm text-gray-600 mt-1">basic information about your ayuniq system</p>
      </div>

      {/* quick stats */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {systemStats.overview?.totalTerms || 0}
            </div>
            <div className="text-sm text-blue-800">namaste terms loaded</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {systemStats.overview?.cachedTranslations || 0}
            </div>
            <div className="text-sm text-green-800">translations cached</div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className={`text-2xl font-bold ${
              systemStats.overview?.whoApiStatus === 'connected' ? 'text-green-600' : 'text-orange-600'
            }`}>
              {systemStats.overview?.whoApiStatus === 'connected' ? 'connected' : 'disconnected'}
            </div>
            <div className="text-sm text-purple-800">who icd-11 api</div>
          </div>
        </div>
      )}

      {/* basic info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-medium text-gray-800 mb-4">System Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Application</span>
            <span className="font-medium">ayuniq</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">version</span>
            <span className="font-medium">{appInfo?.version || '1.0.0'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Backend Status</span>
            <span className={`font-medium ${
              serverStatus === 'healthy' ? 'text-green-600' : 'text-red-600'
            }`}>
              {serverStatus}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Data Loader</span>
            <span className={`font-medium ${
              appInfo?.services?.dataLoader === 'loaded' ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {appInfo?.services?.dataLoader || 'unknown'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">last updated</span>
            <span className="font-medium text-sm">
              {systemStats?.lastUpdated ? 
                new Date(systemStats.lastUpdated).toLocaleString() : 
                'unknown'
              }
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AdminPanel;
