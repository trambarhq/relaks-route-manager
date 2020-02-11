import Chai, { expect } from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import RelaksRouteManager from '../index.mjs';

Chai.use(ChaiAsPromised);

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
    // need to run activate() here, since that attaches the popState handler
    component.activate();
    return component.change('/story/5').then(() => {
      return component.change('/story/7').then(() => {
        return component.back().then(() => {
          expect(location.pathname).to.equal('/story/5');
        });
      });
    });
  })
  it ('should reject when there is no previous page to return to', function() {
    var options = {
      trackLinks: false,
      trackLocation: false,
      initialPath: '/',
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
    // need to run activate() here, since that attaches the popState handler
    component.activate();
    return expect(component.back())
      .to.eventually.be.rejectedWith(Error)
      .that.has.property('status', 400);
  })
})
