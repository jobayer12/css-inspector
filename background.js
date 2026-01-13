chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if scripts are already injected
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => !!window.CSSInspector
    });

    const isInjected = results[0]?.result;

    if (!isInjected) {
      // Inject CSS first
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['styles.css']
      });

      // Then inject the content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    }

    // Toggle the inspector
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (window.CSSInspector) {
          window.CSSInspector.toggle();
        }
      }
    });
  } catch (error) {
    console.error('CSS Inspector error:', error);
  }
});
