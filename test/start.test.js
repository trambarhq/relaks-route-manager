import { expect } from 'chai';
import { delay, promiseSelf } from './lib/utils.js';

import RelaksRouteManager from '../index.mjs';

describe('#start()', function() {
  it ('should load the initial route', async function() {
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
    location.hash = '#/forum/news/';
    const manager = new RelaksRouteManager(options);
    await manager.start();
    expect(manager.name).to.equal('news-page');
  })
  it ('should use the specified URL', async function() {
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
    location.hash = '#/random/';
    const manager = new RelaksRouteManager(options);
    await manager.start('/forum/news/');
    expect(manager.name).to.equal('news-page');
    expect(location.hash).to.equal('#/forum/news/');
  })
  it ('should fail when no URL is specified and tracking is off', async function() {
    const options = {
      trackLocation: false,
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
      await manager.start();
      expect.fail();
    } catch (err) {
      expect(err).to.have.property('status', 400);
    }
  })
  it ('should not stall if substitute() is called in handler of beforechange', async function() {
    const options = {
      useHashFallback: true,
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
          public: false,
        },
        'login-page': {
          public: true,
        },
      },
    };
    location.hash = '#/news/';
    const manager = new RelaksRouteManager(options);
    const authorizationPromise = promiseSelf();
    manager.addEventListener('beforechange', (evt) => {
      if (evt.route.public !== true) {
        evt.postponeDefault(authorizationPromise);
        evt.substitute('login-page');
      }
    });
    await manager.start();
    expect(manager).to.have.property('name', 'login-page');
    expect(location).to.have.property('hash', '#/news/');
  })
  it ('should go to the initial page once promise passed to postponeDefault() fulfills', async function() {
    const options = {
      useHashFallback: true,
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
          public: false,
        },
        'welcome-page': {
          path: '/welcome/',
          public: true,
        },
      },
    };
    location.hash = '#/news/';
    const manager = new RelaksRouteManager(options);
    const authorizationPromise = promiseSelf();
    manager.addEventListener('beforechange', (evt) => {
      if (evt.route.public !== true) {
        evt.postponeDefault(authorizationPromise);
        evt.substitute('welcome-page');
      }
    });
    await manager.start();
    expect(manager).to.have.property('name', 'welcome-page');
    await delay(50);
    authorizationPromise.resolve(true);
    await delay(50);
    expect(manager).to.have.property('name', 'news-page');
    expect(location).to.have.property('hash', '#/news/');
  })
})
