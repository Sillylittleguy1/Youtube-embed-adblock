// ==UserScript==
// @name         YouTube Embed Adblock
// @namespace    https://github.com/Sillylittleguy1/Youtube-embed-adblock
// @version      2.3
// @description  Block ads with identical embed player
// @license      MIT
// @match        https://www.youtube.com/watch?*
// @icon         https://github.com/Sillylittleguy1/Youtube-embed-adblock/blob/main/Firefox/icon128.png?raw=true
// @grant        none
// @run-at       document-idle
// @author       Cave johnson
// @downloadURL  https://raw.githubusercontent.com/Sillylittleguy1/Youtube-enbed-adblock/refs/heads/main/embed-player.js
// @updateURL    https://raw.githubusercontent.com/Sillylittleguy1/Youtube-enbed-adblock/refs/heads/main/embed-player.js
// @supportURL   https://github.com/Sillylittleguy1/Youtube-embed-adblock/issues/new
// ==/UserScript==

(function () {
    'use strict';
    console.log("[YT-Embed] Script Loaded");

    const config = {
        playerId: 'player',
        embedClass: 'custom-youtube-embed',
        defaultHeight: '390px',
        aspectRatio: 16 / 9,
        maxHeightOffset: 120,
        autoplay: true,
        bevelSize: '12px'
    };

    // ========================
    // Player Creation (Blob Embed)
    // ========================
    function createEmbedPlayer(videoId) {
        const container = document.createElement('div');
        container.id = config.playerId;
        container.className = config.embedClass;

        // Bevel styling
        container.style.cssText = `
            min-height: ${config.defaultHeight};
            height: calc(100vw * ${1 / config.aspectRatio});
            max-height: calc(100vh - ${config.maxHeightOffset}px);
            width: 100%;
            position: relative;
            background-color: #000;
            border-radius: ${config.bevelSize};
            overflow: hidden;
            box-shadow: inset 0 0 ${config.bevelSize} rgba(255, 255, 255, 0.1);
        `;

        const embedUrl = `https://www.youtube.com/embed/${videoId}?${
            config.autoplay ? 'autoplay=1&' : ''
        }rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`;

        const shellHtml = `
            <!DOCTYPE html>
            <html>
            <body style="margin:0;background:#000;">
                <iframe src="${embedUrl}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" style="border:none;width:100vw;height:100vh;"></iframe>
            </body>
            </html>
        `;

        const blob = new Blob([shellHtml], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);

        const iframe = document.createElement('iframe');
        iframe.src = blobUrl;
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            display: block;
        `;
        iframe.allowFullscreen = true;

        container.appendChild(iframe);
        return container;
    }

    // ========================
    // Player Replacement
    // ========================
    function replacePlayer() {
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (!videoId) return;

        const oldPlayer = document.getElementById(config.playerId);
        if (!oldPlayer || oldPlayer.classList.contains(config.embedClass)) return;

        console.log("[YT-Embed] Replacing player with blob-embed...");
        oldPlayer.parentNode.replaceChild(createEmbedPlayer(videoId), oldPlayer);
    }

    function muteAllAudioContexts() {
    if (!window.AudioContext && !window.webkitAudioContext) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;

    // Monkeypatch AudioContext constructor to track instances
    const originalCtor = AudioCtx;
    const contexts = new Set();

    function PatchedAudioContext(...args) {
        const ctx = new originalCtor(...args);
        contexts.add(ctx);
        // Try suspending immediately
        ctx.suspend().catch(() => {});
        return ctx;
    }
    PatchedAudioContext.prototype = originalCtor.prototype;
    window.AudioContext = PatchedAudioContext;
    window.webkitAudioContext = PatchedAudioContext;

    // Also suspend any existing contexts
    if (AudioCtx.prototype && AudioCtx.prototype.state) {
        try {
            contexts.forEach(ctx => ctx.suspend());
        } catch {}
    }

    // As an extra fallback, override resume and createGain to block audio
    AudioCtx.prototype.resume = () => Promise.resolve();
    AudioCtx.prototype.createGain = () => {
        return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} } };
    };
}


    // ========================
    // Chrome/Firefox Compatibility
    // ========================
    function init() {
        replacePlayer();
        muteAllAudioContexts();

        const pollInterval = setInterval(() => {
            if (document.getElementById(config.playerId)) {
                replacePlayer();
                clearInterval(pollInterval);
            }
        }, 100);

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes) replacePlayer();
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 300);
    }

    const nativePushState = history.pushState;
    history.pushState = function () {
        nativePushState.apply(this, arguments);
        setTimeout(replacePlayer, 800);
    };
    window.addEventListener('popstate', replacePlayer);

    console.log("[YT-Embed] Initialization complete");
})();
