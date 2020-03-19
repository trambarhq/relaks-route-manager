import { expect } from 'chai';

import RelaksRouteManager from '../index.mjs';

describe('#find()', function() {
  it ('should generate a URL with query variables', function() {
    const options = {
      routes: {
        'search-page': {
          path: '/search',
          params: { keywords: WordList, max: Number },
          query: {
            q: '${keywords}',
            m: '${max}',
          }
        }
      },
    };
    const manager = new RelaksRouteManager(options);
    const url = manager.find('search-page', {
      keywords: [ 'cat', 'dog' ],
      max: 8
    });
    expect(url).to.equal('/search?q=cat%20dog&m=8');
  })
  it ('should ignore base path of /', function() {
    const options = {
      basePath: '/',
      routes: {
        'search-page': {
          path: '/search',
          params: { keywords: WordList, max: Number },
          query: {
            q: '${keywords}',
            m: '${max}',
          }
        }
      },
    };
    const manager = new RelaksRouteManager(options);
    const url = manager.find('search-page', {
      keywords: [ 'cat', 'dog' ],
      max: 8
    });
    expect(url).to.equal('/search?q=cat%20dog&m=8');
  })
  it ('should generate a URL with hash', function() {
    const options = {
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number },
          hash: 'S${storyID}',
        }
      },
    };
    const manager = new RelaksRouteManager(options);
    const url = manager.find('news-page', {
      storyID: 222,
    });
    expect(url).to.equal('/news/#S222');
  })
  it ('should prepend path with base path', function() {
    const options = {
      routes: {
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        }
      },
      basePath: '/forum'
    };
    const manager = new RelaksRouteManager(options);
    const url = manager.find('story-page', { id: 747 });
    expect(url).to.equal('/forum/story/747');
  })
  it ('should produce a hash-only URL when fallback is used', function() {
    const options = {
      useHashFallback: true,
      routes: {
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        }
      },
    };
    const manager = new RelaksRouteManager(options);
    const url = manager.find('story-page', { id: 787 });
    expect(url).to.equal('#/story/787');
  })
  it ('should apply context created by rewrite from call to change()', async function() {
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
    const url = manager.find('story-page', { id: 747 });
    expect(url).to.equal('/https/example.net/story/747');
  })
  it ('should prepend base path before rewrite occurs', async function() {
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
      rewrites: [ r1 ],
      basePath: '/forum'
    };
    const manager = new RelaksRouteManager(options);
    await manager.change('/forum/https/example.net/story/5');
    const url = manager.find('story-page', { id: 747 });
    expect(url).to.equal('/forum/https/example.net/story/747');
  })
  it ('should throw where there is no route by that name', function() {
    const options = {
      routes: {
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        }
      },
    };
    const manager = new RelaksRouteManager(options);
    try {
      const url = manager.find('stroy-page', { id: 747 });
      expect.fail();
    } catch (err) {
      expect(err).to.have.property('status', 500);
    }
  })
  it ('should generate a URL for a route with custom path matching', function() {
    const options = {
      routes: {
        'special-page': {
          path: {
            to: (params) => {
              return `/special/${params.path}`;
            }
          },
        },
      }
    };
    const manager = new RelaksRouteManager(options);
    const url = manager.find('special-page', { path: 'something/nice/' });
    expect(url).to.equal('/special/something/nice/');
  })
  it ('should return undefined when a route has a wildcard path', function() {
    const options = {
      routes: {
        'catch-all-page': {
          path: '*',
        },
      }
    };
    const manager = new RelaksRouteManager(options);
    const url = manager.find('catch-all-page', {});
    expect(url).to.equal(undefined);
  })
  it ('should return undefined when a route does have a path', function() {
    const options = {
      routes: {
        'path-less-page': {
        },
      }
    };
    const manager = new RelaksRouteManager(options);
    const url = manager.find('path-less-page', {});
    expect(url).to.equal(undefined);
  })
})

const WordList = {
  from: function(value) {
    return value.split(/\s+/g);
  },
  to: function(list) {
    if (list instanceof Array) {
      return list.join(' ');
    } else {
      return '';
    }
  }
};
