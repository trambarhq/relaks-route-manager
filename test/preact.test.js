import Promise from 'bluebird';
import { expect } from 'chai';
import PreactRenderSpy from 'preact-render-spy';
import { h } from 'preact'
import RelaksRouteManager from '../index';

/** @jsx h */

describe('Preact test', function() {
    describe('#rebase()', function() {
        it ('should remove base path from path', function() {
            var props = {
                routes: {},
                basePath: '/hello'
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = {
                path: '/hello/world',
                query: {},
                hash: ''
            };
            component.rebase('from', urlParts);
            expect(urlParts.path).to.equal('/world');
        })
        it ('should set the path to / when it match the base path exactly', function() {
            var props = {
                routes: {},
                basePath: '/hello'
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = {
                path: '/hello',
                query: {},
                hash: ''
            };
            component.rebase('from', urlParts);
            expect(urlParts.path).to.equal('/');
        })
        it ('should leave the path alone when there is no match', function() {
            var props = {
                routes: {},
                basePath: '/hello'
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = {
                path: '/hamburger/cheesy',
                query: {},
                hash: ''
            };
            component.rebase('from', urlParts);
            expect(urlParts.path).to.equal('/hamburger/cheesy');
        })
        it ('should not match half a name', function() {
            var props = {
                routes: {},
                basePath: '/hello'
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = {
                path: '/hello world/whatever',
                query: {},
                hash: ''
            };
            component.rebase('from', urlParts);
            expect(urlParts.path).to.equal('/hello world/whatever');
        })
        it ('should prepend path with base path', function() {
            var props = {
                routes: {},
                basePath: '/hello'
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
            var urlParts = {
                path: '/world',
                query: {},
                hash: ''
            };
            component.rebase('to', urlParts);
            expect(urlParts.path).to.equal('/hello/world');
        })
    })
    describe('#rewrite()', function() {
        it ('should rewrite the URL', function() {
            var f1 = function(direction, urlParts, context) {
                if (direction === 'from') {
                    var re = /^\/(https?)\/(.*?)(\/|$)/;
                    var m = re.exec(urlParts.path);
                    if (m) {
                        context.protocol = m[1];
                        context.host = m[2];
                        urlParts.path = '/' + urlParts.path.substr(m[0].length);
                    }
                }
            };
            var props = {
                routes: {},
                rewrites: [ f1 ]
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
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
            var f1 = function(direction, urlParts, context) {
                if (direction === 'to') {
                    if (context.protocol && context.host) {
                        urlParts.path = `/${context.protocol}/${context.host}${urlParts.path}`;
                    }
                }
            };
            var props = {
                routes: {},
                rewrites: [ f1 ]
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
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
            var f1 = function() {
                canceled = true;
                return false;
            };
            var f2 = function() {
                canceled = false;
            };
            var canceled;
            var props = {
                routes: {},
                rewrites: [ f1, f2 ]
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
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
            var f1 = function(direction) {
                if (direction === 'to') {
                    called.push(1);
                }
            };
            var f2 = function(direction) {
                if (direction === 'to') {
                    called.push(2);
                }
            };
            var called = [];
            var props = {
                routes: {},
                rewrites: [ f1, f2 ]
            };
            var wrapper = PreactRenderSpy.deep(<RelaksRouteManager {...props} />);
            var component = wrapper.component();
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
})
