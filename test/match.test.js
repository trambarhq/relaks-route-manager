import { expect } from 'chai';
import RelaksRouteManager from '../index';

describe('#match', function() {
    it ('should find a matching route', function() {
        var options = {
            routes: {
                'profile-page': {
                    path: '/profile/',
                }
            },
        };
        var component = new RelaksRouteManager(options);
        var match = component.match('/profile/');
        expect(match).to.have.property('name').that.equals('profile-page');
    })
    it ('should match a URL with missing trailing slash', function() {
        var options = {
            routes: {
                'profile-page': {
                    path: '/profile/',
                }
            },
        };
        var component = new RelaksRouteManager(options);
        var match = component.match('/profile');
        expect(match).to.have.property('name').that.equals('profile-page');
    })
    it ('should correct cast a parameter to number', function() {
        var options = {
            routes: {
                'story-page': {
                    path: '/story/${id}',
                    params: { id: Number },
                }
            },
        };
        var component = new RelaksRouteManager(options);
        var match = component.match('/story/123');
        expect(match).to.have.property('name').that.equals('story-page');
        expect(match.params).to.have.property('id').to.be.a('number').that.equals(123);
    })
    it ('should call function to convert parameter', function() {
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
        var match = component.match('/search?q=hello+world&m=5');
        expect(match).to.have.property('name').that.equals('search-page');
        expect(match.params).to.have.property('keywords').to.deep.equal(['hello', 'world']);
        expect(match.params).to.have.property('max').to.equal(5);
    })
    it ('should skip missing query variable', function() {
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
        var match = component.match('/search?q=hello+world');
        expect(match).to.have.property('name').that.equals('search-page');
        expect(match.params).to.have.property('keywords').to.deep.equal(['hello', 'world']);
        expect(match.params).to.not.have.property('max');
    })
    it ('should find parameter in URL hash', function() {
        var options = {
            routes: {
                'news-page': {
                    path: '/news/',
                    params: { storyID: Number },
                    hash: 'S${storyID}'
                }
            },
        };
        var component = new RelaksRouteManager(options);
        var match = component.match('/news/#S1234');
        expect(match).to.have.property('name').that.equals('news-page');
        expect(match.params).to.have.property('storyID').that.equals(1234);
    })
    it ('should extract two parameters from URL hash', function() {
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
        var match = component.match('/news/#S1234R333');
        expect(match).to.have.property('name').that.equals('news-page');
        expect(match.params).to.have.property('storyID').that.equals(1234);
        expect(match.params).to.have.property('reactionID').that.equals(333);
    })
    it ('should match "*" to any path', function() {
        var options = {
            routes: {
                'profile-page': {
                    path: '/profile/',
                },
                'error-page': {
                    path: '*',
                },
            },
        };
        var component = new RelaksRouteManager(options);
        var match = component.match('/nowhere/');
        expect(match).to.have.property('name').that.equals('error-page');
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
