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

function onMessage(message, sender) {
	const { direction, rightClick } = message;
	const delta = direction === 'up' ? -1 : 1;
	activeTab(sender.tab, delta, rightClick);
}

async function activeTab(fromTab, delta, rightClick) {
	const configs = await getConfigs();
	const allTabs = await chrome.tabs.query({ windowId: fromTab.windowId });
	// Exclude hidden tabs and tabs from other workspaces (Opera exposes workspaceId on tabs)
	const tabs = allTabs.filter(t => !t.hidden && (!fromTab.workspaceId || t.workspaceId === fromTab.workspaceId));
	let tab = null;
	// Use array position (not tab.index) to handle gaps from filtered hidden tabs
	const currentPos = tabs.findIndex(t => t.id === fromTab.id);
	if (currentPos === -1) return;
	let i = currentPos + delta;
	let skipped = 0;

	while ((configs.cyclicSwitchTab || (i >= 0 && i < tabs.length)) && skipped < tabs.length) {
		const currentTab = tabs[(i + tabs.length) % tabs.length];
		if (await checkTabAvailable(currentTab)) {
			tab = currentTab;
			break;
		}
		i += delta;
		skipped++;
	}

	if (tab) {
		if (rightClick) await suppressContextMenu(tab.id);
		chrome.tabs.update(tab.id, { active: true });
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
                    }).catch(() => {});
                }
            });
		}
	});
}

/**
 * Injected before the tab is activated so the listener is in place when the right button is released.
 * Capture phase on window: pages with their own context menu (e.g. YouTube player) never see the event.
 */
async function suppressContextMenu(tabId) {
	const timeout = new Promise(resolve => setTimeout(resolve, 150));
	const inject = chrome.scripting.executeScript({
		target: { tabId, allFrames: true },
		func: disableContextMenu
	}).catch(() => {});
	await Promise.race([inject, timeout]);
}

function disableContextMenu() {
	function preventOnce(e) {
		e.preventDefault();
		e.stopImmediatePropagation();
	}
	window.addEventListener("contextmenu", preventOnce, { capture: true, once: true });
}

async function checkTabAvailable(tab) {
	if (!tab.url) return false;

	if (tab.status === 'unloaded') return true;

	// executeScript never settles on some pages (e.g. Chrome's XML viewer) — treat as unavailable
	const timeout = new Promise(resolve => setTimeout(() => resolve(false), 150));
	const check = chrome.scripting.executeScript({
		target: { tabId: tab.id },
		func: () => {}
	}).then(() => true, () => false);

	return Promise.race([check, timeout]);
}
