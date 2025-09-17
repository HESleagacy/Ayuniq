import React, { useState, useEffect } from 'react';
import { Search, Link } from 'lucide-react';

const DualSearchInterface = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    namaste: { results: [], total: 0 },
    icd11: { results: [], total: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [selectedNamaste, setSelectedNamaste] = useState(null);
  const [selectedICD11, setSelectedICD11] = useState(null);
  const [manualMappings, setManualMappings] = useState([]);

  // search function
  const handleSearch = async () => {
    if (!query.trim() || query.length < 2) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('search failed:', error);
    }
    setLoading(false);
  };

  // create manual mapping
  const createMapping = async () => {
    if (!selectedNamaste || !selectedICD11) return;

    try {
      const response = await fetch('/api/mapping/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namasteCode: selectedNamaste.code,
          icd11Code: selectedICD11.code,
          icd11Display: selectedICD11.display,
          confidence: 85,
          doctorId: 'doctor',
          notes: `mapping for: ${query}`
        })
      });

      const result = await response.json();
      if (result.success) {
        setManualMappings(prev => [result.mapping, ...prev]);
        setSelectedNamaste(null);
        setSelectedICD11(null);
      }
    } catch (error) {
      console.error('mapping creation failed:', error);
    }
  };

  // load existing mappings
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

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* search header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Search & Manual Mapping
        </h1>
        
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="enter medical term..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Search size={20} />
            {loading ? 'searching...' : 'search'}
          </button>
        </div>

        {searchResults.namaste.total > 0 || searchResults.icd11.total > 0 ? (
          <div className="mt-4 text-sm text-gray-600">
            found: {searchResults.namaste.total} namaste + {searchResults.icd11.total} icd-11 terms
          </div>
        ) : null}
      </div>

      {/* dual tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* namaste results */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-green-700">
              NAMASTE Results ({searchResults.namaste.total})
            </h3>
          </div>
          
          <div className="overflow-auto max-h-96">
            {searchResults.namaste.results.length > 0 ? (
              <table className="w-full">
                <thead className="bg-green-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">select</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">code</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">term</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {searchResults.namaste.results.map((term) => (
                    <tr 
                      key={term.code}
                      className={`hover:bg-green-50 cursor-pointer ${
                        selectedNamaste?.code === term.code ? 'bg-green-100' : ''
                      }`}
                      onClick={() => setSelectedNamaste(term)}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="radio"
                          name="namaste"
                          checked={selectedNamaste?.code === term.code}
                          onChange={() => setSelectedNamaste(term)}
                          className="text-green-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-green-700">{term.code}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{term.sanskritDiacritic || term.sanskrit}</div>
                        <div className="text-xs text-gray-600">{term.english || term.display}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          {term.confidence}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                no results found
              </div>
            )}
          </div>
        </div>

        {/* icd-11 results */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-blue-700">
              ICD-11 Results ({searchResults.icd11.total})
            </h3>
          </div>
          
          <div className="overflow-auto max-h-96">
            {searchResults.icd11.results.length > 0 ? (
              <table className="w-full">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">select</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">code</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">term</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {searchResults.icd11.results.map((term) => (
                    <tr 
                      key={term.code}
                      className={`hover:bg-blue-50 cursor-pointer ${
                        selectedICD11?.code === term.code ? 'bg-blue-100' : ''
                      }`}
                      onClick={() => setSelectedICD11(term)}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="radio"
                          name="icd11"
                          checked={selectedICD11?.code === term.code}
                          onChange={() => setSelectedICD11(term)}
                          className="text-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-blue-700">{term.code}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{term.display}</div>
                        <div className="text-xs text-gray-600">{term.module}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          term.isTM2 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {term.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                no results found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* mapping creation */}
      {(selectedNamaste && selectedICD11) && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Mapping</h3>
          
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="bg-white rounded p-4 border border-green-300">
              <div className="font-mono text-sm text-green-700">{selectedNamaste.code}</div>
              <div className="font-medium">{selectedNamaste.sanskritDiacritic || selectedNamaste.sanskrit}</div>
            </div>

            <div className="text-center">
              <button
                onClick={createMapping}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 mx-auto"
              >
                <Link size={16} />
                Create Mapping
              </button>
            </div>

            <div className="bg-white rounded p-4 border border-blue-300">
              <div className="font-mono text-sm text-blue-700">{selectedICD11.code}</div>
              <div className="font-medium">{selectedICD11.display}</div>
            </div>
          </div>
        </div>
      )}

      {/* mappings list */}
      {manualMappings.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Manual Mappings ({manualMappings.length})
            </h3>
          </div>
          
          <div className="overflow-auto max-h-64">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">namaste</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">icd-11</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {manualMappings.slice(0, 10).map((mapping) => (
                  <tr key={mapping.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-mono text-sm text-green-700">{mapping.namasteCode}</div>
                      <div className="text-sm text-gray-600">{mapping.namasteDisplay}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-sm text-blue-700">{mapping.icd11Code}</div>
                      <div className="text-sm text-gray-600">{mapping.icd11Display}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(mapping.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DualSearchInterface;
