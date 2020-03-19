import { expect } from 'chai';
import { delay } from './lib/utils.js';

import RelaksRouteManager from '../index.mjs';

describe('#preload()', function() {
  it ('should call load methods of every route', async function() {
    const called = {};
    const options = {
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
    const manager = new RelaksRouteManager(options);
    manager.activate();
    expect(called).to.eql({});
    await delay(300);
    expect(called).to.eql({
      'page-1': true,
      'page-2': true,
      'page-3': true,
    });
  })
})
