import { expect } from 'chai';
import RelaksRouteManager from '../index.mjs';

describe('#preload()', function() {
  it ('should call load methods of every route', function() {
    var called = {};
    var options = {
      routes: {
        'page-1': {
          load: (match) => {
            called['page-1'] = true;
            match.params.module = null;
          }
        },
        'page-2': {
          load: (match) => {
            called['page-2'] = true;
          }
        },
        'page-3': {
          load: (match) => {
            called['page-3'] = true;
          }
        },
      },
      preloadingDelay: 200
    };
    var component = new RelaksRouteManager(options);
    component.activate();
    expect(called).to.eql({});
    return TimeoutPromise(300).then(() => {
      expect(called).to.eql({
        'page-1': true,
        'page-2': true,
        'page-3': true,
      });
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
