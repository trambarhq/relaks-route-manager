import Chai, { expect } from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import RelaksRouteManager from '../index';

Chai.use(ChaiAsPromised);

describe('#change()', function() {
    it ('should change the route', function() {
        var options = {
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
            },
            basePath: '/forum'
        };
        var component = new RelaksRouteManager(options);
        return component.change('/forum/story/5').then((result) => {
            expect(result).to.be.true;
            expect(component.url).to.equal('/forum/story/5');
            expect(component.name).to.equal('story-page');
            expect(component.params).to.deep.equal({ id: 5 });
            expect(location.pathname).to.equal('/forum/story/5');
        });
    })
    it ('should change location.hash when fallback is used', function() {
        var options = {
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
            },
        };
        var component = new RelaksRouteManager(options);
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
            expect(component.context).to.deep.equal({
                protocol: 'https',
                host: 'example.net'
            });
        });
    })
    it ('should fail when no route matches', function() {
        var options = {
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
            },
            basePath: '/forum'
        };
        var component = new RelaksRouteManager(options);
        return expect(component.change('/forum/nowhere'))
            .to.eventually.be.rejectedWith(Error)
            .that.has.property('status', 404);
    })
    it ('should fail when URL does not contain base path', function() {
        var options = {
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
            },
            basePath: '/forum'
        };
        var component = new RelaksRouteManager(options);
        return expect(component.change('/blog/story/5'))
            .to.eventually.be.rejectedWith(Error)
            .that.has.property('status', 404);
    })
    it ('should emit a beforechange and change event', function() {
        var options = {
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
            },
            basePath: '/forum'
        };
        var component = new RelaksRouteManager(options);
        var beforeChangeEventPromise = ManualPromise();
        var changeEventPromise = ManualPromise();
        component.addEventListener('beforechange', beforeChangeEventPromise.resolve);
        component.addEventListener('change', changeEventPromise.resolve);
        return component.change('/forum/story/5').then(() => {
            return expect(beforeChangeEventPromise).to.eventually.be.fulfilled;
        }).then(() => {
            return expect(changeEventPromise).to.eventually.be.fulfilled;
        });
    })
    it ('should not proceed with route change if preventDefault() is called during beforechange event', function() {
        var options = {
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
            },
            basePath: '/forum'
        };
        var component = new RelaksRouteManager(options);
        return component.change('/forum/story/5').then(() => {
            component.addEventListener('beforechange', (evt) => {
                evt.preventDefault();
            });
            return component.change('/forum/story/5555').then((result) => {
                expect(result).to.be.false;
                expect(component.url).to.equal('/forum/story/5');
            });
        });
    })
    it ('should not proceed with route change if postponeDefault() is called and the promise given resolves to false', function() {
        var options = {
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
            },
            basePath: '/forum'
        };
        var component = new RelaksRouteManager(options);
        return component.change('/forum/story/5').then(() => {
            component.addEventListener('beforechange', (evt) => {
                var promise = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve(false);
                    }, 50);
                });
                evt.postponeDefault(promise);
            });
            return component.change('/forum/story/5555').then((result) => {
                expect(result).to.be.false;
                expect(component.url).to.equal('/forum/story/5');
            });
        });
    })
    it ('should not ignore multiple changes that have piled up due to postponeDefault()', function() {
        var options = {
            routes: {
                'news-page': {
                    path: '/news/',
                    params: { storyID: Number, reactionID: Number },
                    hash: [ 'S${storyID}', 'R${reactionID}' ],
                    public: false,
                },
                'story-page': {
                    path: '/story/${id}',
                    params: { id: Number },
                    public: false,
                },
                'welcome-page': {
                    path: '/welcome',
                    public: true,
                }
            },
        };

        var component = new RelaksRouteManager(options);
        var authorizationPromise = ManualPromise();
        var authorized = false;
        var changeCount = 0;
        component.addEventListener('beforechange', (evt) => {
            if (!evt.route.public) {
                if (!authorized) {
                    evt.postponeDefault(authorizationPromise);
                }
            }
        });
        component.addEventListener('change', (evt) => {
            changeCount++;
        });

        return component.change('/welcome').then(() => {
            for (var i = 1; i <= 5; i++) {
                setTimeout(() => {
                    component.change('/story/' + i);
                }, i * 25);
            }
            setTimeout(() => {
                component.change('/news/');
            }, i * 25 + 75);
            setTimeout(authorizationPromise.resolve, i * 25 + 200);
            return authorizationPromise;
        }).then(() => {
            return TimeoutPromise(100);
        }).then(() => {
            expect(component.history).to.have.length(2);
            expect(changeCount).to.equal(2);
        });
    })
    it ('should accept an anchor element as input', function() {
        var options = {
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
            },
            basePath: '/forum'
        };
        var anchor = document.createElement('A');
        anchor.href = '/forum/story/5';
        var component = new RelaksRouteManager(options);
        return component.change(anchor).then((result) => {
            expect(result).to.be.true;
            expect(component.url).to.equal('/forum/story/5');
            expect(component.name).to.equal('story-page');
            expect(component.params).to.deep.equal({ id: 5 });
            expect(location.pathname).to.equal('/forum/story/5');
        });
    })
    it ('should accept an anchor element with URL in hash', function() {
        var options = {
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
            },
            basePath: '/forum'
        };
        var anchor = document.createElement('A');
        anchor.href = '#/forum/story/5';
        var component = new RelaksRouteManager(options);
        return component.change(anchor).then((result) => {
            expect(result).to.be.true;
            expect(component.url).to.equal('/forum/story/5');
            expect(component.name).to.equal('story-page');
            expect(component.params).to.deep.equal({ id: 5 });
            expect(location.pathname).to.equal('/forum/story/5');
        });
    })
    it ('should fail when anchor points to URL with different protocol', function() {
        var options = {
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
                'welcome-page': {
                    path: '/',
                },
            },
            basePath: '/forum'
        };
        var anchor = document.createElement('A');
        anchor.href = `https://${location.host}/forum/story/5`;
        var component = new RelaksRouteManager(options);
        return expect(component.change(anchor))
            .to.eventually.be.rejectedWith(Error)
            .that.has.property('status', 400);
    })
    it ('should fail when anchor points to URL with different protocol', function() {
        var options = {
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
                'welcome-page': {
                    path: '/',
                },
            },
            basePath: '/forum'
        };
        var anchor = document.createElement('A');
        anchor.href = `http://nowhere/forum/story/5`;
        var component = new RelaksRouteManager(options);
        return expect(component.change(anchor))
            .to.eventually.be.rejectedWith(Error)
            .that.has.property('status', 400);
    })
    it ('should fail when anchor points to URL with different path', function() {
        var options = {
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
                'welcome-page': {
                    path: '/',
                },
            },
            basePath: '/forum'
        };
        var anchor = document.createElement('A');
        anchor.href = `http://${location.host}/xyz#/forum/story/5`;
        var component = new RelaksRouteManager(options);
        return expect(component.change(anchor))
            .to.eventually.be.rejectedWith(Error)
            .that.has.property('status', 400);
    })
    it ('should fail when anchor points to URL with different query string', function() {
        var options = {
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
                'welcome-page': {
                    path: '/',
                },
            },
            basePath: '/forum'
        };
        var anchor = document.createElement('A');
        anchor.href = `http://${location.host}/${location.pathname}?xyz=123#/forum/story/5`;
        var component = new RelaksRouteManager(options);
        return expect(component.change(anchor))
            .to.eventually.be.rejectedWith(Error)
            .that.has.property('status', 400);
    })
})

function ManualPromise() {
    var resolveFunc, rejectFunc;
    var promise = new Promise((resolve, reject) => {
        resolveFunc = resolve;
        rejectFunc = reject;
    });
    promise.resolve = resolveFunc;
    promise.reject = rejectFunc;
    return promise;
}

function TimeoutPromise(ms) {
    var promise = ManualPromise();
    setTimeout(promise.resolve, ms);
    return promise;
}
