import { expect } from 'chai';
import RelaksRouteManager from '../index';

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
    it ('should fill hash with multiple parameters', function() {
        var options = {
            routes: {
                'news-page': {
                    path: '/news/',
                    params: { storyID: Number, reactionID: Number },
                    hash: [ 'S${storyID}', 'R${reactionID}' ],
                }
            },
        };
        var component = new RelaksRouteManager(options);
        var urlParts = component.fill('news-page', {
            storyID: 222,
            reactionID: 444,
        });
        expect(urlParts).to.have.property('path').that.equals('/news/');
        expect(urlParts).to.have.property('hash').that.equals('S222R444');
    })
    it ('should omit missing parameter from hash', function() {
        var options = {
            routes: {
                'news-page': {
                    path: '/news/',
                    params: { storyID: Number, reactionID: Number },
                    hash: [ 'S${storyID}', 'R${reactionID}' ],
                }
            },
        };
        var component = new RelaksRouteManager(options);
        var urlParts = component.fill('news-page', {
            reactionID: 444,
        });
        expect(urlParts).to.have.property('path').that.equals('/news/');
        expect(urlParts).to.have.property('hash').that.equals('R444');
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
