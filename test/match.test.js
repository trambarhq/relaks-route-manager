import { expect } from 'chai';

import RelaksRouteManager from '../index.mjs';

describe('#match()', function() {
  it ('should find a matching route', function() {
    const options = {
      routes: {
        'profile-page': {
          path: '/profile/',
        }
      },
    };
    const manager = new RelaksRouteManager(options);
    const match = manager.match('/profile/');
    expect(match).to.have.property('name').that.equals('profile-page');
  })
  it ('should ignore base path of /', function() {
    const options = {
      basePath: '/',
      routes: {
        'profile-page': {
          path: '/profile/',
        }
      },
    };
    const manager = new RelaksRouteManager(options);
    const match = manager.match('/profile/');
    expect(match).to.have.property('name').that.equals('profile-page');
  })
  it ('should match a URL with missing trailing slash', function() {
    const options = {
      routes: {
        'profile-page': {
          path: '/profile/',
        }
      },
    };
    const manager = new RelaksRouteManager(options);
    const match = manager.match('/profile');
    expect(match).to.have.property('name').that.equals('profile-page');
  })
  it ('should correct cast a parameter to number', function() {
    const options = {
      routes: {
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        }
      },
    };
    const manager = new RelaksRouteManager(options);
    const match = manager.match('/story/123');
    expect(match).to.have.property('name').that.equals('story-page');
    expect(match.params).to.have.property('id').to.be.a('number').that.equals(123);
  })
  it ('should call function to convert parameter', function() {
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
    const match = manager.match('/search?q=hello+world&m=5');
    expect(match).to.have.property('name').that.equals('search-page');
    expect(match.params).to.have.property('keywords').to.deep.equal(['hello', 'world']);
    expect(match.params).to.have.property('max').to.equal(5);
  })
  it ('should skip missing query constiable', function() {
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
    const match = manager.match('/search?q=hello+world');
    expect(match).to.have.property('name').that.equals('search-page');
    expect(match.params).to.have.property('keywords').to.deep.equal(['hello', 'world']);
    expect(match.params).to.not.have.property('max');
  })
  it ('should find parameter in URL hash', function() {
    const options = {
      routes: {
        'news-page': {
          path: '/news/',
          params: { storyID: Number },
          hash: 'S${storyID}'
        }
      },
    };
    const manager = new RelaksRouteManager(options);
    const match = manager.match('/news/#S1234');
    expect(match).to.have.property('name').that.equals('news-page');
    expect(match.params).to.have.property('storyID').that.equals(1234);
  })
  it ('should match "*" to any path', function() {
    const options = {
      routes: {
        'profile-page': {
          path: '/profile/',
        },
        'error-page': {
          path: '*',
        },
      },
    };
    const manager = new RelaksRouteManager(options);
    const match = manager.match('/nowhere/');
    expect(match).to.have.property('name').that.equals('error-page');
  })
  it ('should capture empty string', function() {
    const options = {
      routes: {
        'search-page': {
          path: '/search/',
          query: {
            q: '${search}'
          },
          params: { search: String },
        },
      }
    };
    const manager = new RelaksRouteManager(options);
    const match = manager.match('/search/?q=');
    expect(match.params).to.have.property('search');
  })
  it ('should capture empty string as NaN when param is number', function() {
    const options = {
      routes: {
        'search-page': {
          path: '/search/',
          query: {
            m: '${max}'
          },
          params: { search: String, max: Number },
        },
      }
    };
    const manager = new RelaksRouteManager(options);
    const match = manager.match('/search/?m=');
    expect(match.params).to.have.property('max').that.is.NaN;
  })
  it ('should match a route with custom path matching', function() {
    const options = {
      routes: {
        'special-page': {
          path: {
            from: (path, params) => {
              const m = /\/special\/(.*)/.exec(path);
              if (m) {
                params.path = m[1];
                return true;
              }
            }
          },
        },
      }
    };
    const manager = new RelaksRouteManager(options);
    const match = manager.match('/special/something/nice/');
    expect(match.name).to.equal('special-page');
    expect(match.params).to.have.property('path', 'something/nice/');
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
