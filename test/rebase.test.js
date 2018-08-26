import { expect, default as Chai } from 'chai';
import { h } from 'preact'
import RelaksRouteManager from '../index';

/** @jsx h */

describe('#rebase()', function() {
    it ('should remove base path from path', function() {
        var options = {
            routes: {},
            basePath: '/hello'
        };
        var component = new RelaksRouteManager(options);
        var urlParts = {
            path: '/hello/world',
            query: {},
            hash: ''
        };
        var result = component.rebase('from', urlParts);
        expect(result).to.be.true;
        expect(urlParts.path).to.equal('/world');
    })
    it ('should set the path to / when it match the base path exactly', function() {
        var options = {
            routes: {},
            basePath: '/hello'
        };
        var component = new RelaksRouteManager(options);
        var urlParts = {
            path: '/hello',
            query: {},
            hash: ''
        };
        var result = component.rebase('from', urlParts);
        expect(result).to.be.true;
        expect(urlParts.path).to.equal('/');
    })
    it ('should return false and leave the path alone when there is no match', function() {
        var options = {
            routes: {},
            basePath: '/hello'
        };
        var component = new RelaksRouteManager(options);
        var urlParts = {
            path: '/hamburger/cheesy',
            query: {},
            hash: ''
        };
        var result = component.rebase('from', urlParts);
        expect(result).to.be.false;
        expect(urlParts.path).to.equal('/hamburger/cheesy');
    })
    it ('should not match half a name', function() {
        var options = {
            routes: {},
            basePath: '/hello'
        };
        var component = new RelaksRouteManager(options);
        var urlParts = {
            path: '/hello world/whatever',
            query: {},
            hash: ''
        };
        var result = component.rebase('from', urlParts);
        expect(result).to.be.false;
        expect(urlParts.path).to.equal('/hello world/whatever');
    })
    it ('should prepend path with base path', function() {
        var options = {
            routes: {},
            basePath: '/hello'
        };
        var component = new RelaksRouteManager(options);
        var urlParts = {
            path: '/world',
            query: {},
            hash: ''
        };
        var result = component.rebase('to', urlParts);
        expect(result).to.be.true;
        expect(urlParts.path).to.equal('/hello/world');
    })
})
