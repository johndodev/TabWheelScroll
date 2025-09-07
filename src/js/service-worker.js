/**
 * On plugin install, inject the js on all opened tabs
 * https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onInstalled
 */
chrome.runtime.onInstalled.addListener(injectEverywhere);

/**
 * https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onMessage
 */
chrome.runtime.onMessage.addListener(onMessage);

/** @returns {Promise<{cyclicSwitchTab: bool}>} */
async function getConfigs() {
	return chrome.storage.sync.get(['cyclicSwitchTab'])
}

/**
 * Handle messages from the content script
 * https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onMessage
 */
function onMessage(message, sender, sendResponse) {
	switch (message) {
		case 'up':
			activeTab(sender.tab, -1);
			break;
		case 'down':
			activeTab(sender.tab, 1);
			break;
	}
}

/**
 * Active a tab
 */
async function activeTab(fromTab, delta) {
	const configs = await getConfigs();
	const tabs = await chrome.tabs.query({
		windowId: fromTab.windowId
	});
	let tab = null;
	let i = fromTab.index + delta;
	while (configs.cyclicSwitchTab || (i >= 0 && i < tabs.length)) {
		let currentTab = tabs[(i + tabs.length) % tabs.length];
		if (await checkTabAvailable(currentTab)) {
			tab = currentTab;
			break;
		}
		i += delta;
	}
	if (tab) {
		// active the tab
		chrome.tabs.update(tab.id, { active: true });

		// prevent context menu one time (when scrolled with right click, release the click open the context menu)
		chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: disableContextMenu
		})
	}
}

/**
 * On plugin install, inject the js on all opened tabs
 */
function injectEverywhere() {
	chrome.tabs.query({}, function (tabs) {
		for (let i = 0; i < tabs.length; i++) {
            if (tabs[i].status === 'unloaded') continue;

            checkTabAvailable(tabs[i]).then(available => {
                if (available) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[i].id },
                        files: ['main.js']
                    });
                }
            })
		}
	});
}

function disableContextMenu() {
	function preventOnce(e) {
		e.preventDefault();
	}
	window.addEventListener("contextmenu", preventOnce, { once: true });
}

async function checkTabAvailable(tab) {
	if (!tab.url) return false;

	return await chrome.scripting.executeScript({
		target: { tabId: tab.id },
		func: noop
	}).catch(function(error) {
        // console.log(error);
        // console.log(tab);
        return null;
    }) != null;
}

function noop() { }
