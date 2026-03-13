// ==UserScript==
// @name         Listing page helper (Loader)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Silently fetches and runs the Find and Highlight scripts from GitHub
// @match        https://pro.immotop.lu/*
// @match        https://www.athome.lu/pro/v2/listings*
// @match        https://www.wortimmo.lu/fr/annonces*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    const searchParams = window.location.search;
    
    // CATCH THE URL INSTANTLY: Save it before routers can boot up and strip it!
    if (searchParams.includes('find=') || searchParams.includes('downgrade=') || searchParams.includes('upgrade=')) {
        // Save separately so each script can consume and destroy its own key
        sessionStorage.setItem('immo_helper_search_find', searchParams);
        sessionStorage.setItem('immo_helper_search_highlight', searchParams);
    }

    // UPDATE THESE URLS to match your final GitHub file names
    const scriptsToLoad = [
        'https://raw.githubusercontent.com/nexvia-connect/listing-page-helper/main/listing-find-helper.js',
        'https://raw.githubusercontent.com/nexvia-connect/listing-page-helper/main/listing-highlight-helper.js'
    ];

    scriptsToLoad.forEach(url => {
        GM_xmlhttpRequest({
            method: 'GET',
            url: url + '?t=' + new Date().getTime(), // Bypass cache
            onload: function(response) {
                try {
                    const scriptFn = new Function(response.responseText);
                    scriptFn();
                } catch (e) {
                    console.error(`Listing Helper: Error executing remote script from ${url}`, e);
                }
            },
            onerror: function(err) {
                console.error(`Listing Helper: Failed to fetch script from ${url}`, err);
            }
        });
    });
})();
