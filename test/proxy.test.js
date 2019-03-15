import Chai, { expect } from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import RelaksRouteManager from '../index';
import RelaksRouteManagerProxy from '../proxy';

Chai.use(ChaiAsPromised);

describe('RelaksRouteManagerProxy', function() {
    it ('should copy properties from the route manager', function() {
        var options = {
            useHashFallback: true,
            routes: {
                'news-page': {
                    path: '/news/',
                    params: { storyID: Number },
                    hash: 'S${storyID}',
                },
                'story-page': {
                    path: '/story/${id}/',
                    params: { id: Number, paragraph: Number, language: String },
                    query: {
                        lang: '${language}'
                    },
                    hash: 'P${paragraph}',
                },
            },
            basePath: '/forum'
        };
        var url = '/forum/story/7?lang=en#P4';
        location.hash = '#' + url;
        var component = new RelaksRouteManager(options);
        var proxy;
        component.addEventListener('change', (evt) => {
            proxy = new RelaksRouteManagerProxy(component);
        });
        return component.start().then(() => {
            expect(proxy).to.have.property('url', url);
            expect(proxy).to.have.property('name', 'story-page');
            expect(proxy).to.have.property('params').that.eql({ id: 7, paragraph: 4, language: 'en' });
            expect(proxy).to.have.property('path', '/story/7');
            expect(proxy).to.have.property('query').that.eql({ lang: 'en' });
            expect(proxy).to.have.property('search').that.eql('?lang=en');
            expect(proxy).to.have.property('hash', 'P4');
        });
    })
})
