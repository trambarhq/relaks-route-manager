import { expect } from 'chai';

import RelaksRouteManager from '../index.mjs';

describe('#back()', function() {
  it ('should return to previous route', async function() {
    const options = {
      routes: {
        'home': {
          path: '/',
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        }
      },
    };
    const manager = new RelaksRouteManager(options);
    history.pushState({}, '', '/');
    // need to run activate() here, since that attaches the popState handler
    manager.activate();
    await manager.change('/story/5');
    await manager.change('/story/7');
    await manager.back();
    expect(location.pathname).to.equal('/story/5');
  })
  it ('should reject when there is no previous page to return to', async function() {
    const options = {
      trackLinks: false,
      trackLocation: false,
      initialPath: '/',
      routes: {
        'home': {
          path: '/',
        },
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        }
      },
    };
    const manager = new RelaksRouteManager(options);
    // need to run activate() here, since that attaches the popState handler
    manager.activate();
    try {
      await manager.back();
      expect.fail();
    } catch (err) {
      expect(err).to.have.property('status', 400);
    }
  })
})
