/**
 * The server
 * Listen message from the plugin
 */
(function() {

    chrome.runtime.onMessage.addListener(onMessage);
    chrome.runtime.onInstalled.addListener(injectEverywhere);

	/**
	 * Listen the message...
	 * @param message
	 * @param sender
	 * @param sendResponse
	 */
	function onMessage(message, sender, sendResponse) {
		if (!sender.tab) {
			return;
		}
		
		if (message == 'up') {
			onUpMessage(sender.tab);
		}
		
		if (message == 'down') {
			onDownMessage(sender.tab);
		}
	}

	/**
	 * Active the next tab
	 * @param senderTab
	 */
	function onUpMessage(senderTab) {
		var index = senderTab.index - 1;
		
		activeTab(index, senderTab.windowId);
	}

	/**
	 * Active the next tab
	 * @param senderTab
	 */
	function onDownMessage(senderTab) {
		var index = senderTab.index + 1;
		
		activeTab(index, senderTab.windowId);
	}

	/**
	 * Active a tab
	 * @param tabIndex
	 * @param windowId
	 */
	function activeTab(tabIndex, windowId) {
		var query = {
			'index': tabIndex,
			'windowId': windowId
		};
		
		chrome.tabs.query(query, function(tabs) {
			var tab = tabs[0];

			if (tab) {
				// active the tab
				chrome.tabs.update(tab.id, {active:true});

				// prevent context menu one time (when scrolled with right click, release the click open the context menu)
                chrome.tabs.executeScript(tab.id, {
                    code: 'window.addEventListener("contextmenu", preventOneContextMenuEvent);'
                });
			}
		});
	}

	/**
	 * On plugin install, inject the js on all opened tabs
	 */
	function injectEverywhere() {
		chrome.tabs.query({}, function(tabs) {
			for (i in tabs) {
				// no inject on internal browser url (it trigger an error anyway)
				if (!isInternalChromeTab(tabs[i])) {
					chrome.tabs.executeScript(tabs[i].id, {
						'file': 'main.js'
					});
				}
			}
		});
	}

	/**
	 * @param tab
	 * @returns bool
	 */
    function isInternalChromeTab(tab) {
        return tab.url.substr(0, 6) == 'chrome';
    }
})();
