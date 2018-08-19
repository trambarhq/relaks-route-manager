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
})
