import { expect } from 'chai';
import RelaksRouteManager from '../index';

describe('#substitute()', function() {
    it ('should change the route without changing the location', function() {
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
                'error-page': {
                    path: '*',
                },
            },
        };
        var component = new RelaksRouteManager(options);
        return component.change('/story/5').then(() => {
            expect(component).to.have.property('url', '/story/5');
            expect(component).to.have.property('name', 'story-page');
            var params = { code: 404 };
            return component.substitute('error-page', params).then(() => {
                expect(component).to.have.property('url', '/story/5');
                expect(component).to.have.property('name', 'error-page');
                expect(component.params).to.deep.equal(params);
            });
        });
    })
    it ('should change the location when the substitute has a path', function() {
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
                'error-page': {
                    path: '/error/',
                },
            },
        };
        var component = new RelaksRouteManager(options);
        return component.change('/story/5').then(() => {
            expect(component).to.have.property('url', '/story/5');
            expect(component).to.have.property('name', 'story-page');
            return component.substitute('error-page').then(() => {
                expect(component).to.have.property('url', '/error/');
                expect(component).to.have.property('name', 'error-page');
            });
        });
    })
    it ('should not alert the history', function() {
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
                'error-page': {
                    path: '/error/',
                },
            },
        };
        var component = new RelaksRouteManager(options);
        return component.change('/story/5').then(() => {
            expect(component).to.have.property('url', '/story/5');
            expect(component).to.have.property('name', 'story-page');
            return component.substitute('error-page').then(() => {
                expect(component.history).to.have.length(1);
                expect(component.history[0]).to.have.property('name', 'story-page');
            });
        });
    })
    it ('should not trigger change event', function() {
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
                'error-page': {
                    path: '/error/',
                },
            },
        };
        var component = new RelaksRouteManager(options);
        var changeEventPromise = ManualPromise();
        return component.change('/story/5').then(() => {
            component.addEventListener('change', changeEventPromise.resolve);
            return component.substitute('error-page').then(() => {
                return changeEventPromise;
            }).then((evt) => {
                expect(evt).to.have.property('type', 'change');
            });
        });
    })
})
describe('#evt.substitute()', function() {
    it ('should substitute an not-yet-avaiable route with a substitute', function() {
        var options = {
            routes: {
                'welcome-page': {
                    path: '/welcome/',
                    public: true,
                },
                'news-page': {
                    path: '/news/',
                    params: { storyID: Number, reactionID: Number },
                    hash: [ 'S${storyID}', 'R${reactionID}' ],
                },
                'story-page': {
                    path: '/story/${id}',
                    params: { id: Number },
                },
                'login-page': {
                    public: true,
                },
            },
        };
        var component = new RelaksRouteManager(options);
        var authorizationPromise = ManualPromise();
        component.addEventListener('beforechange', (evt) => {
            if (!evt.route.public) {
                evt.postponeDefault(authorizationPromise);
                evt.substitute('login-page');
            }
        })
        return component.replace('welcome-page').then(() => {
            component.push('news-page');
            return TimeoutPromise(10);
        }).then(() => {
            expect(component).to.have.property('name', 'login-page');
            expect(component).to.have.property('url', '/news/');
        });
    })
    it ('should work properly when evt.postponeDefault() is given a callback instead of a promise', function() {
        var options = {
            routes: {
                'welcome-page': {
                    path: '/welcome/',
                    public: true,
                },
                'news-page': {
                    path: '/news/',
                    params: { storyID: Number, reactionID: Number },
                    hash: [ 'S${storyID}', 'R${reactionID}' ],
                },
                'story-page': {
                    path: '/story/${id}',
                    params: { id: Number },
                },
                'login-page': {
                    public: true,
                },
            },
        };
        var component = new RelaksRouteManager(options);
        var authorizationPromise = ManualPromise();
        var callbackInvoked = false;
        component.addEventListener('beforechange', (evt) => {
            if (!evt.route.public) {
                evt.postponeDefault(() => {
                    callbackInvoked = true;
                    return authorizationPromise;
                });
                evt.substitute('login-page');
            }
        })
        return component.replace('welcome-page').then(() => {
            component.push('news-page');
            return TimeoutPromise(10);
        }).then(() => {
            expect(component).to.have.property('name', 'login-page');
            expect(component).to.have.property('url', '/news/');
            expect(callbackInvoked).to.be.true;
        });
    })
    it ('should replace substitute with the intended page when the promise given to postponeDefault() fulfills', function() {
        var options = {
            routes: {
                'welcome-page': {
                    path: '/welcome/',
                    public: true,
                },
                'news-page': {
                    path: '/news/',
                    params: { storyID: Number, reactionID: Number },
                    hash: [ 'S${storyID}', 'R${reactionID}' ],
                },
                'story-page': {
                    path: '/story/${id}',
                    params: { id: Number },
                },
                'login-page': {
                    path: '/login/',
                    public: true,
                },
            },
        };
        var component = new RelaksRouteManager(options);
        var authorizationPromise = ManualPromise();
        component.addEventListener('beforechange', (evt) => {
            if (!evt.route.public) {
                evt.postponeDefault(authorizationPromise);
                evt.substitute('login-page');
            }
        })
        return component.replace('welcome-page').then(() => {
            setTimeout(authorizationPromise.resolve, 50);
            return component.push('news-page');
        }).then(() => {
            expect(component).to.have.property('name', 'news-page');
            expect(component).to.have.property('url', '/news/');
            expect(component.history).to.have.length(2);
            expect(component.history[1]).to.have.property('name', 'news-page');
        });
    })
    it ('should only change the history when user has moved pass the substitute', function() {
        var options = {
            routes: {
                'welcome-page': {
                    path: '/welcome/',
                    public: true,
                },
                'news-page': {
                    path: '/news/',
                    params: { storyID: Number, reactionID: Number },
                    hash: [ 'S${storyID}', 'R${reactionID}' ],
                },
                'story-page': {
                    path: '/story/${id}',
                    params: { id: Number },
                },
                'privacy-page': {
                    path: '/privacy/',
                    public: true,
                },
                'login-page': {
                    path: '/login/',
                    public: true,
                },
            },
        };
        var component = new RelaksRouteManager(options);
        var authorizationPromise = ManualPromise();
        var authorized = false;
        component.addEventListener('beforechange', (evt) => {
            if (!evt.route.public) {
                if (!authorized) {
                    evt.postponeDefault(authorizationPromise);
                    evt.substitute('login-page');
                }
            }
        })
        component.activate();
        return component.replace('welcome-page').then(() => {
            component.push('news-page');
            return TimeoutPromise(50);
        }).then(() => {
            expect(component).to.have.property('name', 'login-page');
            expect(component).to.have.property('url', '/login/');

            return component.push('privacy-page');
        }).then(() => {
            expect(component).to.have.property('name', 'privacy-page');
            expect(component).to.have.property('url', '/privacy/');
            authorized = true;
            authorizationPromise.resolve();
            return TimeoutPromise(50);
        }).then(() => {
            expect(component).to.have.property('name', 'privacy-page');
            expect(component).to.have.property('url', '/privacy/');
            expect(component.history).to.have.length(3);
            expect(component.history[1]).to.have.property('name', 'news-page');

            var changeEventPromise = ManualPromise();
            component.addEventListener('change', changeEventPromise.resolve);
            component.back();
            return changeEventPromise;
        }).then(() => {
            expect(component).to.have.property('name', 'news-page');
            expect(component.history).to.have.length(2);
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
