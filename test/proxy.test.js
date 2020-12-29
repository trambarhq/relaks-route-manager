import { expect } from 'chai';
import { delay } from './lib/utils.js';

import { RelaksRouteManager, RelaksRouteManagerProxy } from '../index.mjs';

describe('RelaksRouteManagerProxy', function() {
  it ('should copy properties from the route manager', async function() {
    const options = {
      useHashFallback: true,
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number },
          hash: 'S${storyID}',
          component: {},
        },
        'story-page': {
          path: '/story/${id}/',
          params: { id: Number, paragraph: Number, language: String },
          query: {
            lang: '${language}'
          },
          hash: 'P${paragraph}',
          component: {},
        },
      },
      basePath: '/forum'
    };
    const url = '/forum/story/7?lang=en#P4';
    location.hash = '#' + url;
    const manager = new RelaksRouteManager(options);
    let proxy;
    manager.addEventListener('change', (evt) => {
      proxy = new RelaksRouteManagerProxy(manager);
    });
    await manager.start();
    expect(proxy).to.have.property('url', url);
    expect(proxy).to.have.property('name', 'story-page');
    expect(proxy).to.have.property('params').that.eql({ id: 7, paragraph: 4, language: 'en' });
    expect(proxy).to.have.property('path', '/story/7');
    expect(proxy).to.have.property('query').that.eql({ lang: 'en' });
    expect(proxy).to.have.property('search').that.eql('?lang=en');
    expect(proxy).to.have.property('hash', 'P4');
    expect(proxy).to.have.property('component').that.is.an('object');
  })
})
