import { expect } from 'chai';
import { delay, promiseSelf } from './lib/utils.js';

import RelaksRouteManager from '../index.mjs';

describe('#substitute()', function() {
  it ('should change the route without changing the location', async function() {
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
        'error-page': {
          path: '*',
        },
      },
    };
    const manager = new RelaksRouteManager(options);
    await manager.change('/story/5');
    expect(manager).to.have.property('url', '/story/5');
    expect(manager).to.have.property('name', 'story-page');
    const params = { code: 404 };
    await manager.substitute('error-page', params);
    expect(manager).to.have.property('url', '/story/5');
    expect(manager).to.have.property('name', 'error-page');
    expect(manager.params).to.deep.equal(params);
  })
  it ('should change the location when the substitute has a path', async function() {
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
        'error-page': {
          path: '/error/',
        },
      },
    };
    const manager = new RelaksRouteManager(options);
    await manager.change('/story/5');
    expect(manager).to.have.property('url', '/story/5');
    expect(manager).to.have.property('name', 'story-page');
    await manager.substitute('error-page');
    expect(manager).to.have.property('url', '/error/');
    expect(manager).to.have.property('name', 'error-page');
  })
  it ('should not alert the history', async function() {
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
        'error-page': {
          path: '/error/',
        },
      },
    };
    const manager = new RelaksRouteManager(options);
    await manager.change('/story/5');
    expect(manager).to.have.property('url', '/story/5');
    expect(manager).to.have.property('name', 'story-page');
    await manager.substitute('error-page');
    expect(manager.history).to.have.length(1);
    expect(manager.history[0]).to.have.property('name', 'story-page');
  })
  it ('should not trigger change event', async function() {
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
        'error-page': {
          path: '/error/',
        },
      },
    };
    const manager = new RelaksRouteManager(options);
    const changeEventPromise = promiseSelf();
    await manager.change('/story/5');
    manager.addEventListener('change', changeEventPromise.resolve);
    await manager.substitute('error-page');
    const evt = await changeEventPromise;
    expect(evt).to.have.property('type', 'change');
  })
})
describe('#evt.substitute()', function() {
  it ('should substitute an not-yet-avaiable route with a substitute', async function() {
    const options = {
      routes: {
        'welcome-page': {
          path: '/welcome/',
          public: true,
        },
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
        'login-page': {
          public: true,
        },
      },
    };
    const manager = new RelaksRouteManager(options);
    const authorizationPromise = promiseSelf();
    manager.addEventListener('beforechange', (evt) => {
      if (!evt.route.public) {
        evt.postponeDefault(authorizationPromise);
        evt.substitute('login-page');
      }
    });
    await manager.replace('welcome-page');
    manager.push('news-page');
    await delay(10);
    expect(manager).to.have.property('name', 'login-page');
    expect(manager).to.have.property('url', '/news/');
  })
  it ('should work properly when evt.postponeDefault() is given a callback instead of a promise', async function() {
    const options = {
      routes: {
        'welcome-page': {
          path: '/welcome/',
          public: true,
        },
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
        'login-page': {
          public: true,
        },
      },
    };
    const manager = new RelaksRouteManager(options);
    const authorizationPromise = promiseSelf();
    let callbackInvoked = false;
    manager.addEventListener('beforechange', (evt) => {
      if (!evt.route.public) {
        evt.postponeDefault(() => {
          callbackInvoked = true;
          return authorizationPromise;
        });
        evt.substitute('login-page');
      }
    });
    await manager.replace('welcome-page');
    manager.push('news-page');
    await delay(10);
    expect(manager).to.have.property('name', 'login-page');
    expect(manager).to.have.property('url', '/news/');
    expect(callbackInvoked).to.be.true;
  })
  it ('should replace substitute with the intended page when the promise given to postponeDefault() fulfills', async function() {
    const options = {
      routes: {
        'welcome-page': {
          path: '/welcome/',
          public: true,
        },
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
        'login-page': {
          path: '/login/',
          public: true,
        },
      },
    };
    const manager = new RelaksRouteManager(options);
    const authorizationPromise = promiseSelf();
    manager.addEventListener('beforechange', (evt) => {
      if (!evt.route.public) {
        evt.postponeDefault(authorizationPromise);
        evt.substitute('login-page');
      }
    });
    await manager.replace('welcome-page');
    setTimeout(authorizationPromise.resolve, 50);
    await manager.push('news-page');
    expect(manager).to.have.property('name', 'news-page');
    expect(manager).to.have.property('url', '/news/');
    expect(manager.history).to.have.length(2);
    expect(manager.history[1]).to.have.property('name', 'news-page');
  })
  it ('should only change the history when user has moved pass the substitute', async function() {
    const options = {
      routes: {
        'welcome-page': {
          path: '/welcome/',
          public: true,
        },
        'news-page': {
          path: '/news/',
          params: { storyID: Number, reactionID: Number },
          hash: [ 'S${storyID}', 'R${reactionID}' ],
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        },
        'privacy-page': {
          path: '/privacy/',
          public: true,
        },
        'login-page': {
          path: '/login/',
          public: true,
        },
      },
    };
    const manager = new RelaksRouteManager(options);
    const authorizationPromise = promiseSelf();
    let authorized = false;
    manager.addEventListener('beforechange', (evt) => {
      if (!evt.route.public) {
        if (!authorized) {
          evt.postponeDefault(authorizationPromise);
          evt.substitute('login-page');
        }
      }
    });
    manager.activate();
    await manager.replace('welcome-page');
    manager.push('news-page');
    await delay(50);
    expect(manager).to.have.property('name', 'login-page');
    expect(manager).to.have.property('url', '/login/');
    await manager.push('privacy-page');
    expect(manager).to.have.property('name', 'privacy-page');
    expect(manager).to.have.property('url', '/privacy/');
    authorized = true;
    authorizationPromise.resolve();
    await delay(50);
    expect(manager).to.have.property('name', 'privacy-page');
    expect(manager).to.have.property('url', '/privacy/');
    expect(manager.history).to.have.length(3);
    expect(manager.history[1]).to.have.property('name', 'news-page');
    const changeEventPromise = promiseSelf();
    manager.addEventListener('change', changeEventPromise.resolve);
    manager.back();
    await changeEventPromise;
    expect(manager).to.have.property('name', 'news-page');
    expect(manager.history).to.have.length(2);
  })
})
