import { expect } from 'chai';
import { delay, promiseSelf } from './lib/utils.js';

import RelaksRouteManager from '../index.mjs';

describe('#change()', function() {
  it ('should change the route', async function() {
    const options = {
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
      },
      basePath: '/forum'
    };
    const manager = new RelaksRouteManager(options);
    const result = await manager.change('/forum/story/5');
    expect(result).to.be.true;
    expect(manager.url).to.equal('/forum/story/5');
    expect(manager.name).to.equal('story-page');
    expect(manager.params).to.deep.equal({ id: 5 });
    expect(location.pathname).to.equal('/forum/story/5');
  })
  it ('should change location.hash when fallback is used', async function() {
    const options = {
      useHashFallback: true,
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
      },
    };
    const manager = new RelaksRouteManager(options);
    await manager.change('/story/9');
    expect(location.hash).to.equal('#/story/9');
  })
  it ('should acquire context from rewrite', async function() {
    const r1 = {
      from: function(urlParts, context) {
        const re = /^\/(https?)\/(.*?)(\/|$)/;
        const m = re.exec(urlParts.path);
        if (m) {
          context.protocol = m[1];
          context.host = m[2];
          urlParts.path = '/' + urlParts.path.substr(m[0].length);
        }
      },
      to: function(urlParts, context) {
        if (context.protocol && context.host) {
          urlParts.path = `/${context.protocol}/${context.host}${urlParts.path}`;
        }
      },
    };
    const options = {
      routes: {
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        }
      },
      rewrites: [ r1 ]
    };
    const manager = new RelaksRouteManager(options);
    await manager.change('/https/example.net/story/5');
    expect(manager.context).to.deep.equal({
      protocol: 'https',
      host: 'example.net'
    });
  })
  it ('should fail when no route matches', async function() {
    const options = {
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
      },
      basePath: '/forum'
    };
    const manager = new RelaksRouteManager(options);
    try {
      await manager.change('/forum/nowhere');
      expect.fail();
    } catch (err) {
      expect(err).to.have.property('status', 404);
    }
  })
  it ('should fail when URL does not contain base path', async function() {
    const options = {
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
      },
      basePath: '/forum'
    };
    const manager = new RelaksRouteManager(options);
    try {
      await manager.change('/blog/story/5');
      expect.fail();
    } catch (err) {
      expect(err).to.have.property('status', 404);
    }
  })
  it ('should emit a beforechange and change event', async function() {
    const options = {
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
      },
      basePath: '/forum'
    };
    const manager = new RelaksRouteManager(options);
    const beforeChangeEventPromise = promiseSelf();
    const changeEventPromise = promiseSelf();
    manager.addEventListener('beforechange', beforeChangeEventPromise.resolve);
    manager.addEventListener('change', changeEventPromise.resolve);
    await manager.change('/forum/story/5');
    await beforeChangeEventPromise;
    await changeEventPromise;
  })
  it ('should not proceed with route change if preventDefault() is called during beforechange event', async function() {
    const options = {
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
      },
      basePath: '/forum'
    };
    const manager = new RelaksRouteManager(options);
    await manager.change('/forum/story/5');
    manager.addEventListener('beforechange', (evt) => {
      evt.preventDefault();
    });
    const result = await manager.change('/forum/story/5555');
    expect(result).to.be.false;
    expect(manager.url).to.equal('/forum/story/5');
  })
  it ('should not proceed with route change if postponeDefault() is called and the promise given resolves to false', async function() {
    const options = {
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
      },
      basePath: '/forum'
    };
    const manager = new RelaksRouteManager(options);
    await manager.change('/forum/story/5');
    manager.addEventListener('beforechange', (evt) => {
      const promise = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(false);
        }, 50);
      });
      evt.postponeDefault(promise);
    });
    const result = await manager.change('/forum/story/5555');
    expect(result).to.be.false;
    expect(manager.url).to.equal('/forum/story/5');
  })
  it ('should ignore multiple changes that have piled up due to postponeDefault()', async function() {
    const options = {
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
          public: false,
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
          public: false,
        },
        'welcome-page': {
          path: '/welcome',
          public: true,
        }
      },
    };
    const manager = new RelaksRouteManager(options);
    const authorizationPromise = promiseSelf();
    let authorized = false;
    let changeCount = 0;
    manager.addEventListener('beforechange', (evt) => {
      if (!evt.route.public) {
        if (!authorized) {
          evt.postponeDefault(authorizationPromise);
        }
      }
    });
    manager.addEventListener('change', (evt) => {
      changeCount++;
    });

    await manager.change('/welcome');
    for (let i = 1; i <= 5; i++) {
      setTimeout(() => {
        manager.change('/story/' + i);
      }, i * 25);
    }
    setTimeout(() => {
      manager.change('/news/');
    }, 5 * 25 + 75);
    setTimeout(authorizationPromise.resolve, 5 * 25 + 200);
    await authorizationPromise;
    await delay(100);
    expect(manager.history).to.have.length(2);
    expect(changeCount).to.equal(2);
  })
  it ('should accept an anchor element as input', async function() {
    const options = {
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
      },
      basePath: '/forum'
    };
    const anchor = document.createElement('A');
    anchor.href = '/forum/story/5';
    const manager = new RelaksRouteManager(options);
    const result = await manager.change(anchor);
    expect(result).to.be.true;
    expect(manager.url).to.equal('/forum/story/5');
    expect(manager.name).to.equal('story-page');
    expect(manager.params).to.deep.equal({ id: 5 });
    expect(location.pathname).to.equal('/forum/story/5');
  })
  it ('should accept an anchor element with URL in hash', async function() {
    const options = {
      useHashFallback: true,
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
      },
      basePath: '/forum'
    };
    const anchor = document.createElement('A');
    anchor.href = '#/forum/story/5';
    const manager = new RelaksRouteManager(options);
    const result = await manager.change(anchor);
    expect(result).to.be.true;
    expect(manager.url).to.equal('/forum/story/5');
    expect(manager.name).to.equal('story-page');
    expect(manager.params).to.deep.equal({ id: 5 });
    expect(location.pathname).to.equal('/forum/story/5');
  })
  it ('should fail when anchor points to URL with different protocol', async function() {
    const options = {
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
        'welcome-page': {
          path: '/',
        },
      },
      basePath: '/forum'
    };
    const anchor = document.createElement('A');
    anchor.href = `https://${location.host}/forum/story/5`;
    const manager = new RelaksRouteManager(options);
    try {
      await manager.change(anchor);
      expect.fail();
    } catch (err) {
      expect(err).to.have.property('status', 400);
    }
  })
  it ('should fail when anchor points to URL with different protocol', async function() {
    const options = {
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
        'welcome-page': {
          path: '/',
        },
      },
      basePath: '/forum'
    };
    const anchor = document.createElement('A');
    anchor.href = `http://nowhere/forum/story/5`;
    const manager = new RelaksRouteManager(options);
    try {
      await manager.change(anchor);
      expect.fail();
    } catch (err) {
      expect(err).to.have.property('status', 400);
    }
  })
  it ('should fail when anchor points to URL with different path', async function() {
    const options = {
      useHashFallback: true,
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
        'welcome-page': {
          path: '/',
        },
      },
      basePath: '/forum'
    };
    const anchor = document.createElement('A');
    anchor.href = `http://${location.host}/xyz#/forum/story/5`;
    const manager = new RelaksRouteManager(options);
    try {
      await manager.change(anchor);
      expect.fail();
    } catch (err) {
      expect(err).to.have.property('status', 400);
    }
  })
  it ('should fail when anchor points to URL with different query string', async function() {
    const options = {
      useHashFallback: true,
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
        'welcome-page': {
          path: '/',
        },
      },
      basePath: '/forum'
    };
    const anchor = document.createElement('A');
    anchor.href = `http://${location.host}/${location.pathname}?xyz=123#/forum/story/5`;
    const manager = new RelaksRouteManager(options);
    try {
      await manager.change(anchor);
      expect.fail();
    } catch (err) {
      expect(err).to.have.property('status', 400);
    }
  })
  it ('should call load() of route definition', async function() {
    const module = { default: { name: 'news' } };
    const options = {
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
          load: async (match) => {
            match.params.module = module;
          }
        },
      },
      basePath: '/forum'
    };
    const manager = new RelaksRouteManager(options);
    const result = await manager.change('/forum/story/5');
    expect(result).to.be.true;
    expect(manager.params.module).to.equal(module);
  })
})
