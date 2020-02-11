import { expect } from 'chai';
import RelaksRouteManager from '../index.mjs';

describe('#restore()', function() {
  it ('should restore a route that was substituted', function() {
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
      return component.substitute('error-page');
    }).then(() => {
      expect(component).to.have.property('url', '/error/');
      expect(component).to.have.property('name', 'error-page');
      return component.restore();
    }).then(() => {
      expect(component).to.have.property('url', '/story/5');
      expect(component).to.have.property('name', 'story-page');
    });
  })
})
