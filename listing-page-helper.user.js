// ==UserScript==
// @name         Listing page helper
// @namespace    http://tampermonkey.net/
// @version      8.5
// @description  Force highlight specific listings, find links, and survive aggressive filters across Immotop and Athome
// @match        https://pro.immotop.lu/*
// @match        https://www.athome.lu/pro/v2/listings*
// @updateURL    https://raw.githubusercontent.com/nexvia-connect/listing-page-helper/main/listing-page-helper.user.js
// @downloadURL  https://raw.githubusercontent.com/nexvia-connect/listing-page-helper/main/listing-page-helper.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- CONFIGURATION ---
    const COLOR_FIRST = '#62c462';          // Vibrant Green
    const COLOR_DOWNGRADE = '#ef4444';      // Vibrant Red
    const COLOR_FIRST_DONE = '#a3dca3';     // Soft, lighter green
    const COLOR_DOWNGRADE_DONE = '#fca5a5'; // Soft, lighter red
    // ---------------------

    let targetIds = [];
    let downgradeId = null;
    let findId = null;

    const isImmotop = window.location.hostname.includes('immotop.lu');
    const isAthome = window.location.hostname.includes('athome.lu');

    // Parse and synchronize State (Supports SPA navigation)
    function syncState() {
        // Grab current search OR the one saved by the loader at document-start
        let searchStr = window.location.search;
        const savedSearch = sessionStorage.getItem('immo_helper_saved_search');
        
        if (savedSearch) {
            searchStr = savedSearch;
            sessionStorage.removeItem('immo_helper_saved_search'); // Clear it after consuming
        }

        const queryString = searchStr.replace('?', '');
        const queryParams = queryString.split('&');

        const newIds = queryParams.filter(param => /^\d{6,8}$/.test(param));
        if (newIds.length > 0) {
            targetIds = newIds;
            sessionStorage.setItem('immotop_target_ids', JSON.stringify(targetIds));
        } else {
            const stored = sessionStorage.getItem('immotop_target_ids');
            if (stored) targetIds = JSON.parse(stored);
        }

        const downgradeParam = queryParams.find(param => param.startsWith('downgrade='));
        if (downgradeParam) {
            downgradeId = downgradeParam.split('=')[1];
            sessionStorage.setItem('immotop_downgrade_id', downgradeId);
        } else if (newIds.length > 0) {
            sessionStorage.removeItem('immotop_downgrade_id');
            downgradeId = null;
        } else {
            const storedDown = sessionStorage.getItem('immotop_downgrade_id');
            if (storedDown) downgradeId = storedDown;
        }

        const findParam = queryParams.find(param => param.startsWith('find='));
        if (findParam) {
            findId = findParam.split('=')[1];
            sessionStorage.setItem('immotop_find_id', findId);
        } else if (newIds.length > 0 || downgradeParam) {
            sessionStorage.removeItem('immotop_find_id');
            findId = null;
        } else {
            const storedFind = sessionStorage.getItem('immotop_find_id');
            if (storedFind) findId = storedFind;
        }
    }

    // --- Modern Badge Helpers ---
    function addOrUpdateBadge(container, text, bgColor) {
        const targetEl = isAthome ? (container.querySelector('td') || container) : container;
        if (isAthome) targetEl.style.position = 'relative';

        let badge = targetEl.querySelector('.immo-status-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'immo-status-badge';
            targetEl.appendChild(badge);
        }

        if (badge.textContent !== text) badge.textContent = text;

        const badgeStyles = `
            position: absolute;
            top: 0;
            right: 0;
            background: ${bgColor};
            color: white;
            padding: 4px 16px;
            border-radius: 0 0 0 8px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 1px;
            box-shadow: -2px 2px 10px rgba(0,0,0,0.2);
            z-index: 999;
            pointer-events: none;
        `;

        if (badge.getAttribute('data-style') !== badgeStyles) {
            badge.style.cssText = badgeStyles;
            badge.setAttribute('data-style', badgeStyles);
        }
    }

    function removeBadge(container) {
        const targetEl = isAthome ? (container.querySelector('td') || container) : container;
        const badge = targetEl.querySelector('.immo-status-badge');
        if (badge) badge.remove();
    }
    // ----------------------------

    function createPopup(url, imgSrc) {
        if (document.getElementById('immotop-find-popup')) return;

        const popup = document.createElement('div');
        popup.id = 'immotop-find-popup';
        popup.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 100000; background: #1a1a1a; border-radius: 8px;
            border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            font-family: system-ui, -apple-system, sans-serif; width: 420px;
        `;

        const imageHtml = imgSrc ? `
            <img src="${imgSrc}" style="width: 100%; height: 220px; object-fit: cover; border-radius: 6px; border: 1px solid #333; margin-bottom: 12px; display: block; box-sizing: border-box;">
        ` : '';

        popup.innerHTML = `
            <div id="immo-popup-header" style="cursor: grab; background: #2a2a2a; padding: 12px 16px; color: white; display: flex; justify-content: space-between; align-items: center; border-radius: 8px 8px 0 0; border-bottom: 1px solid #333;">
                <strong style="margin: 0; font-size: 14px; letter-spacing: 0.5px;">Listing Found</strong>
                <span id="immo-popup-close" style="cursor: pointer; font-size: 16px; line-height: 1; color: #888; transition: color 0.2s;">&#x2715;</span>
            </div>
            <div style="padding: 20px;">
                ${imageHtml}
                <div style="display: flex; gap: 8px; align-items: center; justify-content: center; box-sizing: border-box;">
                    <input type="text" id="immo-popup-input" value="${url}" readonly style="flex-grow: 1; padding: 10px 12px; border: 1px solid #333; background: #000; color: #e0e0e0; border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box;" />
                    <button id="immo-popup-copy" style="background: #333; border: 1px solid #555; color: white; padding: 10px; cursor: pointer; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-sizing: border-box;" title="Copy to clipboard">
                        <svg id="immo-copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        const closeBtn = document.getElementById('immo-popup-close');
        closeBtn.onmouseover = () => closeBtn.style.color = '#fff';
        closeBtn.onmouseout = () => closeBtn.style.color = '#888';
        closeBtn.onclick = () => {
            popup.remove();
            findId = null;
            sessionStorage.removeItem('immotop_find_id');
            enforceHighlights(); 
        };

        const copyBtn = document.getElementById('immo-popup-copy');
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(url).then(() => {
                copyBtn.style.background = '#2e7d32';
                copyBtn.style.borderColor = '#2e7d32';
                copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                setTimeout(() => {
                    copyBtn.style.background = '#333';
                    copyBtn.style.borderColor = '#555';
                    copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                }, 2000);
            });
        };

        const header = document.getElementById('immo-popup-header');
        let isDragging = false, startX, startY;

        const doDrag = (e) => {
            if (!isDragging) return;
            popup.style.left = (parseInt(popup.style.left, 10) + (e.clientX - startX)) + 'px';
            popup.style.top = (parseInt(popup.style.top, 10) + (e.clientY - startY)) + 'px';
            startX = e.clientX;
            startY = e.clientY;
        };

        const stopDrag = () => {
            isDragging = false;
            header.style.cursor = 'grab';
            window.removeEventListener('mousemove', doDrag);
            window.removeEventListener('mouseup', stopDrag);
        };

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = popup.getBoundingClientRect();
            popup.style.transform = 'none';
            popup.style.left = rect.left + 'px';
            popup.style.top = rect.top + 'px';
            header.style.cursor = 'grabbing';
            window.addEventListener('mousemove', doDrag);
            window.addEventListener('mouseup', stopDrag);
        });
    }

    function enforceHighlights() {
        if (targetIds.length === 0 && !downgradeId && !findId) return;

        let containers = [];
        if (isImmotop) {
            containers = Array.from(document.querySelectorAll('.search-agency-item-container'));
        } else if (isAthome) {
            containers = Array.from(document.querySelectorAll('tbody tr.bg-white'));
        }

        let triggerPopupUrl = null;
        let triggerPopupImg = null;

        containers.forEach(container => {
            let matchType = null;
            let adId = null;
            let copyUrl = null;
            let imgUrl = null;
            let nativeBadge = null;

            if (isImmotop) {
                const link = container.querySelector('a[href*="/annonces/"]');
                if (link) {
                    const match = link.href.match(/\/annonces\/(\d+)/);
                    if (match && match[1]) adId = match[1];
                }

                if (findId) {
                    const desc = container.querySelector('.ad_desc');
                    if (desc && desc.textContent.includes(`https://www.nexvia.lu/fr/buy/detail/${findId}`)) {
                        matchType = 'find';
                        copyUrl = `https://www.immotop.lu/annonces/${adId}/`;
                        const imgEl = container.querySelector('.search-agency-item-image img');
                        if (imgEl) imgUrl = imgEl.getAttribute('data-src') || imgEl.src;
                    }
                }
                nativeBadge = container.querySelector('.ad-badge.first');
            } 
            else if (isAthome) {
                const refSpans = Array.from(container.querySelectorAll('span.text-xs.text-raven'));
                let refVal = null;
                let idVal = null;

                refSpans.forEach(span => {
                    const text = span.textContent;
                    if (text.includes('Ref:')) refVal = text.replace('Ref:', '').trim();
                    if (text.includes('ID:')) idVal = text.replace('ID:', '').trim();
                });

                adId = idVal; 

                if (findId && refVal === findId) {
                    matchType = 'find';
                    copyUrl = `https://www.athome.lu/id-${idVal}`;
                    const imgEl = container.querySelector('img.object-cover');
                    if (imgEl) imgUrl = imgEl.src;
                }
                nativeBadge = null; 
            }

            if (!matchType && adId) {
                if (targetIds.includes(adId)) {
                    matchType = 'highlight';
                } else if (adId === downgradeId) {
                    matchType = 'downgrade';
                }
            }

            let newState = 'none';
            if (matchType === 'find') {
                newState = 'find';
            } else if (matchType === 'highlight') {
                newState = !!nativeBadge ? 'highlight_done' : 'highlight_action';
            } else if (matchType === 'downgrade') {
                newState = !nativeBadge ? 'downgrade_done' : 'downgrade_action';
            }

            if (container.dataset.immoHelperState !== newState) {
                container.dataset.immoHelperState = newState;

                const applyStyles = (borderColor, isGlow) => {
                    if (isAthome) {
                        container.style.cssText = `position: relative; outline: 4px solid ${borderColor} !important; outline-offset: -4px; z-index: 10; ${isGlow ? `box-shadow: inset 0 0 20px ${borderColor} !important;` : ''}`;
                    } else {
                        container.style.cssText = `position: relative; border: 4px solid ${borderColor} !important; box-sizing: border-box; ${isGlow ? `box-shadow: 0 0 25px 4px ${borderColor} !important; border-width: 8px !important;` : ''}`;
                    }
                };

                if (newState === 'find') {
                    container.style.cssText = ''; 
                    removeBadge(container);
                    if (nativeBadge) nativeBadge.style.removeProperty('background-color');
                    
                    if (!document.getElementById('immotop-find-popup')) {
                        triggerPopupUrl = copyUrl;
                        triggerPopupImg = imgUrl;
                    }

                } else if (newState === 'highlight_done') {
                    applyStyles(COLOR_FIRST_DONE, false);
                    addOrUpdateBadge(container, '\u2713', COLOR_FIRST_DONE);
                    if (nativeBadge) nativeBadge.style.setProperty('background-color', COLOR_FIRST_DONE, 'important');

                } else if (newState === 'highlight_action') {
                    applyStyles(COLOR_FIRST, true);
                    addOrUpdateBadge(container, 'FIRST THIS!', COLOR_FIRST);

                } else if (newState === 'downgrade_done') {
                    applyStyles(COLOR_DOWNGRADE_DONE, false);
                    addOrUpdateBadge(container, '\u2713', COLOR_DOWNGRADE_DONE);

                } else if (newState === 'downgrade_action') {
                    applyStyles(COLOR_DOWNGRADE, true);
                    addOrUpdateBadge(container, 'DOWNGRADE THIS!', COLOR_DOWNGRADE);
                    if (nativeBadge) nativeBadge.style.removeProperty('background-color');

                } else if (newState === 'none') {
                    container.style.cssText = ''; 
                    removeBadge(container);
                    if (nativeBadge) nativeBadge.style.removeProperty('background-color');
                }
            }
        });

        if (triggerPopupUrl) {
            createPopup(triggerPopupUrl, triggerPopupImg);
        }
    }

    // --- INITIALIZATION WRAPPER ---
    function initApp() {
        syncState();
        enforceHighlights();

        let mutTimeout;
        const observer = new MutationObserver(() => {
            clearTimeout(mutTimeout);
            mutTimeout = setTimeout(enforceHighlights, 150);
        });
        
        // Failsafe: Ensure document.body exists before observing
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            const waitBody = setInterval(() => {
                if (document.body) {
                    observer.observe(document.body, { childList: true, subtree: true });
                    clearInterval(waitBody);
                }
            }, 50);
        }

        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                syncState();
                enforceHighlights();
            }
        }, 500);
    }

    // Wait for the DOM to be ready since the loader executes instantly
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

})();
