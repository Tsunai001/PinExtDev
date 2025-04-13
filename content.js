// Inject global CSS rule to preemptively hide the overlay element
const style = document.createElement('style');
style.textContent = `
  div[style*="background-color: rgba(0, 0, 0, 0.4)"] {
    opacity: 0 !important;
  }
`;
document.head.appendChild(style);

(function() {

  // xxxxxxxx[ START ]xxxxxxxx

  // ========[ INITIAL SETUP ]========

  // -[ FORCE_HOVER ]-
  const pwsRoot = document.getElementById('__PWS_ROOT__');
  if (pwsRoot) {
    const blockManualHover = function(e) {
      // Only block user-initiated events.
      if (e.isTrusted) {
        // Allow events from known interactive elements (buttons or links).
        if (e.target.closest('button, a')) {
          return;
        }
        e.stopImmediatePropagation();
      }
    };
    pwsRoot.addEventListener('mouseover', blockManualHover, true);
    pwsRoot.addEventListener('pointerover', blockManualHover, true);
  }
  // -[ END OF FORCE_HOVER ]-

  // -[ GLOBAL_THROTTLE ]-
  function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function() {
      const context = this;
      const args = arguments;
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(function() {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }
  // -[ END OF GLOBAL_THROTTLE ]-

  // ========[ END OF INITIAL SETUP ]========

  // ========[ ELEMENT PROCESSING ]========
  // -[ WEAKMAP ]-
  const storedOverlayContent = new WeakMap();
  // -[ END OF WEAKMAP ]-

  // -[ FORCE_VISIBILITY ]-
  function forceChildVisibility(pin) {
    const visitButton = pin.querySelector('a[data-test-id="visit-button"]');
    if (visitButton) {
      visitButton.style.display = "block";
      visitButton.style.visibility = "visible";
      visitButton.style.opacity = "1";
    }
    const savedInfo = pin.querySelector('div[data-test-id="saved-info"]');
    if (savedInfo) {
      savedInfo.style.display = "block";
      savedInfo.style.visibility = "visible";
      savedInfo.style.opacity = "1";
    }
    // NEW: Scan all child divs and if any has an inline style with the exact text
    // "background-color: rgba(0, 0, 0, 0.4)", set its opacity to 0 and disable pointer events.
    const allChildDivs = pin.querySelectorAll('div');
    allChildDivs.forEach(div => {
      const styleAttr = div.getAttribute("style");
      if (styleAttr && styleAttr.includes("background-color: rgba(0, 0, 0, 0.4)")) {
        div.style.opacity = "0";
        div.style.pointerEvents = "none";
      }
    });
  }
  // -[ END OF FORCE_VISIBILITY ]-

  // -[ CAPTURE_VISIBILITY ]-
  function captureOverlayContent(pin) {
    const topOverlay = pin.querySelector('div[data-test-id="better-save"]');
    let bottomOverlay = pin.querySelector('div[data-test-id="send-share-link"]');
    const overflowMenu = pin.querySelector('div.overflow-menu-button');
    if (overflowMenu) {
      bottomOverlay = bottomOverlay 
        ? bottomOverlay.outerHTML + overflowMenu.outerHTML 
        : overflowMenu.outerHTML;
    } else if (bottomOverlay) {
      bottomOverlay = bottomOverlay.outerHTML;
    }
    if (topOverlay && bottomOverlay) {
      storedOverlayContent.set(pin, { 
        top: topOverlay.outerHTML, 
        bottom: bottomOverlay 
      });
    }
  }
  // -[ END OF CAPTURE_VISIBILITY ]-

  // -[ CLONE_VISIBILITY ]-
  function insertStaticClone(pin) {
    const stored = storedOverlayContent.get(pin);
    if (!stored) return;
    
    const staticContainer = pin.querySelector('div.zI7.iyn.Hsu[style*="background-color"]');
    if (!staticContainer) return;
    
    if (!staticContainer.querySelector('[data-static-overlay="true"]')) {
      const staticOverlay = document.createElement("div");
      staticOverlay.setAttribute("data-static-overlay", "true");
      staticOverlay.innerHTML = stored.top + stored.bottom;
      
      // NEW: Before appending the clone, ensure any element in the clone whose inline style
      // contains "background-color: rgba(0, 0, 0, 0.4)" is forced to opacity 0.
      staticOverlay.querySelectorAll('[style*="background-color: rgba(0, 0, 0, 0.4)"]').forEach(el => {
        el.style.opacity = "0";
      });
      
      const computed = window.getComputedStyle(staticContainer);
      const paddingTop = computed.paddingTop;
      const paddingLeft = computed.paddingLeft;
      
      staticOverlay.style.position = "absolute";
      staticOverlay.style.top = paddingTop;
      staticOverlay.style.left = paddingLeft;
      staticOverlay.style.width = "100%";
      staticOverlay.style.height = "100%";
      staticOverlay.style.pointerEvents = "none";
      
      staticContainer.appendChild(staticOverlay);
    }
  }
  // -[ END OF CLONE_VISIBILITY ]-

  // -[ DYNAMIC_CLONE_VISIBILITY ]-
  function removeStaticClone(pin) {
    const staticContainer = pin.querySelector('div.zI7.iyn.Hsu[style*="background-color"]');
    if (!staticContainer) return;
    const staticOverlay = staticContainer.querySelector('[data-static-overlay="true"]');
    if (staticOverlay) {
      staticOverlay.remove();
    }
  }

  function updateStaticOverlay(pin) {
    const realTop = pin.querySelector('div[data-test-id="better-save"]');
    const realBottom = pin.querySelector('div[data-test-id="send-share-link"]');
    if (!realTop || !realBottom) {
      insertStaticClone(pin);
    } else {
      removeStaticClone(pin);
      storedOverlayContent.set(pin, { 
        top: realTop.outerHTML, 
        bottom: realBottom.outerHTML
      });
    }
  }
  // -[ END OF DYNAMIC_CLONE_VISIBILITY ]-

  // -[ LISTITEM PROCESSING ]-
  // Global filter flags (default values loaded later from storage)
  let filterSponsoredPins = true;
  let filterExternalLinks = true;
  let filterVideos = false;
  let filterImages = false;
  let extensionEnabled = true; // Overall extension enabled flag

  function processPin(pin) {
    if (!pin || !pin.getAttribute("data-test-pin-id")) return;
    
    // Global disable: If the extension is turned off, restore the pin and exit.
    if (!extensionEnabled) {
      restorePinAndContainer(pin);
      return;
    }
    
    pin.classList.add("force-hover");
    pin.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, cancelable: true, view: window }));
    
    // === Immediate check for videos: remove immediately if found (faster removal) ===
    if (filterVideos && pin.querySelector("video")) {
      removePinAndContainer(pin);
      return;
    }
    
    // === Immediate check for images: remove immediately if found (faster removal) ===
    if (filterImages && pin.querySelector("img")) {
      removePinAndContainer(pin);
      return;
    }
    
    forceChildVisibility(pin);
    captureOverlayContent(pin);
    
    const pinId = pin.getAttribute("data-test-pin-id");
    const visitButton = pin.querySelector('a[data-test-id="visit-button"]');

    // External links: remove if the visit button is external and pin doesn't match the sponsored condition.
    if (filterExternalLinks && visitButton && visitButton.href && 
        !visitButton.href.includes("pinterest.com") && 
        !(pinId && /^[A-Za-z]/.test(pinId))) {
      removePinAndContainer(pin);
      return;
    }
    
    // Ads/Sponsored content: remove if pinId starts with a letter.
    if (filterSponsoredPins && pinId && /^[A-Za-z]/.test(pinId)) {
      removePinAndContainer(pin);
      return;
    }

    pin.addEventListener("mouseenter", () => {
      removeStaticClone(pin);
    });

    pin.addEventListener("mouseleave", () => {
      setTimeout(() => {
        updateStaticOverlay(pin);
      }, 50);
    });
  }
  
  function removePinAndContainer(pin) {
    const listItem = pin.closest('[role="listitem"]');
    if (listItem) {
      if (!listItem.dataset.originalHtml) {
        listItem.dataset.originalHtml = listItem.innerHTML;
      }
      listItem.style.opacity = "0";
      listItem.style.pointerEvents = "none";  // Disable clicks on hidden element
      listItem.classList.add("filtered");
    } else {
      if (!pin.dataset.originalHtml) {
        pin.dataset.originalHtml = pin.innerHTML;
      }
      pin.innerHTML = "";
      pin.style.opacity = "0";
      pin.style.pointerEvents = "none";  // Disable clicks on hidden element
      pin.classList.add("filtered");
    }
  }

  function restorePinAndContainer(pin) {
    const listItem = pin.closest('[role="listitem"]');
    if (listItem && listItem.classList.contains("filtered") && listItem.dataset.originalHtml) {
      listItem.innerHTML = listItem.dataset.originalHtml;
      listItem.style.opacity = "1";
      listItem.style.pointerEvents = ""; // Restore pointer events
      listItem.classList.remove("filtered");
    } else if (!listItem && pin.classList.contains("filtered") && pin.dataset.originalHtml) {
      pin.innerHTML = pin.dataset.originalHtml;
      pin.style.opacity = "1";
      pin.style.pointerEvents = ""; // Restore pointer events
      pin.classList.remove("filtered");
    }
  }

  function updateExistingElements() {
    const pins = document.querySelectorAll('[data-test-pin-id]');
    if (!extensionEnabled) {
      pins.forEach(pin => {
        restorePinAndContainer(pin);
        const staticOverlay = pin.querySelector('[data-static-overlay="true"]');
        if (staticOverlay) staticOverlay.remove();
      });
      return;
    }
    pins.forEach(pin => processPin(pin));
  }

  function processNewNodes(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.hasAttribute && node.hasAttribute("data-test-pin-id")) {
      processPin(node);
    }
    node.querySelectorAll('[data-test-pin-id]').forEach(pin => processPin(pin));
  }

  document.querySelectorAll('[data-test-pin-id]').forEach(pin => processPin(pin));

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => processNewNodes(node));
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  let scrollTimeout;
  window.addEventListener("scroll", () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      document.querySelectorAll('[data-test-pin-id]').forEach(pin => processPin(pin));
    }, 100);
  });

  document.addEventListener("mousemove", throttle(function() {
    document.querySelectorAll('[data-test-pin-id]').forEach(pin => processPin(pin));
  }, 100));

  function throttle(func, limit) {
    let lastFunc, lastRan;
    return function() {
      const context = this;
      const args = arguments;
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(function() {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }
  // -[ END OF LISTITEM PROCESSING ]-

  // ========[ END OF ELEMENT PROCESSING ]========

  chrome.storage.sync.get({ 
    filterSponsoredPins: true, 
    filterExternalLinks: true,
    filterVideos: false,
    filterImages: false,
    extensionEnabled: true
  }, function(items) {
    filterSponsoredPins = items.filterSponsoredPins;
    filterExternalLinks = items.filterExternalLinks;
    filterVideos = items.filterVideos;
    filterImages = items.filterImages;
    extensionEnabled = items.extensionEnabled;
    updateExistingElements();
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'updateFilterSettings') {
      if (request.hasOwnProperty('filterExternalLinks')) {
        filterExternalLinks = request.filterExternalLinks;
      }
      if (request.hasOwnProperty('filterSponsoredPins')) {
        filterSponsoredPins = request.filterSponsoredPins;
      }
      if (request.hasOwnProperty('filterVideos')) {
        filterVideos = request.filterVideos;
      }
      if (request.hasOwnProperty('filterImages')) {
        filterImages = request.filterImages;
      }
      if (request.hasOwnProperty('extensionEnabled')) {
        extensionEnabled = request.extensionEnabled;
      }
      updateExistingElements();
      sendResponse({ status: "filters updated" });
    }
  });

})();