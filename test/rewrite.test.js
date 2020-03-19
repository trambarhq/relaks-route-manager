import { expect } from 'chai';

import RelaksRouteManager from '../index.mjs';

describe('#rewrite()', function() {
  it ('should rewrite the URL', function() {
    const r1 = {
      from: function(urlParts, context) {
        const re = /^\/(https?)\/(.*?)(\/|$)/;
        const m = re.exec(urlParts.path);
        if (m) {
          context.protocol = m[1];
          context.host = m[2];
          urlParts.path = '/' + urlParts.path.substr(m[0].length);
        }
      }
    };
    const options = {
      routes: {},
      rewrites: [ r1 ]
    };
    const manager = new RelaksRouteManager(options);
    const urlParts = {
      path: '/https/example.net/users',
      query: {},
      hash: ''
    };
    const context = {};
    manager.rewrite('from', urlParts, context);
    expect(urlParts.path).to.equal('/users');
    expect(context.protocol).to.equal('https');
    expect(context.host).to.equal('example.net');
  })
  it ('should rewrite the URL from other direction', function() {
    const r1 = {
      to: function(urlParts, context) {
        if (context.protocol && context.host) {
          urlParts.path = `/${context.protocol}/${context.host}${urlParts.path}`;
        }
      }
    };
    const options = {
      routes: {},
      rewrites: [ r1 ]
    };
    const manager = new RelaksRouteManager(options);
    const urlParts = {
      path: '/users',
      query: {},
      hash: ''
    };
    const context = {
      protocol: 'https',
      host: 'example.net'
    };
    manager.rewrite('to', urlParts, context);
    expect(urlParts.path).to.equal('/https/example.net/users');
  })
  it ('should stop rewriting when a function returns false', function() {
    let canceled;
    const r1 = {
      from: function() {
        canceled = true;
        return false;
      }
    };
    const r2 = {
      from: function() {
        canceled = false;
      }
    };
    const options = {
      routes: {},
      rewrites: [ r1, r2 ]
    };
    const manager = new RelaksRouteManager(options);
    const urlParts = {
      path: '/users',
      query: {},
      hash: ''
    };
    const context = {};
    manager.rewrite('from', urlParts, context);
    expect(canceled).to.be.true;
  })
  it ('should rewrite in inverse order when direction is "to"', function() {
    const r1 = {
      to: function(direction) {
        called.push(1);
      }
    };
    const r2 = {
      to: function(direction) {
        called.push(2);
      }
    };
    const called = [];
    const options = {
      routes: {},
      rewrites: [ r1, r2 ]
    };
    const manager = new RelaksRouteManager(options);
    const urlParts = {
      path: '/users',
      query: {},
      hash: ''
    };
    const context = {};
    manager.rewrite('to', urlParts, context);
    expect(called).to.deep.equal([ 2, 1 ]);
  })
})
