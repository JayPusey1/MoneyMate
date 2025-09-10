import React, { useEffect } from 'react';

// Component to diagnose data issues in a React application
const DataDebugger = ({ data, name = "Data", expanded = false }) => {
  useEffect(() => {
    console.log(`DataDebugger - ${name}:`, data);
  }, [data, name]);

  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 p-4 mb-4 rounded">
      <h3 className="text-yellow-800 font-bold mb-2 flex items-center">
        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Data Debugger: {name}
      </h3>
      
      <div className="mt-2">
        <div className="text-sm text-yellow-700">
          <strong>Type:</strong> {Array.isArray(data) ? 'Array' : typeof data}
        </div>
        
        {Array.isArray(data) && (
          <div className="text-sm text-yellow-700">
            <strong>Array Length:</strong> {data.length}
          </div>
        )}
        
        {typeof data === 'object' && data !== null && !Array.isArray(data) && (
          <div className="text-sm text-yellow-700">
            <strong>Object Keys:</strong> {Object.keys(data).join(', ') || 'None'}
          </div>
        )}
        
        {expanded && (
          <div className="mt-2">
            <strong className="text-sm text-yellow-800">Data Preview:</strong>
            <pre className="mt-1 bg-yellow-100 p-2 rounded text-xs overflow-auto max-h-60">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="flex justify-end mt-2">
        <button 
          onClick={() => console.log(`Full ${name} data:`, data)}
          className="text-xs bg-yellow-200 px-2 py-1 rounded hover:bg-yellow-300 text-yellow-800"
        >
          Log to Console
        </button>
      </div>
    </div>
  );
};

export default DataDebugger;