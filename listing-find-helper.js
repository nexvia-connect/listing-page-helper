// Github URL: listing-find-helper.js
(function() {
    'use strict';

    let findId = null;
    const isImmotop = window.location.hostname.includes('immotop.lu');
    const isAthome = window.location.hostname.includes('athome.lu');
    const isWortimmo = window.location.hostname.includes('wortimmo.lu');

    function syncState() {
        let searchStr = window.location.search;
        const savedSearch = sessionStorage.getItem('immo_helper_search_find');
        
        if (savedSearch) {
            searchStr = savedSearch;
            sessionStorage.removeItem('immo_helper_search_find'); 
        }

        const queryParams = searchStr.replace('?', '').split('&');
        const findParam = queryParams.find(param => param.startsWith('find='));
        
        if (findParam) {
            findId = findParam.split('=')[1];
            sessionStorage.setItem('immotop_find_id', findId);
        } else if (queryParams.some(p => p.startsWith('upgrade=') || p.startsWith('downgrade='))) {
            // Clear find if we are doing a bulk highlight action instead
            sessionStorage.removeItem('immotop_find_id');
            findId = null;
        } else {
            const storedFind = sessionStorage.getItem('immotop_find_id');
            if (storedFind) findId = storedFind;
        }
    }

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

        const imageHtml = imgSrc ? `<img src="${imgSrc}" style="width: 100%; height: 220px; object-fit: cover; border-radius: 6px; border: 1px solid #333; margin-bottom: 12px; display: block; box-sizing: border-box;">` : '';

        popup.innerHTML = `
            <div id="immo-popup-header" style="cursor: grab; background: #2a2a2a; padding: 12px 16px; color: white; display: flex; justify-content: space-between; align-items: center; border-radius: 8px 8px 0 0; border-bottom: 1px solid #333;">
                <strong style="margin: 0; font-size: 14px; letter-spacing: 0.5px;">Listing Found</strong>
                <span id="immo-popup-close" style="cursor: pointer; font-size: 16px; line-height: 1; color: #888; transition: color 0.2s;">&#x2715;</span>
            </div>
            <div style="padding: 20px;">
                ${imageHtml}
                <div style="display: flex; gap: 8px; align-items: stretch; justify-content: center; box-sizing: border-box; height: 38px;">
                    <input type="text" id="immo-popup-input" value="${url}" readonly style="flex-grow: 1; height: 100% !important; margin: 0 !important; padding: 0 12px !important; border: 1px solid #333 !important; background: #000 !important; color: #e0e0e0 !important; -webkit-text-fill-color: #e0e0e0 !important; opacity: 1 !important; border-radius: 6px; font-size: 13px; line-height: normal !important; outline: none !important; box-sizing: border-box !important; box-shadow: none !important;" />
                    <button id="immo-popup-copy" style="flex-shrink: 0; width: 38px !important; height: 100% !important; margin: 0 !important; padding: 0 !important; background: #333 !important; border: 1px solid #555 !important; color: white !important; cursor: pointer; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-sizing: border-box !important;" title="Copy to clipboard">
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
        };

        const copyBtn = document.getElementById('immo-popup-copy');
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(url).then(() => {
                // Using setProperty with 'important' to override the !important tags in the HTML string
                copyBtn.style.setProperty('background', '#2e7d32', 'important');
                copyBtn.style.setProperty('border-color', '#2e7d32', 'important');
                copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                setTimeout(() => {
                    copyBtn.style.setProperty('background', '#333', 'important');
                    copyBtn.style.setProperty('border-color', '#555', 'important');
                    copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                }, 2000);
            });
        };

        // Dragging logic
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

    function enforceFind() {
        if (!findId) return;

        let containers = [];
        if (isImmotop) {
            containers = Array.from(document.querySelectorAll('.search-agency-item-container'));
        } else if (isAthome) {
            containers = Array.from(document.querySelectorAll('tbody tr.bg-white'));
        } else if (isWortimmo) {
            containers = Array.from(document.querySelectorAll('div[itemprop="itemListElement"]'));
        }

        let triggerPopupUrl = null;
        let triggerPopupImg = null;

        containers.forEach(container => {
            let isMatch = false;
            let copyUrl = null;
            let imgUrl = null;

            if (isImmotop) {
                const desc = container.querySelector('.ad_desc');
                if (desc && desc.textContent.includes(`https://www.nexvia.lu/fr/buy/detail/${findId}`)) {
                    isMatch = true;
                    const link = container.querySelector('a[href*="/annonces/"]');
                    if (link) {
                        const match = link.href.match(/\/annonces\/(\d+)/);
                        if (match && match[1]) copyUrl = `https://www.immotop.lu/annonces/${match[1]}/`;
                    }
                    const imgEl = container.querySelector('.search-agency-item-image img');
                    if (imgEl) imgUrl = imgEl.getAttribute('data-src') || imgEl.src;
                }
            } else if (isAthome) {
                const refSpans = Array.from(container.querySelectorAll('span.text-xs.text-raven'));
                let refVal = null; let idVal = null;
                refSpans.forEach(span => {
                    const text = span.textContent;
                    if (text.includes('Ref:')) refVal = text.replace('Ref:', '').trim();
                    if (text.includes('ID:')) idVal = text.replace('ID:', '').trim();
                });
                if (refVal === findId && idVal) {
                    isMatch = true;
                    // The magic fix: adding .html
                    copyUrl = `https://www.athome.lu/id-${idVal}.html`;
                    
                    const imgEl = container.querySelector('img.object-cover');
                    if (imgEl) imgUrl = imgEl.src;
                }
            } else if (isWortimmo) {
                const infoDivs = Array.from(container.querySelectorAll('.col-sm-5.col-xs-5'));
                for (let div of infoDivs) {
                    if (div.textContent.trim().includes(`_${findId}`)) {
                        isMatch = true;
                        const linkEl = container.querySelector('h2.title a');
                        if (linkEl) copyUrl = linkEl.href; 
                        const imgSpan = container.querySelector('.imgs');
                        if (imgSpan && imgSpan.style.backgroundImage) {
                            imgUrl = imgSpan.style.backgroundImage.slice(4, -1).replace(/["']/g, "");
                        }
                        break;
                    }
                }
            }

            if (isMatch && container.dataset.immoFindTriggered !== 'true') {
                container.dataset.immoFindTriggered = 'true';
                if (!document.getElementById('immotop-find-popup')) {
                    triggerPopupUrl = copyUrl;
                    triggerPopupImg = imgUrl;
                }
            }
        });

        if (triggerPopupUrl) createPopup(triggerPopupUrl, triggerPopupImg);
    }

    function initApp() {
        syncState();
        enforceFind();

        let mutTimeout;
        const observer = new MutationObserver(() => {
            clearTimeout(mutTimeout);
            mutTimeout = setTimeout(enforceFind, 150);
        });
        
        const waitForBody = setInterval(() => {
            if (document.body) {
                observer.observe(document.body, { childList: true, subtree: true });
                clearInterval(waitForBody);
            }
        }, 50);

        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                syncState();
                enforceFind();
            }
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();
