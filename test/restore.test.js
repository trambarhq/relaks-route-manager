import { expect } from 'chai';

import RelaksRouteManager from '../index.mjs';

describe('#restore()', function() {
  it ('should restore a route that was substituted', async function() {
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
    await manager.restore();
    expect(manager).to.have.property('url', '/story/5');
    expect(manager).to.have.property('name', 'story-page');
  })
})
