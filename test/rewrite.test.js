import { expect, default as Chai } from 'chai';
import { h } from 'preact'
import RelaksRouteManager from '../index';

/** @jsx h */

describe('#rewrite()', function() {
    it ('should rewrite the URL', function() {
        var r1 = {
            from: function(urlParts, context) {
                var re = /^\/(https?)\/(.*?)(\/|$)/;
                var m = re.exec(urlParts.path);
                if (m) {
                    context.protocol = m[1];
                    context.host = m[2];
                    urlParts.path = '/' + urlParts.path.substr(m[0].length);
                }
            }
        };
        var options = {
            routes: {},
            rewrites: [ r1 ]
        };
        var component = new RelaksRouteManager(options);
        var urlParts = {
            path: '/https/example.net/users',
            query: {},
            hash: ''
        };
        var context = {};
        component.rewrite('from', urlParts, context);
        expect(urlParts.path).to.equal('/users');
        expect(context.protocol).to.equal('https');
        expect(context.host).to.equal('example.net');
    })
    it ('should rewrite the URL from other direction', function() {
        var r1 = {
            to: function(urlParts, context) {
                if (context.protocol && context.host) {
                    urlParts.path = `/${context.protocol}/${context.host}${urlParts.path}`;
                }
            }
        };
        var options = {
            routes: {},
            rewrites: [ r1 ]
        };
        var component = new RelaksRouteManager(options);
        var urlParts = {
            path: '/users',
            query: {},
            hash: ''
        };
        var context = {
            protocol: 'https',
            host: 'example.net'
        };
        component.rewrite('to', urlParts, context);
        expect(urlParts.path).to.equal('/https/example.net/users');
    })
    it ('should stop rewriting when a function returns false', function() {
        var r1 = {
            from: function() {
                canceled = true;
                return false;
            }
        };
        var r2 = {
            from: function() {
                canceled = false;
            }
        };
        var canceled;
        var options = {
            routes: {},
            rewrites: [ r1, r2 ]
        };
        var component = new RelaksRouteManager(options);
        var urlParts = {
            path: '/users',
            query: {},
            hash: ''
        };
        var context = {};
        component.rewrite('from', urlParts, context);
        expect(canceled).to.be.true;
    })
    it ('should rewrite in inverse order when direction is "to"', function() {
        var r1 = {
            to: function(direction) {
                called.push(1);
            }
        };
        var r2 = {
            to: function(direction) {
                called.push(2);
            }
        };
        var called = [];
        var options = {
            routes: {},
            rewrites: [ r1, r2 ]
        };
        var component = new RelaksRouteManager(options);
        var urlParts = {
            path: '/users',
            query: {},
            hash: ''
        };
        var context = {};
        component.rewrite('to', urlParts, context);
        expect(called).to.deep.equal([ 2, 1 ]);
    })
})
