import { expect } from 'chai';
import RelaksRouteManager from '../index';

describe('#force()', function() {
    it ('should change the route without changing the URL', function() {
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
            basePath: '/forum'
        };
        var component = new RelaksRouteManager(options);
        return component.change('/forum/story/5').then(() => {
            expect(component.url).to.equal('/forum/story/5');
            expect(component.name).to.equal('story-page');
            return component.force('error-page').then(() => {
                expect(component.url).to.equal('/forum/story/5');
                expect(component.name).to.equal('error-page');
            });
        });
    })
})
