import React, { useState, useEffect } from 'react';

const ResourceBuilder = ({ serverStatus }) => {
  const [manualMappings, setManualMappings] = useState([]);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [patientId, setPatientId] = useState('PAT-001');
  const [diagnosis, setDiagnosis] = useState('');
  const [fhirResult, setFhirResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // load mappings
  useEffect(() => {
    const loadMappings = async () => {
      try {
        const response = await fetch('/api/mapping/list');
        const data = await response.json();
        if (data.success) {
          setManualMappings(data.mappings);
        }
      } catch (error) {
        console.error('failed to load mappings:', error);
      }
    };
    loadMappings();
  }, []);

  // generate fhir
  const generateFHIR = async () => {
    if (!selectedMapping || !patientId || !diagnosis) return;

    setLoading(true);
    try {
      const response = await fetch('/api/generate-fhir-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          diagnosis,
          namasteCode: selectedMapping.namasteCode,
          icd11Code: selectedMapping.icd11Code
        })
      });

      const result = await response.json();
      if (result.success) {
        setFhirResult(result);
      }
    } catch (error) {
      console.error('fhir generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (serverStatus !== 'healthy') {
    return (
      <div className="p-6 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">FHIR service requires healthy backend connection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">FHIR Resource Generator</h3>
        <p className="text-sm text-gray-600">Convert manual mappings to FHIR bundles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* mapping selection */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-4">Select Mapping</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. fever, cough etc."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Mapping</label>
              <div className="max-h-64 overflow-auto border border-gray-300 rounded">
                {manualMappings.length > 0 ? (
                  manualMappings.map((mapping) => (
                    <div
                      key={mapping.id}
                      onClick={() => setSelectedMapping(mapping)}
                      className={`p-3 cursor-pointer border-b hover:bg-gray-50 ${
                        selectedMapping?.id === mapping.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-mono text-xs text-green-700">{mapping.namasteCode}</div>
                          <div className="text-sm font-medium">{mapping.namasteDisplay}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-xs text-blue-700">{mapping.icd11Code}</div>
                          <div className="text-sm">{mapping.icd11Display}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">No mappings found</div>
                )}
              </div>
            </div>

            <button
              onClick={generateFHIR}
              disabled={loading || !selectedMapping || !patientId || !diagnosis}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Generating FHIR...' : '🏥 Generate FHIR Bundle'}
            </button>
          </div>
        </div>

        {/* fhir result */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-4">FHIR Result</h4>
          
          {fhirResult ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="text-sm text-green-800">
                  ✅ Bundle ID: {fhirResult.fhir_bundle?.id}
                </div>
                <div className="text-sm text-green-800">
                  📋 Claim ID: {fhirResult.insurance_claim?.claim_id}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Codes: {fhirResult.codes_used?.join(', ')}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium">FHIR Bundle</h5>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(fhirResult.fhir_bundle, null, 2));
                    }}
                    className="px-2 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                  >
                    Copy
                  </button>
                </div>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-64 border">
{JSON.stringify(fhirResult.fhir_bundle, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">📄</div>
              <p>Select mapping and generate FHIR bundle</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceBuilder;
