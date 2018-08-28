import { expect } from 'chai';
import RelaksRouteManager from '../index';

describe('#find()', function() {
    it ('should generate a URL with query variables', function() {
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
        var url = component.find('search-page', {
            keywords: [ 'cat', 'dog' ],
            max: 8
        });
        expect(url).to.equal('/search?q=cat%20dog&m=8');
    })
    it ('should generate a URL with hash', function() {
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
        var url = component.find('news-page', {
            storyID: 222,
            reactionID: 444,
        });
        expect(url).to.equal('/news/#S222R444');
    })
    it ('should prepend path with base path', function() {
        var options = {
            routes: {
                'story-page': {
                    path: '/story/${id}',
                    params: { id: Number },
                }
            },
            basePath: '/forum'
        };
        var component = new RelaksRouteManager(options);
        var url = component.find('story-page', { id: 747 });
        expect(url).to.equal('/forum/story/747');
    })
    it ('should produce a hash-only URL when fallback is used', function() {
        var options = {
            useHashFallback: true,
            routes: {
                'story-page': {
                    path: '/story/${id}',
                    params: { id: Number },
                }
            },
        };
        var component = new RelaksRouteManager(options);
        var url = component.find('story-page', { id: 787 });
        expect(url).to.equal('#/story/787');
    })
    it ('should apply context created by rewrite from call to change()', function() {
        var r1 = {
            from: function(urlParts, context) {
                var re = /^\/(https?)\/(.*?)(\/|$)/;
                var m = re.exec(urlParts.path);
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
        var options = {
            routes: {
                'story-page': {
                    path: '/story/${id}',
                    params: { id: Number },
                }
            },
            rewrites: [ r1 ]
        };
        var component = new RelaksRouteManager(options);
        return component.change('/https/example.net/story/5').then(() => {
            var url = component.find('story-page', { id: 747 });
            expect(url).to.equal('/https/example.net/story/747');
        });
    })
    it ('should prepend base path before rewrite occurs', function() {
        var r1 = {
            from: function(urlParts, context) {
                var re = /^\/(https?)\/(.*?)(\/|$)/;
                var m = re.exec(urlParts.path);
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
        var options = {
            routes: {
                'story-page': {
                    path: '/story/${id}',
                    params: { id: Number },
                }
            },
            rewrites: [ r1 ],
            basePath: '/forum'
        };
        var component = new RelaksRouteManager(options);
        return component.change('/https/example.net/forum/story/5').then(() => {
            var url = component.find('story-page', { id: 747 });
            expect(url).to.equal('/https/example.net/forum/story/747');
        });
    })
    it ('should throw where there is no route by that name', function() {
        var options = {
            routes: {
                'story-page': {
                    path: '/story/${id}',
                    params: { id: Number },
                }
            },
        };
        var component = new RelaksRouteManager(options);
        expect(() => {
            var url = component.find('stroy-page', { id: 747 });
        }).to.throw(Error).that.has.property('status', 500);
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
