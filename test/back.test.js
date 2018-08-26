import { expect } from 'chai';
import RelaksRouteManager from '../index';

describe('#back()', function() {
    it ('should return to previous route', function() {
        var options = {
            routes: {
                'home': {
                    path: '/',
                },
                'story-page': {
                    path: '/story/${id}',
                    params: { id: Number },
                }
            },
        };
        var component = new RelaksRouteManager(options);
        history.pushState({}, '', '/');
        // need to run initialize() here, since that attaches the popState handler
        return component.initialize().then(() => {
            return component.change('/story/5').then(() => {
                return component.change('/story/7').then(() => {
                    return component.back().then(() => {
                        expect(location.pathname).to.equal('/story/5');
                    });
                });
            });
        });
    })
})
