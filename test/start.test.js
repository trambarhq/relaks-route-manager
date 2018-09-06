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
            trackingLocation: false,
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
            .that.has.property('status', 404);
    })
})
