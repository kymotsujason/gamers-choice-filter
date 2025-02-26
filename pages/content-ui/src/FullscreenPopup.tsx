import type React from 'react';
import { useEffect, useState } from 'react';

const FullscreenPopup: React.FC = () => {
  const [enableDEIFiltering, setEnableDEIFiltering] = useState(false);
  const [windowWillClose, setWindowWillClose] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['enableDEIFiltering'], data => {
      setEnableDEIFiltering(data.enableDEIFiltering || false);
    });
    if (window.history.length <= 1) {
      setWindowWillClose(true);
    }
  }, []);
  const handleYes = () => {
    chrome.storage.local.set({ disableFullscreen: true });
  };

  const handleNo = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  };

  return (
    <div className="bg-blue-700 flex items-center justify-center p-4 h-[264px]">
      <div className="bg-gray-900 rounded shadow-lg w-full h-full p-6">
        <h1 className="text-3xl text-white font-bold mb-4 text-center">Gamer's Choice Filter</h1>
        <h2 className="text-xl text-white font-semibold mb-2 text-center">
          {enableDEIFiltering ? 'DEI' : 'Blocked Reviewer'} Detected
        </h2>
        <p className="mb-2 text-white text-center">
          This page was written by a {enableDEIFiltering ? 'DEI' : 'Blocked'} Reviewer and may contain related
          content/bias. Continue?
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleNo}
            title={windowWillClose ? 'Warning: This tab has no previous history, pressing no will close the tab' : ''}
            className="px-16 py-2 bg-blue-400 hover:bg-blue-500 text-white rounded focus:outline-none">
            No
          </button>
          <button
            onClick={handleYes}
            className="px-16 py-2 bg-blue-400 hover:bg-blue-500 text-white rounded focus:outline-none">
            Yes
          </button>
        </div>
        {windowWillClose ? (
          <p className="mt-2 text-black text-center text-xs">
            Warning: This tab has no previous history, pressing no will close the tab
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default FullscreenPopup;
