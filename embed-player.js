// ==UserScript==
// @name         YouTube Embed Adblock
// @namespace    https://www.youtube.com
// @version      2.2
// @description  Block ads with identical embed player + bevel edges
// @license      MIT
// @match        https://www.youtube.com/watch?*
// @grant        none
// @run-at       document-idle
// @author       Cave johnson
// @downloadURL  https://example.com/my-script.user.js
// @updateURL    https://raw.githubusercontent.com/Sillylittleguy1/Youtube-enbed-adblock/refs/heads/main/embed-player.js
// ==/UserScript==

(function() {
    'use strict';
    console.log("[YT-Embed] Script Loaded");

    const config = {
        playerId: 'player',
        embedClass: 'custom-youtube-embed',
        defaultHeight: '390px',
        aspectRatio: 16/9,
        maxHeightOffset: 120,
        autoplay: true,
        bevelSize: '12px'
    };

    // ========================
    // Enhanced Player Creation
    // ========================
    function createEmbedPlayer(videoId) {
        const container = document.createElement('div');
        container.id = config.playerId;
        container.className = config.embedClass;

        // Bevel styling
        container.style.cssText = `
            min-height: ${config.defaultHeight};
            height: calc(100vw * ${1/config.aspectRatio});
            max-height: calc(100vh - ${config.maxHeightOffset}px);
            width: 100%;
            position: relative;
            background-color: #000;
            border-radius: ${config.bevelSize};
            overflow: hidden;
            box-shadow: inset 0 0 ${config.bevelSize} rgba(255, 255, 255, 0.1);
        `;

        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}?${
            config.autoplay ? 'autoplay=1&' : ''
        }rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`;

        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            display: block;
        `;
        iframe.allowFullscreen = true;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';

        // Double-layer overlay removal
        iframe.onload = function() {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const style = iframeDoc.createElement('style');
                style.textContent = `
                    .ytp-pause-overlay-container,
                    .ytp-pause-overlay,
                    .ytp-scroll-min {
                        display: none !important;
                    }
                    .html5-video-player.ad-showing video {
                        visibility: visible !important;
                    }
                `;
                iframeDoc.head.appendChild(style);
            } catch (e) {
                console.log("[YT-Embed] Iframe styling skipped (cross-origin)");
            }
        };

        container.appendChild(iframe);
        return container;
    }

    // ========================
    // Robust Player Replacement
    // ========================
    function replacePlayer() {
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (!videoId) return;

        const oldPlayer = document.getElementById(config.playerId);
        if (!oldPlayer || oldPlayer.classList.contains(config.embedClass)) return;

        console.log("[YT-Embed] Replacing player...");
        oldPlayer.parentNode.replaceChild(createEmbedPlayer(videoId), oldPlayer);
    }

    // ========================
    // Chrome/Firefox Compatibility
    // ========================
    function init() {
        // Immediate attempt
        replacePlayer();

        // Fallback polling for Chrome
        let pollCount = 0;
        // Poll for player (Chrome fallback)
        const pollInterval = setInterval(() => {
            if (document.getElementById(config.playerId)) {
                replacePlayer();
                clearInterval(pollInterval);
            }
        }, 100);

        // MutationObserver for SPA
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes) replacePlayer();
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Start with DOM readiness check
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 300); // Chrome safety delay
    }

    // SPA navigation handling
    const nativePushState = history.pushState;
    history.pushState = function() {
        nativePushState.apply(this, arguments);
        setTimeout(replacePlayer, 800);
    };
    window.addEventListener('popstate', replacePlayer);

    console.log("[YT-Embed] Initialization complete");
})();
