import type React from 'react';
import { useEffect, useState } from 'react';

const Popup: React.FC = () => {
  const [enableDEIFiltering, setEnableDEIFiltering] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['enableDEIFiltering'], data => {
      setEnableDEIFiltering(data.enableDEIFiltering || false);
    });
  }, []);

  const dismiss = () => {
    chrome.storage.local.set({ disablePopup: true });
  };

  return (
    <div className="bg-blue-700 flex items-center justify-center p-1">
      <div className="bg-white rounded shadow-lg max-w-lg w-full p-2">
        <h1 className="text-base font-bold text-center">Gamer's Choice Filter</h1>
        <h2 className="text-sm font-semibold mb-1 text-center">
          {enableDEIFiltering ? 'DEI' : 'Blocked Reviewer'} Detected
        </h2>
        <div className="flex justify-center space-x-4">
          <button
            onClick={dismiss}
            className="px-4 py-1 bg-blue-400 hover:bg-blue-500 text-white rounded focus:outline-none text-xs">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default Popup;
