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
    if (!selectedNamaste || !selectedICD11) {
      alert('please select one term from each table');
      return;
    }

    try {
      const response = await fetch('/api/mapping/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namasteCode: selectedNamaste.code,
          icd11Code: selectedICD11.code,
          icd11Display: selectedICD11.display,
          confidence: 85,
          doctorId: 'current-user', // need to replace with actual user id
          notes: `manual mapping created for search: "${query}"`
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('mapping created successfully');
        setManualMappings(prev => [result.mapping, ...prev]);
        setSelectedNamaste(null);
        setSelectedICD11(null);
      } else {
        alert('failed to create mapping: ' + result.error);
      }
    } catch (error) {
      console.error('mapping creation failed:', error);
      alert('failed to create mapping');
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
          NAMASTE & ICD-11 Mapping Interface
        </h1>
        
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="enter medical term to search..."
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
            results: <strong>{searchResults.namaste.total}</strong> namaste + <strong>{searchResults.icd11.total}</strong> icd-11 terms
          </div>
        ) : null}
      </div>

      {/* dual tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* namaste results table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-green-700 flex items-center gap-2">
              NAMASTE Results ({searchResults.namaste.total})
            </h3>
            <p className="text-sm text-gray-600">Traditional Ayurvedic Terminology</p>
          </div>
          
          <div className="overflow-auto max-h-96">
            {searchResults.namaste.results.length > 0 ? (
              <table className="w-full">
                <thead className="bg-green-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">select</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">code</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">sanskrit</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">english</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {searchResults.namaste.results.map((term) => (
                    <tr 
                      key={term.code}
                      className={`hover:bg-green-50 cursor-pointer ${
                        selectedNamaste?.code === term.code ? 'bg-green-100 border-l-4 border-green-500' : ''
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
                        <div className="text-sm font-medium text-gray-900">{term.sanskritDiacritic || term.sanskrit}</div>
                        {term.devanagari && (
                          <div className="text-sm text-gray-600">{term.devanagari}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{term.english || term.display}</div>
                        {term.definition && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">{term.definition}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {term.confidence}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                no namaste results found
              </div>
            )}
          </div>
        </div>

        {/* icd-11 results table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-blue-700 flex items-center gap-2">
              WHO ICD-11 Results ({searchResults.icd11.total})
            </h3>
            <p className="text-sm text-gray-600">International Classification of Diseases</p>
          </div>
          
          <div className="overflow-auto max-h-96">
            {searchResults.icd11.results.length > 0 ? (
              <table className="w-full">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">select</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">code</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">display</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">module</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {searchResults.icd11.results.map((term) => (
                    <tr 
                      key={term.code}
                      className={`hover:bg-blue-50 cursor-pointer ${
                        selectedICD11?.code === term.code ? 'bg-blue-100 border-l-4 border-blue-500' : ''
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
                        <div className="text-sm font-medium text-gray-900">{term.display}</div>
                        {term.definition && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">{term.definition}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{term.module}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
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
                no icd-11 results found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* manual mapping panel */}
      {(selectedNamaste || selectedICD11) && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow p-6 border-2 border-dashed border-gray-300">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Link size={20} className="text-purple-600" />
            create manual mapping
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* selected namaste */}
            <div className="bg-white rounded p-4 border border-green-300">
              <h4 className="font-medium text-green-700 mb-2">namaste selection:</h4>
              {selectedNamaste ? (
                <div>
                  <div className="font-mono text-sm text-green-700">{selectedNamaste.code}</div>
                  <div className="font-medium">{selectedNamaste.sanskritDiacritic || selectedNamaste.sanskrit}</div>
                  <div className="text-sm text-gray-600">{selectedNamaste.english || selectedNamaste.display}</div>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">no namaste term selected</div>
              )}
            </div>

            {/* arrow and button */}
            <div className="text-center">
              <div className="text-2xl text-gray-400 mb-2">↔</div>
              <button
                onClick={createMapping}
                disabled={!selectedNamaste || !selectedICD11}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                <Link size={16} />
                create mapping
              </button>
            </div>

            {/* selected icd-11 */}
            <div className="bg-white rounded p-4 border border-blue-300">
              <h4 className="font-medium text-blue-700 mb-2">icd-11 selection:</h4>
              {selectedICD11 ? (
                <div>
                  <div className="font-mono text-sm text-blue-700">{selectedICD11.code}</div>
                  <div className="font-medium">{selectedICD11.display}</div>
                  <div className="text-sm text-gray-600">{selectedICD11.module}</div>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">no icd-11 term selected</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* manual mappings history */}
      {manualMappings.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              recent mappings ({manualMappings.length})
            </h3>
          </div>
          
          <div className="overflow-auto max-h-64">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">namaste</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">icd-11</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">confidence</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">created</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">status</th>
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
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        {mapping.confidence}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(mapping.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {mapping.status.replace('_', ' ')}
                      </span>
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
