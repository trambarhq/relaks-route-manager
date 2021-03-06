import { expect } from 'chai';
import RelaksRouteManager from '../index.mjs';

describe('#fill()', function() {
  it ('should fill path template with parameters', function() {
    var options = {
      routes: {
        'story-page': {
          path: '/story/${id}',
          params: { id: Number },
        }
      },
    };
    var component = new RelaksRouteManager(options);
    var urlParts = component.fill('story-page', { id: 747 });
    expect(urlParts).to.have.property('path').that.equals('/story/747');
  })
  it ('should fill query templates with parameters', function() {
    var options = {
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
    var component = new RelaksRouteManager(options);
    var urlParts = component.fill('search-page', {
      keywords: [ 'cat', 'dog' ],
      max: 8
    });
    expect(urlParts).to.have.property('path').that.equals('/search');
    expect(urlParts).to.have.property('query').that.deep.equals({
      q: 'cat dog',
      m: '8'
    });
  })
  it ('should omit missing variable', function() {
    var options = {
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
    var component = new RelaksRouteManager(options);
    var urlParts = component.fill('search-page', {
      keywords: [ 'cat', 'dog' ],
    });
    expect(urlParts).to.have.property('path').that.equals('/search');
    expect(urlParts).to.have.property('query').that.deep.equals({
      q: 'cat dog',
    });
  })
  it ('should place empty string in query', function() {
    var options = {
      routes: {
        'search-page': {
          path: '/search',
          params: { search: String, max: Number },
          query: {
            q: '${search}',
            m: '${max}',
          }
        }
      },
    };
    var component = new RelaksRouteManager(options);
    var urlParts = component.fill('search-page', {
      search: '',
      max: 8
    });
    expect(urlParts).to.have.property('path').that.equals('/search');
    expect(urlParts).to.have.property('query').that.deep.equals({
      q: '',
      m: '8'
    });
  })
  it ('should place empty string in query when number is NaN', function() {
    var options = {
      routes: {
        'search-page': {
          path: '/search',
          params: { search: String, max: Number },
          query: {
            q: '${search}',
            m: '${max}',
          }
        }
      },
    };
    var component = new RelaksRouteManager(options);
    var urlParts = component.fill('search-page', {
      search: '',
      max: NaN
    });
    expect(urlParts).to.have.property('path').that.equals('/search');
    expect(urlParts).to.have.property('query').that.deep.equals({
      q: '',
      m: ''
    });
  })

})

var WordList = {
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
