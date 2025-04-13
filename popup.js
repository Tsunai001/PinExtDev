document.addEventListener('DOMContentLoaded', function() {
  // Default configuration
  const defaultConfig = {
    filterSponsoredPins: true,
    filterExternalLinks: true,
    filterVideos: false,
    filterImages: false,
    extensionEnabled: true,
    overlayBoardSelect: false,
    overlaySave: false,
    overlayShare: false,
    overlayMoreOptions: false,
    overlayEdit: false
  };

  // Retrieve stored configuration from chrome.storage.sync
  chrome.storage.sync.get(defaultConfig, function(items) {
    const toggleSponsored = document.getElementById('toggleSponsored');
    const toggleExternal = document.getElementById('toggleExternal');
    const toggleVideos = document.getElementById('toggleVideos');
    const toggleImages = document.getElementById('toggleImages');
    const toggleExtension = document.getElementById('toggleExtension');
    const toggleBoardSelect = document.getElementById('toggleBoardSelectButton');
    const toggleSaveButton = document.getElementById('toggleSaveButton');
    const toggleShareButton = document.getElementById('toggleShareButton');
    const toggleMoreOptionsButton = document.getElementById('toggleMoreOptionsButton');
    const toggleEditButton = document.getElementById('toggleEditButton');

    toggleSponsored.checked = items.filterSponsoredPins;
    toggleExternal.checked = items.filterExternalLinks;
    toggleVideos.checked = items.filterVideos;
    toggleImages.checked = items.filterImages;
    toggleExtension.checked = items.extensionEnabled;
    toggleBoardSelect.checked = items.overlayBoardSelect;
    toggleSaveButton.checked = items.overlaySave;
    toggleShareButton.checked = items.overlayShare;
    toggleMoreOptionsButton.checked = items.overlayMoreOptions;
    toggleEditButton.checked = items.overlayEdit;

    // Send the initial settings to the content script.
    sendUpdate(items);
  });

  // Helper function to send updated filter settings to the content script.
  function sendUpdate(settings) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          type: 'updateFilterSettings',
          settings
        });
      }
    });
  }

  // Listen for changes on the toggles and update storage & content script accordingly.
  document.getElementById('toggleSponsored').addEventListener('change', function() {
    const sponsored = this.checked;
    updateStorageAndSend({ filterSponsoredPins: sponsored });
  });

  document.getElementById('toggleExternal').addEventListener('change', function() {
    const external = this.checked;
    updateStorageAndSend({ filterExternalLinks: external });
  });

  document.getElementById('toggleVideos').addEventListener('change', function() {
    const videos = this.checked;
    updateStorageAndSend({ filterVideos: videos });
  });

  document.getElementById('toggleImages').addEventListener('change', function() {
    const photos = this.checked;
    updateStorageAndSend({ filterImages: photos });
  });

  document.getElementById('toggleExtension').addEventListener('change', function() {
    const enabled = this.checked;
    updateStorageAndSend({ extensionEnabled: enabled });
  });

  // Function to update settings and send the changes to content script
  function updateStorageAndSend(updateData) {
    chrome.storage.sync.set(updateData, function() {
      chrome.storage.sync.get(function(items) {
        sendUpdate(items);
      });
    });
  }

  // Handle dropdown toggle visibility
  document.getElementById('toggleDropdown').addEventListener('click', function() {
    const dropdown = document.getElementById('overlayDropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    document.getElementById('toggleDropdown').textContent = dropdown.style.display === 'block' ? '▲' : '▼';
  });
});