// ==UserScript==
// @name         Instagram Clean
// @namespace    urn:instagram-clean
// @version      2.0.0
// @description  Personalizza le superfici visibili di Instagram Web.
// @match        https://www.instagram.com/*
// @match        https://instagram.com/*
// @run-at       document-start
// @inject-into  auto
// @grant        none
// @noframes
// ==/UserScript==

(() => {
    'use strict';

    // ============================================================
    // CONFIGURAZIONE
    // ============================================================

    const CONFIG = {

        // true  = Instagram apre e rimane nella schermata "Seguiti"
        // false = comportamento normale del feed
        followingOnly: true,

        // true = nasconde l'icona/tab dei Reel
        // I Reel NON vengono bloccati e rimangono raggiungibili.
        hideReelsIcon: true,

        // true = permette di usare Esplora.
        // Quando si apre la ricerca, non vengono mostrati suggerimenti
        // finché non viene effettuata una ricerca.
        enableExplore: true,

        // Nasconde le Stories
        removeStories: false,

        // Limita il numero di post mostrati nel feed.
        // null = nessun limite.
        feedPostLimit: null,

        debug: false,
        showToast: false
    };


    // ============================================================
    // REGOLE
    // ============================================================

    const RULES = {

        control:
            'a[href], button, [role="link"], [role="button"], [role="tab"]',

        heading:
            'h1, h2, h3, h4, [role="heading"]',

        unit:
            'article, [role="article"], section, [role="region"], li, [role="listitem"]',

        post:
            'article, [role="article"]',

        protected:
            'nav, [role="navigation"], [role="dialog"], [role="textbox"], [contenteditable="true"]',

        labels: {
            reels: /^(?:reels?|watch reels?|open reels?|suggested reels|reels for you|trending reels|recommended reels)$/i,
            explore: /^explore$/i,
            stories: /^stories$/i
        }
    };


    const MARK = 'data-instagram-clean-hidden';
    const LIMIT = 'data-instagram-clean-limit';
    const OWN = 'data-instagram-clean-owned';


    // ============================================================
    // URL
    // ============================================================

    function normalizedPath(path) {
        try {
            path = decodeURIComponent(path);
        } catch {
            // Mantieni l'escape non valido invariato.
        }

        const segments = path
            .split('/')
            .filter(Boolean)
            .join('/')
            .toLowerCase();

        return segments ? '/' + segments + '/' : '/';
    }


    function instagramURL(
        value,
        base = 'https://www.instagram.com/'
    ) {
        try {
            const url = new URL(value, base);

            return (
                ['https:', 'http:'].includes(url.protocol) &&
                ['instagram.com', 'www.instagram.com'].includes(url.hostname)
            )
                ? url
                : null;

        } catch {
            return null;
        }
    }


    function isReelURL(value, base) {

        const url = instagramURL(value, base);

        if (!url) return false;

        const parts = normalizedPath(url.pathname)
            .split('/')
            .filter(Boolean);

        return (
            /^(reel|reels)$/.test(parts[0] || '') ||

            (
                parts.length >= 2 &&
                ![
                    'direct',
                    'stories',
                    'p',
                    'accounts',
                    'explore'
                ].includes(parts[0]) &&
                /^(reel|reels)$/.test(parts[1])
            )
        );
    }


    function isExploreURL(value, base) {

        const url = instagramURL(value, base);

        if (!url) return false;

        const path = normalizedPath(url.pathname);

        return (
            path.startsWith('/explore/') &&
            !path.startsWith('/explore/search/')
        );
    }


    function isExploreSearch(value, base) {

        const url = instagramURL(value, base);

        if (!url) return false;

        return normalizedPath(url.pathname)
            .startsWith('/explore/search/');
    }


    function isHome(value) {

        const url = instagramURL(value);

        if (!url) return false;

        return ['/', '/following/'].includes(
            normalizedPath(url.pathname)
        );
    }


    // ============================================================
    // LABEL
    // ============================================================

    function labelKind(value) {

        const label = (value || '')
            .replace(/\s+/g, ' ')
            .trim();

        if (label.length > 64) return null;

        return Object.keys(RULES.labels)
            .find(
                key => RULES.labels[key].test(label)
            ) || null;
    }


    // ============================================================
    // CONTROLLO DEI LINK
    // ============================================================

    function controlKind(element, config, base) {

        if (element.hasAttribute('href')) {

            const href = element.getAttribute('href');

            // I Reel NON sono più bloccati.
            // Vengono soltanto nascosti dalla navigazione.
            if (
                config.hideReelsIcon &&
                isReelURL(href, base)
            ) {
                return 'reels';
            }

            if (
                config.enableExplore &&
                isExploreURL(href, base)
            ) {
                return 'explore';
            }

            if (
                config.removeStories
            ) {
                const url = instagramURL(href, base);

                if (
                    url &&
                    normalizedPath(url.pathname)
                        .startsWith('/stories/')
                ) {
                    return 'stories';
                }
            }

            return null;
        }


        const icon =
            element.querySelector('svg[aria-label], svg title');

        const label =
            element.getAttribute('aria-label') ||
            icon?.getAttribute('aria-label') ||
            icon?.textContent ||
            element.textContent;

        const kind = labelKind(label);

        if (
            kind === 'reels' &&
            config.hideReelsIcon
        ) {
            return 'reels';
        }

        if (
            kind === 'explore' &&
            config.enableExplore
        ) {
            return 'explore';
        }

        if (
            kind === 'stories' &&
            config.removeStories
        ) {
            return 'stories';
        }

        return null;
    }


    // ============================================================
    // SELEZIONE
    // ============================================================

    function select(root, selector) {

        return [
            ...(root.matches?.(selector) ? [root] : []),
            ...root.querySelectorAll(selector)
        ];
    }


    // ============================================================
    // POST
    // ============================================================

    function postKey(post, base) {

        const keys = new Set();

        for (const a of post.querySelectorAll('a[href]')) {

            const url = instagramURL(
                a.getAttribute('href'),
                base
            );

            if (
                url &&
                /^\/p\/[^/]+\/?$/i.test(url.pathname)
            ) {
                keys.add(
                    url.pathname.split('/')[2]
                );
            }
        }

        return keys.size === 1
            ? [...keys][0]
            : null;
    }


    function hasOrdinaryPostLink(unit, base) {

        return [
            ...unit.querySelectorAll('a[href]')
        ].some(a => {

            const url = instagramURL(
                a.getAttribute('href'),
                base
            );

            return (
                url &&
                /^\/p\/[^/]+\/?$/i.test(url.pathname)
            );
        });
    }


    // ============================================================
    // CONTENITORE DA NASCONDERE
    // ============================================================

    function findRemovableFeedContainer(element) {

        if (element.closest(RULES.protected)) {
            return null;
        }

        const unit = element.closest(RULES.unit);

        if (!unit) return null;

        if (
            unit.matches(
                'main, [role="main"], [role="feed"]'
            )
        ) {
            return null;
        }

        if (
            unit.querySelector(RULES.post) ||
            unit.querySelector(
                'main, nav, [role="feed"], [role="navigation"]'
            )
        ) {
            return null;
        }

        return unit;
    }


    // ============================================================
    // HIDE / SHOW
    // ============================================================

    function mark(element, attribute, hide) {

        if (
            hide === element.hasAttribute(attribute)
        ) {
            return;
        }

        if (hide) {

            element.setAttribute(attribute, '');

            for (
                const video of element.querySelectorAll('video')
            ) {
                video.pause();
            }

        } else {

            element.removeAttribute(attribute);
        }
    }


    // ============================================================
    // RICERCA ESPLORA
    // ============================================================

    function searchInputHasText(doc) {

        const inputs = [
            ...doc.querySelectorAll(
                'input, textarea, [contenteditable="true"]'
            )
        ];

        return inputs.some(element => {

            if (
                element.matches(
                    '[contenteditable="true"]'
                )
            ) {
                return !!element.textContent.trim();
            }

            return !!element.value?.trim();
        });
    }


    function cleanExploreSearch(root, doc) {

        if (!isExploreSearch(
            doc.location.href,
            doc.location.href
        )) {
            return;
        }

        // Se l'utente ha già digitato una ricerca,
        // lascia che Instagram mostri i risultati.
        if (searchInputHasText(doc)) {

            for (
                const node of doc.querySelectorAll(
                    `[${OWN}="explore-empty"]`
                )
            ) {
                node.removeAttribute(OWN);
                node.removeAttribute(MARK);
            }

            return;
        }


        /*
         * Nessuna ricerca effettuata:
         *
         * manteniamo visibile la barra di ricerca,
         * ma nascondiamo le unità di contenuto
         * consigliato presenti sotto di essa.
         */

        for (
            const unit of select(
                root,
                'article, [role="article"], [role="listitem"], li'
            )
        ) {

            if (
                unit.closest(
                    'nav, [role="navigation"], [role="dialog"]'
                )
            ) {
                continue;
            }

            if (
                unit.querySelector(
                    'input, textarea, [contenteditable="true"]'
                )
            ) {
                continue;
            }

            unit.setAttribute(
                OWN,
                'explore-empty'
            );

            unit.setAttribute(
                MARK,
                ''
            );
        }
    }


    // ============================================================
    // PAGINA
    // ============================================================

    function cleanPage(root, doc, config, seenPosts, notice) {

        const home = isHome(doc.location.href);

        const path = normalizedPath(
            doc.location.pathname
        );

        const protectedRoute =
            path.startsWith('/direct/') ||
            path.startsWith('/stories/') ||
            path.startsWith('/accounts/');


        // --------------------------------------------------------
        // NASCONDI ICONE / TAB
        // --------------------------------------------------------

        const hidden = new Set();

        for (
            const control of select(
                root,
                RULES.control
            )
        ) {

            const kind = controlKind(
                control,
                config,
                doc.location.href
            );

            if (!kind) continue;


            // IMPORTANTE:
            //
            // I Reel vengono solo nascosti dalla UI.
            // Il loro URL continua a funzionare.
            //
            if (kind === 'reels') {

                const unit =
                    findRemovableFeedContainer(control);

                hidden.add(
                    unit || control
                );

                continue;
            }


            if (kind === 'stories') {

                const unit =
                    findRemovableFeedContainer(control);

                hidden.add(
                    unit || control
                );

                continue;
            }


            // Explore non viene nascosto:
            // deve essere utilizzabile.
        }


        for (
            const node of select(
                root,
                `[${MARK}]`
            )
        ) {

            if (!hidden.has(node)) {

                // Non rimuovere qui gli elementi
                // che appartengono alla ricerca Esplora.
                if (
                    node.getAttribute(OWN) !==
                    'explore-empty'
                ) {
                    mark(node, MARK, false);
                }
            }
        }


        for (const node of hidden) {

            mark(
                node,
                MARK,
                true
            );
        }


        // --------------------------------------------------------
        // LIMITE POST
        // --------------------------------------------------------

        const max =
            Number.isInteger(config.feedPostLimit) &&
            config.feedPostLimit > 0
                ? config.feedPostLimit
                : null;


        if (max && home) {

            for (
                const post of select(
                    root,
                    RULES.post
                )
            ) {

                if (
                    !post.closest(
                        'main, [role="main"], [role="feed"]'
                    ) ||
                    post.closest(RULES.protected)
                ) {
                    continue;
                }

                const key =
                    postKey(
                        post,
                        doc.location.href
                    );

                let over = false;

                if (key) {

                    if (
                        !seenPosts.has(key) &&
                        seenPosts.size < max
                    ) {
                        seenPosts.add(key);
                    }

                    over =
                        !seenPosts.has(key);
                }

                mark(
                    post,
                    LIMIT,
                    over
                );
            }
        }


        // --------------------------------------------------------
        // ESPLORA
        // --------------------------------------------------------

        if (
            config.enableExplore &&
            isExploreSearch(
                doc.location.href,
                doc.location.href
            )
        ) {
            cleanExploreSearch(
                root,
                doc
            );
        }
    }


    // ============================================================
    // AVVIO
    // ============================================================

    function start(
        win,
        config = CONFIG
    ) {

        const doc = win.document;

        if (
            win.top !== win.self ||
            doc.querySelector(
                `style[${OWN}]`
            )
        ) {
            return;
        }


        let route =
            win.location.href;

        let redirecting = false;

        const seenPosts = new Set();

        const pending = new Set();

        let scheduled = false;


        // --------------------------------------------------------
        // CSS
        // --------------------------------------------------------

        const style =
            doc.createElement('style');

        style.setAttribute(
            OWN,
            ''
        );

        style.textContent = `
            [${MARK}],
            [${LIMIT}] {
                display: none !important;
            }
        `;


        function mountStyle() {

            if (
                !style.isConnected &&
                doc.documentElement
            ) {
                doc.documentElement.append(style);
            }
        }


        // --------------------------------------------------------
        // REDIRECT SEGUITI
        // --------------------------------------------------------

        function handleFollowingOnly() {

            if (!config.followingOnly) {
                return false;
            }

            const path =
                normalizedPath(
                    win.location.pathname
                );


            /*
             * La home normale viene trasformata
             * automaticamente in "Seguiti".
             */

            if (
                path === '/' &&
                !redirecting
            ) {

                redirecting = true;

                win.location.replace(
                    win.location.origin +
                    '/following/'
                );

                return true;
            }


            /*
             * Se l'utente prova a tornare
             * al feed principale, viene riportato
             * nella schermata Seguiti.
             */

            if (
                path === '/' &&
                !redirecting
            ) {

                redirecting = true;

                win.location.replace(
                    win.location.origin +
                    '/following/'
                );

                return true;
            }

            return false;
        }


        // --------------------------------------------------------
        // NAVIGAZIONE
        // --------------------------------------------------------

        function handleNavigation() {

            // followingOnly
            handleFollowingOnly();


            // NON blocchiamo più i Reel.

            if (
                route !== win.location.href
            ) {

                route =
                    win.location.href;

                seenPosts.clear();

                for (
                    const node of doc.querySelectorAll(
                        `[${LIMIT}]`
                    )
                ) {
                    node.removeAttribute(
                        LIMIT
                    );
                }

                enqueue(
                    doc.documentElement
                );
            }
        }


        // --------------------------------------------------------
        // PULIZIA
        // --------------------------------------------------------

        function processPage() {

            cleanPage(
                doc.documentElement,
                doc,
                config,
                seenPosts,
                null
            );
        }


        // --------------------------------------------------------
        // CODA MUTAZIONI
        // --------------------------------------------------------

        function enqueue(node) {

            if (
                !node ||
                node.nodeType !== 1
            ) {
                return;
            }


            if (
                node.closest(
                    `[${OWN}]`
                )
            ) {
                return;
            }


            node =
                node.closest(
                    RULES.unit
                ) || node;


            for (
                const queued of pending
            ) {

                if (
                    queued.contains(node)
                ) {
                    return;
                }

                if (
                    node.contains(queued)
                ) {
                    pending.delete(
                        queued
                    );
                }
            }


            pending.add(node);


            if (!scheduled) {

                scheduled = true;

                win.requestAnimationFrame(
                    flush
                );
            }
        }


        function flush() {

            scheduled = false;

            mountStyle();

            handleNavigation();

            processPage();


            if (pending.size) {

                pending.clear();

                scheduled = true;

                win.requestAnimationFrame(
                    flush
                );
            }
        }


        // --------------------------------------------------------
        // NASCONDI ICONA REEL
        // --------------------------------------------------------

        function intercept(event) {

            if (
                event.type === 'keydown' &&
                !['Enter', ' '].includes(
                    event.key
                )
            ) {
                return;
            }


            const control =
                event.composedPath()
                    .find(
                        node =>
                            node.matches?.(
                                RULES.control
                            )
                    );

            if (!control) return;


            const kind =
                controlKind(
                    control,
                    config,
                    win.location.href
                );


            /*
             * SOLO L'ICONA REEL VIENE NASCOSTA.
             *
             * Non facciamo preventDefault().
             * Quindi un URL /reels/ o /reel/
             * continua ad essere navigabile.
             */

            if (
                kind === 'reels' &&
                config.hideReelsIcon
            ) {

                const unit =
                    findRemovableFeedContainer(
                        control
                    );

                if (unit) {
                    mark(
                        unit,
                        MARK,
                        true
                    );
                } else {
                    mark(
                        control,
                        MARK,
                        true
                    );
                }

                return;
            }


            // Stories
            if (
                kind === 'stories' &&
                config.removeStories
            ) {

                event.preventDefault();
                event.stopImmediatePropagation();

                return;
            }
        }


        // --------------------------------------------------------
        // EVENTI
        // --------------------------------------------------------

        for (
            const type of [
                'click',
                'auxclick',
                'touchstart',
                'touchend',
                'pointerdown',
                'keydown'
            ]
        ) {

            win.addEventListener(
                type,
                intercept,
                {
                    capture: true,
                    passive: false
                }
            );
        }


        // --------------------------------------------------------
        // HISTORY API
        // --------------------------------------------------------

        for (
            const method of [
                'pushState',
                'replaceState'
            ]
        ) {

            const original =
                win.history[method];

            win.history[method] =
                function (...args) {

                    const result =
                        Reflect.apply(
                            original,
                            this,
                            args
                        );

                    handleNavigation();

                    return result;
                };
        }


        // --------------------------------------------------------
        // EVENTI DI NAVIGAZIONE
        // --------------------------------------------------------

        for (
            const event of [
                'popstate',
                'hashchange',
                'pageshow',
                'focus'
            ]
        ) {

            win.addEventListener(
                event,
                handleNavigation
            );
        }


        doc.addEventListener(
            'visibilitychange',
            handleNavigation
        );


        // --------------------------------------------------------
        // CONTROLLO PERIODICO
        // --------------------------------------------------------

        win.setInterval(() => {

            if (!doc.hidden) {
                handleNavigation();
            }

        }, 2000);


        // --------------------------------------------------------
        // MUTATION OBSERVER
        // --------------------------------------------------------

        const observer =
            new win.MutationObserver(
                records => {

                    mountStyle();

                    handleNavigation();

                    for (
                        const record of records
                    ) {

                        if (
                            record.target
                                .parentElement
                                ?.closest(
                                    `[${OWN}]`
                                )
                        ) {
                            continue;
                        }


                        if (
                            record.type ===
                            'childList'
                        ) {

                            for (
                                const node
                                of record.addedNodes
                            ) {

                                enqueue(
                                    node.nodeType === 3
                                        ? node.parentElement
                                        : node
                                );
                            }

                        } else {

                            enqueue(
                                record.target
                            );
                        }
                    }
                }
            );


        observer.observe(
            doc,
            {
                subtree: true,
                childList: true,
                characterData: true,
                attributes: true,
                attributeFilter: [
                    'href',
                    'aria-label',
                    'role',
                    'value'
                ]
            }
        );


        // --------------------------------------------------------
        // INPUT ESPLORA
        // --------------------------------------------------------

        doc.addEventListener(
            'input',
            () => {

                if (
                    isExploreSearch(
                        win.location.href,
                        win.location.href
                    )
                ) {
                    enqueue(
                        doc.documentElement
                    );
                }

            },
            true
        );


        mountStyle();

        handleNavigation();

        enqueue(
            doc.documentElement
        );


        // --------------------------------------------------------
        // STOP VIDEO NEI CONTENITORI NASCOSTI
        // --------------------------------------------------------

        doc.addEventListener(
            'play',
            event => {

                if (
                    event.target.matches?.(
                        'video'
                    ) &&
                    event.target.closest(
                        `[${MARK}], [${LIMIT}]`
                    )
                ) {
                    event.target.pause();
                }

            },
            true
        );


        return {
            cleanPage: processPage,
            handleNavigation,
            disconnectObserver:
                () => observer.disconnect()
        };
    }


    // ============================================================
    // NODE TEST
    // ============================================================

    if (
        typeof module === 'object' &&
        module.exports &&
        typeof window === 'undefined'
    ) {

        module.exports = {
            CONFIG,
            RULES,
            normalizedPath,
            instagramURL,
            isReelURL,
            isExploreURL,
            isExploreSearch,
            controlKind,
            postKey,
            findRemovableFeedContainer,
            start
        };

    } else if (
        typeof window !== 'undefined'
    ) {

        start(window);
    }

})();// ==UserScript==
// @name         Instagram Clean
// @namespace    urn:instagram-clean
// @version      1.0.0
// @description  Locally hide Reels and optional recommendation surfaces on Instagram.
// @match        https://www.instagram.com/*
// @match        https://instagram.com/*
// @run-at       document-start
// @inject-into  auto
// @grant        none
// @noframes
// ==/UserScript==

(() => {
    'use strict';

    // EDIT HERE, then reinstall the file and reload Instagram. No build needed.
    const CONFIG = {
        blockReels: true,
        blockExplore: true,
        removeSuggestedPosts: false,
        removeSuggestedAccounts: false,
        removeStories: false,
        feedPostLimit: null,
        debug: false,
        showToast: false
    };

    // Central detection rules. Text rules are conservative English heuristics,
    // not claims about Instagram's current authenticated DOM. No generated classes.
    const RULES = {
        control: 'a[href], button, [role="link"], [role="button"], [role="tab"]',
        heading: 'h1, h2, h3, h4, [role="heading"]',
        unit: 'article, [role="article"], section, [role="region"], li, [role="listitem"]',
        post: 'article, [role="article"]',
        protected: 'nav, [role="navigation"], [role="dialog"], [role="textbox"], [contenteditable="true"]',
        labels: {
            reels: /^(?:reels?|watch reels?|open reels?|suggested reels|reels for you|trending reels|recommended reels)$/i,
            explore: /^explore$/i,
            posts: /^(?:suggested posts?|recommended posts?)$/i,
            accounts: /^(?:suggested for you|suggested accounts|discover people|people you may know)$/i,
            stories: /^stories$/i
        }
    };
    const MARK = 'data-instagram-clean-hidden';
    const LIMIT = 'data-instagram-clean-limit';
    const OWN = 'data-instagram-clean-owned';

    function normalizedPath(path) {
        try { path = decodeURIComponent(path); } catch { /* Keep malformed escapes literal. */ }
        const segments = path.split('/').filter(Boolean).join('/').toLowerCase();
        return segments ? '/' + segments + '/' : '/';
    }

    function instagramURL(value, base = 'https://www.instagram.com/') {
        try {
            const url = new URL(value, base);
            return ['https:', 'http:'].includes(url.protocol) &&
                ['instagram.com', 'www.instagram.com'].includes(url.hostname) ? url : null;
        } catch { return null; }
    }

    function isReelURL(value, base) {
        const url = instagramURL(value, base);
        if (!url) return false;
        const parts = normalizedPath(url.pathname).split('/').filter(Boolean);
        // Root feeds/permalinks, profile Reels tabs, profile-prefixed permalinks.
        // /share/reel/ is a defensive share-link pattern; not authenticated-verified.
        return /^(reel|reels)$/.test(parts[0] || '') ||
            (parts.length >= 2 && !['direct', 'stories', 'p', 'accounts', 'explore'].includes(parts[0]) &&
                /^(reel|reels)$/.test(parts[1]));
    }

    function isExploreURL(value, base) {
        const url = instagramURL(value, base);
        if (!url) return false;
        const path = normalizedPath(url.pathname);
        // Account search must remain available, including the Explore search route.
        return path.startsWith('/explore/') && !path.startsWith('/explore/search/');
    }

    function blockedURL(value, config = CONFIG, base) {
        if (config.blockReels && isReelURL(value, base)) return 'reels';
        if (config.blockExplore && isExploreURL(value, base)) return 'explore';
        const url = instagramURL(value, base);
        if (config.removeStories && url && normalizedPath(url.pathname).startsWith('/stories/')) return 'stories';
        return null;
    }

    function labelKind(value) {
        const label = (value || '').replace(/\s+/g, ' ').trim();
        if (label.length > 64) return null;
        return Object.keys(RULES.labels).find(key => RULES.labels[key].test(label)) || null;
    }

    function enabled(kind, config) {
        return !!({ reels: config.blockReels, explore: config.blockExplore,
            posts: config.removeSuggestedPosts, accounts: config.removeSuggestedAccounts,
            stories: config.removeStories })[kind];
    }

    function controlKind(element, config, base) {
        if (element.hasAttribute('href')) {
            const kind = blockedURL(element.getAttribute('href'), config, base);
            if (kind) return kind;
            // A safe explicit destination beats an ambiguous caption/icon.
            return null;
        }
        const icon = element.querySelector('svg[aria-label], svg title');
        const label = element.getAttribute('aria-label') ||
            icon?.getAttribute('aria-label') || icon?.textContent || element.textContent;
        const kind = labelKind(label);
        return enabled(kind, config) ? kind : null;
    }

    function select(root, selector) {
        return [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)];
    }

    function postKey(post, base) {
        // Only count clear, unique /p/ permalinks. Never infer Reels from <video>.
        const keys = new Set();
        for (const a of post.querySelectorAll('a[href]')) {
            const url = instagramURL(a.getAttribute('href'), base);
            if (url && /^\/p\/[^/]+\/?$/i.test(url.pathname)) keys.add(url.pathname.split('/')[2]);
        }
        return keys.size === 1 ? [...keys][0] : null;
    }

    function hasOrdinaryPostLink(unit, base) {
        return [...unit.querySelectorAll('a[href]')].some(a => {
            const url = instagramURL(a.getAttribute('href'), base);
            return url && /^\/p\/[^/]+\/?$/i.test(url.pathname);
        });
    }

    function findRemovableFeedContainer(element) {
        if (element.closest(RULES.protected)) return null;
        const unit = element.closest(RULES.unit);
        if (!unit || unit.matches('main, [role="main"], [role="feed"]')) return null;
        // Never climb beyond one semantic unit or swallow a set of posts.
        if (unit.querySelector(RULES.post) || unit.querySelector('main, nav, [role="feed"], [role="navigation"]')) return null;
        return unit;
    }

    function isHome(value) {
        const url = instagramURL(value);
        return !!url && ['/', '/following/'].includes(normalizedPath(url.pathname));
    }

    function start(win, config = CONFIG) {
        const doc = win.document;
        if (win.top !== win.self || doc.querySelector(`style[${OWN}]`)) return;
        const log = message => { if (config.debug) win.console.info('[InstagramClean] ' + message); };
        let route = win.location.href;
        let redirecting = false;
        const seenPosts = new Set();
        const max = Number.isInteger(config.feedPostLimit) && config.feedPostLimit > 0 ? config.feedPostLimit : null;
        const pending = new Set();
        let scheduled = false;
        let notice;
        let toast;

        const style = doc.createElement('style');
        style.setAttribute(OWN, '');
        const paths = [];
        if (config.blockReels) paths.push('/reel', '/reels');
        if (config.blockExplore) paths.push('/explore');
        if (config.removeStories) paths.push('/stories');
        const early = paths.flatMap(path => ['', 'https://www.instagram.com', 'https://instagram.com'].flatMap(origin =>
            [`a[href="${origin}${path}"]`, `a[href^="${origin}${path}/"]`, `a[href^="${origin}${path}?"]`]
        )).map(selector => selector + ':not([href*="/explore/search"])');
        style.textContent = `[${MARK}], [${LIMIT}] { display: none !important; }\n` +
            (early.length ? early.join(',\n') + ' { display: none !important; }' : '');

        function mountStyle() {
            if (!style.isConnected && doc.documentElement) doc.documentElement.append(style);
        }

        function mark(element, attribute, hide) {
            if (hide === element.hasAttribute(attribute)) return;
            if (hide) {
                element.setAttribute(attribute, '');
                for (const video of element.querySelectorAll('video')) video.pause();
            } else element.removeAttribute(attribute);
        }

        function feedback(kind) {
            log('blocked ' + kind + ' navigation'); // Never log URLs, identifiers, or content.
            if (!config.showToast || !doc.body || toast) return;
            toast = doc.createElement('div');
            toast.setAttribute(OWN, '');
            toast.setAttribute('role', 'status');
            toast.textContent = kind === 'reels' ? 'Reels blocked' : 'Distraction blocked';
            toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:8px 14px;border-radius:18px;background:#222;color:white;font:14px system-ui;z-index:2147483647;pointer-events:none';
            doc.body.append(toast);
            win.setTimeout(() => { toast.remove(); toast = null; }, 1500);
        }

        function handleNavigation() {
            const kind = blockedURL(win.location.href, config);
            if (kind) {
                if (!redirecting) {
                    redirecting = true;
                    feedback(kind);
                    // Fixed same-origin home fallback cannot itself match a blocked route.
                    // Full replace also resets React's internal route after popstate/redirect.
                    win.location.replace(win.location.origin + '/');
                }
                return;
            }
            redirecting = false;
            if (route !== win.location.href) {
                route = win.location.href;
                seenPosts.clear();
                notice?.remove();
                notice = null;
                for (const node of doc.querySelectorAll(`[${MARK}], [${LIMIT}]`)) {
                    node.removeAttribute(MARK);
                    node.removeAttribute(LIMIT);
                }
                enqueue(doc.documentElement);
            }
        }

        function cleanPage(root) {
            const hidden = new Set();
            const home = isHome(win.location.href);
            const path = normalizedPath(win.location.pathname);
            const protectedRoute = path.startsWith('/direct/') || path.startsWith('/stories/') || path.startsWith('/accounts/');
            for (const control of select(root, RULES.control)) {
                const kind = controlKind(control, config, win.location.href);
                if (!kind) continue;
                // Optional content labels do not disable unrelated action buttons.
                if (!['reels', 'explore', 'stories'].includes(kind)) continue;
                hidden.add(control);
                if (kind === 'reels' && home && !protectedRoute) {
                    const unit = findRemovableFeedContainer(control);
                    // A Reel mentioned in an ordinary post's caption is not that post.
                    if (unit && !hasOrdinaryPostLink(unit, win.location.href)) hidden.add(unit);
                }
            }
            if (!protectedRoute) {
                for (const heading of select(root, RULES.heading + ', section[aria-label], [role="region"][aria-label]')) {
                    const kind = labelKind(heading.getAttribute('aria-label') || heading.textContent);
                    if (!enabled(kind, config) || kind === 'explore') continue;
                    const unit = findRemovableFeedContainer(heading);
                    if (!unit) continue;
                    if (kind === 'posts' && !home) continue;
                    // Suggested-for-you must describe an account shelf, not a post.
                    if (kind === 'accounts' && hasOrdinaryPostLink(unit, win.location.href)) continue;
                    if (kind === 'reels' && hasOrdinaryPostLink(unit, win.location.href)) continue;
                    hidden.add(unit);
                }
            }
            for (const node of select(root, `[${MARK}]`)) mark(node, MARK, hidden.has(node));
            for (const node of hidden) {
                mark(node, MARK, true);
                log('hidden distraction surface');
            }
            if (max && home) {
                for (const post of select(root, RULES.post)) {
                    if (!post.closest('main, [role="main"], [role="feed"]') || post.closest(RULES.protected)) continue;
                    const key = postKey(post, win.location.href);
                    let over = false;
                    if (key && !post.closest(`[${MARK}]`)) {
                        if (!seenPosts.has(key) && seenPosts.size < max) seenPosts.add(key);
                        over = !seenPosts.has(key);
                    }
                    mark(post, LIMIT, over);
                    if (over && !notice?.isConnected) {
                        notice = doc.createElement('p');
                        notice.setAttribute(OWN, '');
                        notice.setAttribute('role', 'status');
                        notice.textContent = 'You’re caught up here.';
                        notice.style.cssText = 'padding:24px;text-align:center;color:inherit;font:14px system-ui;opacity:.7';
                        post.before(notice);
                    }
                }
            }
        }

        function enqueue(node) {
            if (!node || node.nodeType !== 1 || node.closest(`[${OWN}]`)) return;
            // Expand to nearest unit so a new child can reclassify a recycled post.
            node = node.closest(RULES.unit) || node;
            for (const queued of pending) {
                if (queued.contains(node)) return;
                if (node.contains(queued)) pending.delete(queued);
            }
            pending.add(node);
            if (!scheduled) {
                scheduled = true;
                win.requestAnimationFrame(flush);
            }
        }

        function flush() {
            scheduled = false;
            mountStyle();
            handleNavigation();
            const begin = win.performance.now();
            for (const node of pending) {
                pending.delete(node);
                if (node.isConnected) cleanPage(node);
                if (win.performance.now() - begin > 8) break;
            }
            if (pending.size) { scheduled = true; win.requestAnimationFrame(flush); }
        }

        function intercept(event) {
            if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
            const control = event.composedPath().find(node => node.matches?.(RULES.control));
            if (!control) return;
            const kind = controlKind(control, config, win.location.href);
            if (!['reels', 'explore', 'stories'].includes(kind)) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            feedback(kind);
        }

        for (const type of ['click', 'auxclick', 'touchstart', 'touchend', 'pointerdown', 'keydown']) {
            win.addEventListener(type, intercept, { capture: true, passive: false });
        }
        for (const method of ['pushState', 'replaceState']) {
            const original = win.history[method];
            win.history[method] = function (...args) {
                const kind = args[2] == null ? null : blockedURL(args[2], config, win.location.href);
                if (kind) { feedback(kind); return; }
                const result = Reflect.apply(original, this, args);
                handleNavigation();
                return result;
            };
        }
        for (const event of ['popstate', 'hashchange', 'pageshow', 'focus']) win.addEventListener(event, handleNavigation);
        doc.addEventListener('visibilitychange', handleNavigation);
        // Safari may isolate History API hooks or Instagram may retain the original.
        // This visible-tab safety check compares one URL; it does not scan the DOM.
        win.setInterval(() => { if (!doc.hidden) handleNavigation(); }, 2000);
        const observer = new win.MutationObserver(records => {
            mountStyle();
            handleNavigation();
            for (const record of records) {
                if (record.target.parentElement?.closest(`[${OWN}]`)) continue;
                if (record.type !== 'childList') enqueue(record.target.nodeType === 3 ? record.target.parentElement : record.target);
                else {
                    for (const node of record.addedNodes) enqueue(node.nodeType === 3 ? node.parentElement : node);
                    // Removed children may change classification of recycled units.
                    if (record.target.nodeType === 1 && record.target.closest(RULES.unit)) enqueue(record.target);
                }
            }
        });
        observer.observe(doc, { subtree: true, childList: true, characterData: true,
            attributes: true, attributeFilter: ['href', 'aria-label', 'role'] });
        mountStyle();
        handleNavigation();
        enqueue(doc.documentElement);
        // Media inserted into a hidden surface must not continue playing audio.
        doc.addEventListener('play', event => {
            if (event.target.matches?.('video') && event.target.closest(`[${MARK}], [${LIMIT}]`)) event.target.pause();
        }, true);
        return { cleanPage, handleNavigation, disconnectObserver: () => observer.disconnect() };
    }

    // Node-only test seam. The distributed file is the source tested, not a copy.
    if (typeof module === 'object' && module.exports && typeof window === 'undefined') {
        module.exports = { CONFIG, RULES, normalizedPath, instagramURL, isReelURL, isExploreURL,
            blockedURL, labelKind, controlKind, postKey, findRemovableFeedContainer, start };
    } else if (typeof window !== 'undefined') start(window);
})();
