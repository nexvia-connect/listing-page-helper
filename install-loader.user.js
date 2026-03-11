// ==UserScript==
// @name         Listing page helper (Loader)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Silently fetches and runs the latest script directly from GitHub
// @match        https://pro.immotop.lu/*
// @match        https://www.athome.lu/pro/v2/listings*
// @match        https://www.wortimmo.lu/fr/annonces*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // CATCH THE URL INSTANTLY: Save it before routers can boot up and strip it!
    if (window.location.search.includes('find=') || window.location.search.includes('downgrade=')) {
        sessionStorage.setItem('immo_helper_saved_search', window.location.search);
    }

    const githubRawUrl = 'https://raw.githubusercontent.com/nexvia-connect/listing-page-helper/main/listing-page-helper.user.js';

    GM_xmlhttpRequest({
        method: 'GET',
        url: githubRawUrl + '?t=' + new Date().getTime(), // Bypass cache
        onload: function(response) {
            try {
                const scriptFn = new Function(response.responseText);
                scriptFn();
            } catch (e) {
                console.error("Listing Helper: Error executing remote script.", e);
            }
        },
        onerror: function(err) {
            console.error("Listing Helper: Failed to fetch script from GitHub.", err);
        }
    });
})();
