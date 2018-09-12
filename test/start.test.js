import Chai, { expect } from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import RelaksRouteManager from '../index';

Chai.use(ChaiAsPromised);

describe('#start()', function() {
    it ('should load the initial route', function() {
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
        location.hash = '#/forum/news/';
        var component = new RelaksRouteManager(options);
        return component.start().then(() => {
            expect(component.name).to.equal('news-page');
        });
    })
    it ('should use the specified URL', function() {
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
        location.hash = '#/random/';
        var component = new RelaksRouteManager(options);
        return component.start('/forum/news/').then(() => {
            expect(component.name).to.equal('news-page');
            expect(location.hash).to.equal('#/forum/news/');
        });
    })
    it ('should fail when no URL is specified and tracking is off', function() {
        var options = {
            trackLocation: false,
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
        return expect(component.start())
            .to.eventually.be.rejectedWith(Error)
            .that.has.property('status', 400);
    })
    it ('should not stall if substitute() is called in handler of beforechange', function() {
        var options = {
            useHashFallback: true,
            routes: {
                'news-page': {
                    path: '/news/',
                    params: { storyID: Number, reactionID: Number },
                    hash: [ 'S${storyID}', 'R${reactionID}' ],
                    public: false,
                },
                'login-page': {
                    public: true,
                },
            },
        };
        location.hash = '#/news/';
        var component = new RelaksRouteManager(options);
        var authorizationPromise = ManualPromise();
        component.addEventListener('beforechange', (evt) => {
            if (evt.route.public !== true) {
                evt.postponeDefault(authorizationPromise);
                evt.substitute('login-page');
            }
        });
        return component.start().then(() => {
            expect(component).to.have.property('name', 'login-page');
            expect(location).to.have.property('hash', '#/news/');
        });
    })
    it ('should go to the initial page once promise passed to postponeDefault() fulfills', function() {
        var options = {
            useHashFallback: true,
            routes: {
                'news-page': {
                    path: '/news/',
                    params: { storyID: Number, reactionID: Number },
                    hash: [ 'S${storyID}', 'R${reactionID}' ],
                    public: false,
                },
                'welcome-page': {
                    path: '/welcome/',
                    public: true,
                },
            },
        };
        location.hash = '#/news/';
        var component = new RelaksRouteManager(options);
        var authorizationPromise = ManualPromise();
        component.addEventListener('beforechange', (evt) => {
            if (evt.route.public !== true) {
                evt.postponeDefault(authorizationPromise);
                evt.substitute('welcome-page');
            }
        });
        return component.start().then(() => {
            expect(component).to.have.property('name', 'welcome-page');

            return TimeoutPromise(50);
        }).then(() => {
            authorizationPromise.resolve(true);
            return TimeoutPromise(50);
        }).then(() => {
            expect(component).to.have.property('name', 'news-page');
            expect(location).to.have.property('hash', '#/news/');
        });
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
