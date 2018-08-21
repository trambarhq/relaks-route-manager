import Promise from 'bluebird';
import { expect, default as Chai } from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import PreactRenderSpy from 'preact-render-spy';
import { h } from 'preact'
import RelaksRouteManager from '../preact';

Chai.use(ChaiAsPromised);

/** @jsx h */

describe('Preact test', function() {
    describe('#rebase()', function() {
        it ('should remove base path from path', function() {
            var props = {
                routes: {},
                basePath: '/hello'
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = {
                path: '/hello/world',
                query: {},
                hash: ''
            };
            var result = component.rebase('from', urlParts);
            expect(result).to.be.true;
            expect(urlParts.path).to.equal('/world');
        })
        it ('should set the path to / when it match the base path exactly', function() {
            var props = {
                routes: {},
                basePath: '/hello'
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = {
                path: '/hello',
                query: {},
                hash: ''
            };
            var result = component.rebase('from', urlParts);
            expect(result).to.be.true;
            expect(urlParts.path).to.equal('/');
        })
        it ('should return false and leave the path alone when there is no match', function() {
            var props = {
                routes: {},
                basePath: '/hello'
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = {
                path: '/hamburger/cheesy',
                query: {},
                hash: ''
            };
            var result = component.rebase('from', urlParts);
            expect(result).to.be.false;
            expect(urlParts.path).to.equal('/hamburger/cheesy');
        })
        it ('should not match half a name', function() {
            var props = {
                routes: {},
                basePath: '/hello'
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = {
                path: '/hello world/whatever',
                query: {},
                hash: ''
            };
            var result = component.rebase('from', urlParts);
            expect(result).to.be.false;
            expect(urlParts.path).to.equal('/hello world/whatever');
        })
        it ('should prepend path with base path', function() {
            var props = {
                routes: {},
                basePath: '/hello'
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = {
                path: '/world',
                query: {},
                hash: ''
            };
            var result = component.rebase('to', urlParts);
            expect(result).to.be.true;
            expect(urlParts.path).to.equal('/hello/world');
        })
    })
    describe('#rewrite()', function() {
        it ('should rewrite the URL', function() {
            var r1 = {
                from: function(urlParts, context) {
                    var re = /^\/(https?)\/(.*?)(\/|$)/;
                    var m = re.exec(urlParts.path);
                    if (m) {
                        context.protocol = m[1];
                        context.host = m[2];
                        urlParts.path = '/' + urlParts.path.substr(m[0].length);
                    }
                }
            };
            var props = {
                routes: {},
                rewrites: [ r1 ]
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = {
                path: '/https/example.net/users',
                query: {},
                hash: ''
            };
            var context = {};
            component.rewrite('from', urlParts, context);
            expect(urlParts.path).to.equal('/users');
            expect(context.protocol).to.equal('https');
            expect(context.host).to.equal('example.net');
        })
        it ('should rewrite the URL from other direction', function() {
            var r1 = {
                to: function(urlParts, context) {
                    if (context.protocol && context.host) {
                        urlParts.path = `/${context.protocol}/${context.host}${urlParts.path}`;
                    }
                }
            };
            var props = {
                routes: {},
                rewrites: [ r1 ]
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = {
                path: '/users',
                query: {},
                hash: ''
            };
            var context = {
                protocol: 'https',
                host: 'example.net'
            };
            component.rewrite('to', urlParts, context);
            expect(urlParts.path).to.equal('/https/example.net/users');
        })
        it ('should stop rewriting when a function returns false', function() {
            var r1 = {
                from: function() {
                    canceled = true;
                    return false;
                }
            };
            var r2 = {
                from: function() {
                    canceled = false;
                }
            };
            var canceled;
            var props = {
                routes: {},
                rewrites: [ r1, r2 ]
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = {
                path: '/users',
                query: {},
                hash: ''
            };
            var context = {};
            component.rewrite('from', urlParts, context);
            expect(canceled).to.be.true;
        })
        it ('should rewrite in inverse order when direction is "to"', function() {
            var r1 = {
                to: function(direction) {
                    called.push(1);
                }
            };
            var r2 = {
                to: function(direction) {
                    called.push(2);
                }
            };
            var called = [];
            var props = {
                routes: {},
                rewrites: [ r1, r2 ]
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = {
                path: '/users',
                query: {},
                hash: ''
            };
            var context = {};
            component.rewrite('to', urlParts, context);
            expect(called).to.deep.equal([ 2, 1 ]);
        })
    })
    describe('#match', function() {
        it ('should find a matching route', function() {
            var props = {
                routes: {
                    'profile-page': {
                        path: '/profile/',
                    }
                },
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var match = component.match('/profile/');
            expect(match).to.have.property('name').that.equals('profile-page');
        })
        it ('should match a URL with missing trailing slash', function() {
            var props = {
                routes: {
                    'profile-page': {
                        path: '/profile/',
                    }
                },
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var match = component.match('/profile');
            expect(match).to.have.property('name').that.equals('profile-page');
        })
        it ('should correct cast a parameter to number', function() {
            var props = {
                routes: {
                    'story-page': {
                        path: '/story/${id}',
                        params: { id: Number },
                    }
                },
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var match = component.match('/story/123');
            expect(match).to.have.property('name').that.equals('story-page');
            expect(match.params).to.have.property('id').to.be.a('number').that.equals(123);
        })
        it ('should call function to convert parameter', function() {
            var props = {
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
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var match = component.match('/search?q=hello+world&m=5');
            expect(match).to.have.property('name').that.equals('search-page');
            expect(match.params).to.have.property('keywords').to.deep.equal(['hello', 'world']);
            expect(match.params).to.have.property('max').to.equal(5);
        })
        it ('should skip missing query variable', function() {
            var props = {
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
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var match = component.match('/search?q=hello+world');
            expect(match).to.have.property('name').that.equals('search-page');
            expect(match.params).to.have.property('keywords').to.deep.equal(['hello', 'world']);
            expect(match.params).to.not.have.property('max');
        })
        it ('should find parameter in URL hash', function() {
            var props = {
                routes: {
                    'news-page': {
                        path: '/news/',
                        params: { storyID: Number },
                        hash: 'S${storyID}'
                    }
                },
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var match = component.match('/news/#S1234');
            expect(match).to.have.property('name').that.equals('news-page');
            expect(match.params).to.have.property('storyID').that.equals(1234);
        })
        it ('should extract two parameters from URL hash', function() {
            var props = {
                routes: {
                    'news-page': {
                        path: '/news/',
                        params: { storyID: Number, reactionID: Number },
                        hash: [ 'S${storyID}', 'R${reactionID}' ],
                    }
                },
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var match = component.match('/news/#S1234R333');
            expect(match).to.have.property('name').that.equals('news-page');
            expect(match.params).to.have.property('storyID').that.equals(1234);
            expect(match.params).to.have.property('reactionID').that.equals(333);
        })
    })
    describe('#change()', function() {
        it ('should change the route', function() {
            var props = {
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
                    'search-page': {
                        path: '/search',
                        params: { keywords: WordList, max: Number },
                        query: {
                            q: '${keywords}',
                            m: '${max}',
                        }
                    }
                },
                basePath: '/forum'
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            return component.change('/forum/story/5').then(() => {
                expect(component.state.url).to.equal('/forum/story/5');
                expect(component.state.name).to.equal('story-page');
                expect(component.state.params).to.deep.equal({ id: 5 });
                expect(location.pathname).to.equal('/forum/story/5');
            });
        })
        it ('should change location.hash when fallback is used', function() {
            var props = {
                useHashFallback: true,
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
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            return component.change('/story/9').then(() => {
                expect(location.hash).to.equal('#/story/9');
            });
        })
        it ('should acquire context from rewrite', function() {
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
            var props = {
                routes: {
                    'story-page': {
                        path: '/story/${id}',
                        params: { id: Number },
                    }
                },
                rewrites: [ r1 ]
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            return component.change('/https/example.net/story/5').then(() => {
                expect(component.state.context).to.deep.equal({
                    protocol: 'https',
                    host: 'example.net'
                });
            });
        })
        it ('should fail when no route matches', function() {
            var props = {
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
                    'search-page': {
                        path: '/search',
                        params: { keywords: WordList, max: Number },
                        query: {
                            q: '${keywords}',
                            m: '${max}',
                        }
                    }
                },
                basePath: '/forum'
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            return expect(component.change('/forum/nowhere')).to.eventually.be.rejected;
        })
        it ('should fail when URL does not contain base path', function() {
            var props = {
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
                    'search-page': {
                        path: '/search',
                        params: { keywords: WordList, max: Number },
                        query: {
                            q: '${keywords}',
                            m: '${max}',
                        }
                    }
                },
                basePath: '/forum'
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            return expect(component.change('/blog/story/5')).to.eventually.be.rejected;
        })
    })
    describe('#fill()', function() {
        it ('should fill path template with parameters', function() {
            var props = {
                routes: {
                    'story-page': {
                        path: '/story/${id}',
                        params: { id: Number },
                    }
                },
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = component.fill('story-page', { id: 747 });
            expect(urlParts).to.have.property('path').that.equals('/story/747');
        })
        it ('should fill query templates with parameters', function() {
            var props = {
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
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
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
            var props = {
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
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = component.fill('search-page', {
                keywords: [ 'cat', 'dog' ],
            });
            expect(urlParts).to.have.property('path').that.equals('/search');
            expect(urlParts).to.have.property('query').that.deep.equals({
                q: 'cat dog',
            });
        })
        it ('should fill hash with multiple parameters', function() {
            var props = {
                routes: {
                    'news-page': {
                        path: '/news/',
                        params: { storyID: Number, reactionID: Number },
                        hash: [ 'S${storyID}', 'R${reactionID}' ],
                    }
                },
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = component.fill('news-page', {
                storyID: 222,
                reactionID: 444,
            });
            expect(urlParts).to.have.property('path').that.equals('/news/');
            expect(urlParts).to.have.property('hash').that.equals('S222R444');
        })
        it ('should omit missing parameter from hash', function() {
            var props = {
                routes: {
                    'news-page': {
                        path: '/news/',
                        params: { storyID: Number, reactionID: Number },
                        hash: [ 'S${storyID}', 'R${reactionID}' ],
                    }
                },
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = component.fill('news-page', {
                reactionID: 444,
            });
            expect(urlParts).to.have.property('path').that.equals('/news/');
            expect(urlParts).to.have.property('hash').that.equals('R444');
        })
    })
    describe('#find()', function() {
        it ('should generate a URL with query variables', function() {
            var props = {
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
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var url = component.find('search-page', {
                keywords: [ 'cat', 'dog' ],
                max: 8
            });
            expect(url).to.equal('/search?q=cat%20dog&m=8');
        })
        it ('should generate a URL with hash', function() {
            var props = {
                routes: {
                    'news-page': {
                        path: '/news/',
                        params: { storyID: Number, reactionID: Number },
                        hash: [ 'S${storyID}', 'R${reactionID}' ],
                    }
                },
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var url = component.find('news-page', {
                storyID: 222,
                reactionID: 444,
            });
            expect(url).to.equal('/news/#S222R444');
        })
        it ('should prepend path with base path', function() {
            var props = {
                routes: {
                    'story-page': {
                        path: '/story/${id}',
                        params: { id: Number },
                    }
                },
                basePath: '/forum'
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var url = component.find('story-page', { id: 747 });
            expect(url).to.equal('/forum/story/747');
        })
        it ('should produce a hash-only URL when fallback is used', function() {
            var props = {
                useHashFallback: true,
                routes: {
                    'story-page': {
                        path: '/story/${id}',
                        params: { id: Number },
                    }
                },
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
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
            var props = {
                routes: {
                    'story-page': {
                        path: '/story/${id}',
                        params: { id: Number },
                    }
                },
                rewrites: [ r1 ]
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
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
            var props = {
                routes: {
                    'story-page': {
                        path: '/story/${id}',
                        params: { id: Number },
                    }
                },
                rewrites: [ r1 ],
                basePath: '/forum'
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            return component.change('/https/example.net/forum/story/5').then(() => {
                var url = component.find('story-page', { id: 747 });
                expect(url).to.equal('/https/example.net/forum/story/747');
            });
        })
        it ('should throw where there is no route by that name', function() {
            var props = {
                routes: {
                    'story-page': {
                        path: '/story/${id}',
                        params: { id: Number },
                    }
                },
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            expect(() => {
                var url = component.find('stroy-page', { id: 747 });
            }).to.throw();
        })
    })
    describe('#back()', function() {
        it ('should return to previous route', function() {
            var props = {
                routes: {
                    'story-page': {
                        path: '/story/${id}',
                        params: { id: Number },
                    }
                },
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            return component.change('/story/5').then(() => {
                return component.change('/story/7').then(() => {
                    return component.back().then(() => {
                        expect(location.pathname).to.equal('/story/5');
                    });
                });
            });
        })

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
