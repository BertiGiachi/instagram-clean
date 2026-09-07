const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const script = require('../instagram-clean.user.js');
const { CONFIG, isReelURL, isExploreURL, blockedURL, normalizedPath, labelKind } = script;
const HIDDEN = 'data-instagram-clean-hidden';
const LIMIT = 'data-instagram-clean-limit';

function fixture(html, config = {}, path = '/') {
    const dom = new JSDOM(html, { url: 'https://www.instagram.com' + path, pretendToBeVisual: true });
    const app = script.start(dom.window, { ...CONFIG, ...config });
    app.cleanPage(dom.window.document.documentElement);
    const close = dom.window.close.bind(dom.window);
    dom.window.close = () => { app.disconnectObserver(); close(); };
    return { dom, win: dom.window, doc: dom.window.document, app };
}
const post = id => `<article id="post${id}"><a href="/p/${id}/"><img></a><button>Like</button></article>`;

test('Reel feeds, permalinks, profiles, encoded and share variants', () => {
    for (const url of ['/reels', '/reel/ABC/', '/reels/ABC/?x=1#x', '/name/reels/', '/name/reel/ABC/',
        '/share/reel/ABC/', '/%72eel/ABC', '/REELS/', '/reel//ABC',
        'https://instagram.com/reel/ABC/', '//www.instagram.com/reels/']) assert.equal(isReelURL(url), true, url);
    assert.equal(isReelURL('reel/ABC', 'https://www.instagram.com/'), true);
});
test('safe URLs and unrelated origins are not Reels', () => {
    for (const url of ['/', '/username/', '/p/POST_ID/', '/p/reel/', '/direct/', '/direct/reels/', '/stories/reels/',
        '/stories/name/123/', '/reelsfan/', '/name/tagged/', '/accounts/login/?next=/reels/',
        'https://example.com/reel/1', 'https://www.instagram.com.evil.test/reels/',
        'javascript:alert(1)', 'instagram://reels', 'https://[invalid']) assert.equal(isReelURL(url), false, url);
});
test('Explore routes preserve account search', () => {
    for (const path of ['/explore', '/explore/', '/explore/tags/cats/', '/EXPLORE/?x=1']) assert.equal(isExploreURL(path), true);
    for (const path of ['/', '/explorer/', '/explore/search/', '/explore/search/?q=cat', '/direct/',
        'https://other.test/explore/']) assert.equal(isExploreURL(path), false);
});
test('path normalization', () => {
    assert.equal(normalizedPath('/'), '/');
    assert.equal(normalizedPath('ReEl//ABC'), '/reel/abc/');
    assert.equal(normalizedPath('/%72eel/'), '/reel/');
    assert.equal(normalizedPath('/bad%zz'), '/bad%zz/');
});
test('config is opt-in except Reels and Explore', () => {
    assert.equal(blockedURL('/reel/a'), 'reels');
    assert.equal(blockedURL('/explore/'), 'explore');
    assert.equal(blockedURL('/reels/', { ...CONFIG, blockReels: false }), null);
    assert.equal(blockedURL('/explore/', { ...CONFIG, blockExplore: false }), null);
    assert.equal(blockedURL('/stories/alice/'), null);
    assert.equal(blockedURL('/stories/alice/', { ...CONFIG, removeStories: true }), 'stories');
    assert.equal(CONFIG.feedPostLimit, null);
});
test('exact short semantic labels only', () => {
    assert.equal(labelKind('  Suggested   Reels '), 'reels');
    assert.equal(labelKind('Trending Reels'), 'reels');
    assert.equal(labelKind('Suggested for you'), 'accounts');
    assert.equal(labelKind('I love reels and photos'), null);
    assert.equal(labelKind('Play video'), null);
});
test('smallest unit selected; feed, dialogs and nested post containers protected', () => {
    const dom = new JSDOM(`<main><section id="feed">${post('A')}<article id="reel"><a id="a" href="/reel/X/">Play</a></article></section>
        <div id="unknown"><a id="b" href="/reel/Y/">Play</a></div>
        <div role="dialog"><article><a id="c" href="/reel/Z/">Play</a></article></div></main>`);
    const d = dom.window.document;
    assert.equal(script.findRemovableFeedContainer(d.querySelector('#a')).id, 'reel');
    assert.equal(script.findRemovableFeedContainer(d.querySelector('#b')), null);
    assert.equal(script.findRemovableFeedContainer(d.querySelector('#c')), null);
    assert.equal(script.findRemovableFeedContainer(d.querySelector('#feed')), null);
    dom.window.close();
});
test('Reel posts and modules hidden, photos/carousels/video/captions preserved', t => {
    const f = fixture(`<main>${post('A')}<article id="normal"><a href="/p/B/">Photo</a><a href="/reel/X/">Caption link</a></article>
        <article id="video"><video></video><a href="/p/C/">Video</a></article>
        <article id="carousel"><a href="/p/D/"><img><img></a></article>
        <article id="reel"><a href="/reel/R/">Reel</a></article>
        <section id="shelf"><h2>Suggested Reels</h2><div>Cards</div></section>
        <article id="caption"><a href="/p/E/">Post</a><p>Suggested Reels</p></article></main>`);
    t.after(() => f.win.close());
    for (const id of ['reel', 'shelf']) assert.ok(f.doc.getElementById(id).hasAttribute(HIDDEN));
    for (const id of ['postA', 'normal', 'video', 'carousel', 'caption']) assert.ok(!f.doc.getElementById(id).hasAttribute(HIDDEN), id);
    assert.ok(!f.doc.querySelector('main').hasAttribute(HIDDEN));
});
test('safe href overrides misleading label; SVG button labels work', t => {
    const f = fixture('<nav><a id="safe" href="/reelsfan/" aria-label="Reels">Reels</a><button id="blocked"><svg><title>Reels</title></svg></button></nav>');
    t.after(() => f.win.close());
    assert.ok(!f.doc.querySelector('#safe').hasAttribute(HIDDEN));
    assert.ok(f.doc.querySelector('#blocked').hasAttribute(HIDDEN));
});
test('mixed div-based shelf never hides its ordinary posts', t => {
    const f = fixture('<main><section id="mixed"><h2>Suggested Reels</h2><div><a href="/p/A/">A</a></div><div><a href="/p/B/">B</a></div><a href="/reel/C/">C</a></section></main>');
    t.after(() => f.win.close());
    assert.ok(!f.doc.querySelector('#mixed').hasAttribute(HIDDEN));
    assert.ok(f.doc.querySelector('a[href="/reel/C/"]').hasAttribute(HIDDEN));
});
test('early CSS blocks only bounded URL paths and preserves search', t => {
    const f = fixture('<a id="reel" href="/reels/A/">R</a><a id="search" href="/explore/search/">Search</a><a id="profile" href="/reelsfan/">Person</a>');
    t.after(() => f.win.close());
    assert.equal(f.win.getComputedStyle(f.doc.querySelector('#reel')).display, 'none');
    assert.notEqual(f.win.getComputedStyle(f.doc.querySelector('#search')).display, 'none');
    assert.notEqual(f.win.getComputedStyle(f.doc.querySelector('#profile')).display, 'none');
});
test('debug emits no private URLs or content and is silent by default', t => {
    for (const debug of [false, true]) {
        const f = fixture('', { debug });
        t.after(() => f.win.close());
        const messages = [];
        f.win.console.info = message => messages.push(message);
        f.doc.body.innerHTML = '<a href="/reel/PRIVATE_ID/">private caption</a>';
        f.doc.querySelector('a').dispatchEvent(new f.win.Event('click', { bubbles: true, cancelable: true }));
        assert.equal(messages.length, debug ? 1 : 0);
        assert.ok(messages.every(message => !/PRIVATE_ID|private caption/.test(message)));
    }
});
test('profile Reels tab does not hide surrounding profile section', t => {
    const f = fixture('<main><section id="profile"><h1>Alice</h1><button>Follow</button><a href="/alice/reels/">Reels</a></section></main>', {}, '/alice/');
    t.after(() => f.win.close());
    assert.ok(!f.doc.querySelector('#profile').hasAttribute(HIDDEN));
    assert.ok(f.doc.querySelector('a').hasAttribute(HIDDEN));
});
test('disabled config leaves all surfaces alone', t => {
    const f = fixture('<a href="/reels/">Reels</a><a href="/explore/">Explore</a><section><h2>Suggested Reels</h2></section>', { blockReels: false, blockExplore: false });
    t.after(() => f.win.close());
    assert.equal(f.doc.querySelectorAll(`[${HIDDEN}]`).length, 0);
    assert.ok(!f.doc.querySelector('style').textContent.includes('a[href'));
});
test('suggestions and Stories are optional; account heuristic preserves posts', t => {
    const html = `<main><article id="suggested"><h2>Suggested post</h2><a href="/p/A/">Post</a></article>
        <article id="followed"><a href="/p/B/">Post</a><p>Suggested post</p></article>
        <section id="accounts"><h2>Suggested for you</h2><a href="/alice/">Alice</a></section>
        <article id="ambiguous"><h2>Suggested for you</h2><a href="/p/C/">Post</a></article>
        <section id="stories" aria-label="Stories"><a href="/stories/alice/">Alice</a></section></main>`;
    const off = fixture(html);
    const on = fixture(html, { removeSuggestedPosts: true, removeSuggestedAccounts: true, removeStories: true });
    t.after(() => { off.win.close(); on.win.close(); });
    assert.equal(off.doc.querySelectorAll(`[${HIDDEN}]`).length, 0);
    for (const id of ['suggested', 'accounts', 'stories']) assert.ok(on.doc.getElementById(id).hasAttribute(HIDDEN));
    for (const id of ['followed', 'ambiguous']) assert.ok(!on.doc.getElementById(id).hasAttribute(HIDDEN));
});
test('DM message containers preserved even with Reel links', t => {
    const f = fixture('<main><article id="message"><a href="/reel/A/">Shared Reel</a></article></main>', {}, '/direct/t/123/');
    t.after(() => f.win.close());
    assert.ok(!f.doc.querySelector('#message').hasAttribute(HIDDEN));
    assert.ok(f.doc.querySelector('a').hasAttribute(HIDDEN));
});
test('capture blocks dynamic clicks and touch, safe controls still work', t => {
    const f = fixture('<main></main>');
    t.after(() => f.win.close());
    f.doc.querySelector('main').innerHTML = '<a id="r" href="/reels/A/"><span>Play</span></a><a id="s" href="/direct/">DMs</a>';
    let bubbled = 0;
    f.doc.addEventListener('click', () => bubbled++);
    for (const type of ['click', 'touchstart', 'touchend', 'pointerdown']) {
        const event = new f.win.Event(type, { bubbles: true, cancelable: true, composed: true });
        assert.equal(f.doc.querySelector('#r span').dispatchEvent(event), false);
    }
    assert.equal(bubbled, 0);
    const safe = new f.win.Event('click', { bubbles: true, cancelable: true });
    assert.equal(f.doc.querySelector('#s').dispatchEvent(safe), true);
    assert.equal(bubbled, 1);
});
test('History API blocks bad destinations and preserves safe state and errors', t => {
    const f = fixture('');
    t.after(() => f.win.close());
    f.win.history.pushState({ hello: 1 }, '', '/direct/');
    assert.equal(f.win.location.pathname, '/direct/');
    assert.deepEqual(f.win.history.state, { hello: 1 });
    f.win.history.pushState({}, '', '/reels/A/');
    f.win.history.replaceState({}, '', '/explore/');
    assert.equal(f.win.location.pathname, '/direct/');
    assert.throws(() => f.win.history.pushState({}, '', 'https://other.test/'));
});
test('finite feed counts unique legitimate posts; resets outside feed', t => {
    const f = fixture(`<nav>${post('NAV')}</nav><main>${post('A')}${post('B')}${post('C')}${post('A')}</main>`, { feedPostLimit: 2 });
    t.after(() => f.win.close());
    assert.equal(f.doc.querySelectorAll(`[${LIMIT}]`).length, 1);
    assert.ok(f.doc.querySelector('#postC').hasAttribute(LIMIT));
    assert.equal(f.doc.querySelector('[role="status"]').textContent, 'You’re caught up here.');
    f.app.cleanPage(f.doc.documentElement);
    assert.equal(f.doc.querySelectorAll('[role="status"]').length, 1);
    f.win.history.pushState({}, '', '/alice/');
    f.app.cleanPage(f.doc.documentElement);
    assert.equal(f.doc.querySelectorAll(`[${LIMIT}]`).length, 0);
});
test('invalid limits disabled and profiles never limited', t => {
    for (const limit of [null, 0, -1, 1.5, '2']) {
        const f = fixture(`<main>${post('A')}${post('B')}</main>`, { feedPostLimit: limit });
        t.after(() => f.win.close());
        assert.equal(f.doc.querySelectorAll(`[${LIMIT}]`).length, 0);
    }
    const f = fixture(`<main>${post('A')}${post('B')}</main>`, { feedPostLimit: 1 }, '/alice/');
    t.after(() => f.win.close());
    assert.equal(f.doc.querySelectorAll(`[${LIMIT}]`).length, 0);
});
test('observer handles inserted/recycled hrefs and settles without feedback loops', async t => {
    const f = fixture('<main><article id="item"><a href="/reel/A/">Content</a></article></main>');
    t.after(() => f.win.close());
    const item = f.doc.querySelector('#item');
    item.querySelector('a').setAttribute('href', '/p/A/');
    await new Promise(resolve => f.win.setTimeout(resolve, 60));
    assert.ok(!item.hasAttribute(HIDDEN));
    assert.ok(!item.querySelector('a').hasAttribute(HIDDEN));
    const node = f.doc.createElement('a');
    node.href = '/reels/B/';
    f.doc.querySelector('main').append(node);
    await new Promise(resolve => f.win.setTimeout(resolve, 60));
    assert.ok(node.hasAttribute(HIDDEN));
    let mutations = 0;
    const observer = new f.win.MutationObserver(records => { mutations += records.length; });
    observer.observe(f.doc, { subtree: true, childList: true, attributes: true });
    await new Promise(resolve => f.win.setTimeout(resolve, 60));
    assert.equal(mutations, 0);
    observer.disconnect();
});
test('direct and popstate blocked routes replace with home only once', t => {
    // jsdom Location is non-configurable; a narrow window facade records replace.
    const dom = new JSDOM('', { url: 'https://www.instagram.com/', pretendToBeVisual: true });
    t.after(() => dom.window.close());
    let calls = 0;
    const location = { href: 'https://www.instagram.com/reel/A/', origin: 'https://www.instagram.com', pathname: '/reel/A/',
        replace(value) { calls++; assert.equal(value, 'https://www.instagram.com/'); } };
    const win = new Proxy(dom.window, { get(target, key) {
        if (key === 'location') return location;
        const value = Reflect.get(target, key);
        return typeof value === 'function' && !['MutationObserver'].includes(key) ? value.bind(target) : value;
    } });
    const app = script.start(win);
    t.after(() => app.disconnectObserver());
    app.handleNavigation();
    dom.window.dispatchEvent(new dom.window.PopStateEvent('popstate'));
    assert.equal(calls, 1);
    location.href = 'https://www.instagram.com/';
    location.pathname = '/';
    app.handleNavigation();
    location.href = 'https://www.instagram.com/explore/';
    app.handleNavigation();
    assert.equal(calls, 2);
});
