## Relaks Route Manager

Relaks Route Manager is a simple, flexible route manager designed for React
applications that uses [Relaks](https://github.com/chung-leong/relaks). It
monitors the browser's current location using the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) and extract
parameters from the URL. You can then vary the contents displayed by your app
based on these parameters. In addition, it can also trap clicks on hyperlinks,
automatically handling page requests internally.

The library has a promise-based asynchronous interface. It's specifically
designed with WebPack code-splitting in mind. It's also designed to be used in
isomorphic React apps.

* [Installation](#installation)
* [Usage](#usage)
* [Options](#options)
* [Routing table](#routing-table)
* [Rewrite rules](#rewrite-rules)
* [Methods](#methods)
* [Events](#events)
* [Examples](#examples)

### Installation

```sh
npm --save-dev install relaks-route-manager
```

### Usage

```javascript
import RouteManager from 'relaks-route-manager';

let options = {
    useHashFallback: true,
    trackLocation: true,
    trackLinks: true,
    preloadingDelay: 2000,
    routes: routingTable,
    rewrites: rewriteRules,
    basePath: '',
};
let routeManager = new RouteManager(options);
routeManager.addEventListener('change', handleRouteChange);

```

### Options

#### useHashFallback

Place the URL of the app's current route in the hash portion of the browser
location instead of changing the actual path. When `useHashFallback` is false,
the location might look like the following:

`https://example.com/news/`

When it's true, the location will like this:

`https://example.com/#/news/`

Hash fallback is useful when you're unable to add necessary rewrite rules the
web server in order to enable client-side path changes. It's the only way to
use this library when your app is running as a local file (in Cordova or
Electron, for example).

Default value: `false`

#### trackLocation

Track changes of the current location caused by the visitor pressing the
browser's back or forward button.

Default value: `true` when the window object is present (i.e. in a web-browser);
`false` otherwise (e.g. in Node.js).

#### trackLinks

Intercept click events emitted by hyperlinks (A elements). Links with the
attribute `target` or `download` are ignored.

Default value: `true` when the window object is present (i.e. in a web-browser);
`false` otherwise (e.g. in Node.js).

#### preloadingDelay

Amount of time (in milliseconds) to wait before initiating page preloading.
Relevant only for apps that employ code-splitting. When specified, the route
manager will call `load()` of every route after the delay.

Default value: `NaN` (no preploading of pages)

#### routes

A hash table (i.e. an object) containing your app's routes. See [routing table](#routing-table).

#### rewrites

An array containing rewrite functions that modify a URL prior to matching it
against the routing table. See [rewrite rules](#rewrite-rules).

#### basePath

When specified, create a rewrite rule that strips the base path from the URL
prior to matching and adds in the base path when a URL is requested through
`find()`.

### Routing table

```javascript
let routes = {
    'welcome': {
        path: '/',
        load: async (params) => {
            params.module = await import('pages/welcome-page' /* webpackChunkName: "welcome-page" */);
        }
    },
    'film-list': {
        path: '/films/',
        load: async (params) => {
            params.module = await import('pages/film-list' /* webpackChunkName: "film-list" */);
        }
    },
    'film-summary': {
        path: '/films/${id}/',
        params: { id: Number },
        load: async (params) => {
            params.module = await import('pages/film-page' /* webpackChunkName: "film-page" */);
        }
    },
    /* ... */
};
```

### Rewrite rules

### Methods

#### addEventListener

```javascript
/**
 * @param  {String} type
 * @param  {Function} handler
 * @param  {Boolean|undefined} beginning
 */
addEventListener(type, handler, beginning)
```
Add an event listener to the route manager. ```handler``` will be called
whenever events of ```type``` occur. When ```beginning``` is true, the listener
will be place before any existing listeners. Otherwise it's added at the end of
the list.

Inherited from [relaks-event-emitter](https://github.com/chung-leong/relaks-event-emitter).

#### removeEventListener

```javascript
/**
 * @param  {String} type
 * @param  {Function} handler
 */
removeEventListener(type, handler)
```
Remove an event listener from the route manager. ```handler``` and ```type```
must match what was given to [addEventListener](#addeventlistener)().

Inherited from [relaks-event-emitter](https://github.com/chung-leong/relaks-event-emitter).

#### start

```javascript
/**
 * @param  {String|undefined} url
 *
 * @return {Promise<Boolean>}
 */
start(url)
```

#### push

```javascript
/**
 * @param  {String} name
 * @param  {Object} params
 * @param  {Object|undefined} newContext
 *
 * @return {Promise}
 */
push(name, params, newContext)
```

#### replace

```javascript
/**
 * @param  {String} name
 * @param  {Object} params
 * @param  {Object|undefined} newContext
 *
 * @return {Promise}
 */
replace(name, params, newContext)
```

#### change

```javascript
/**
 * @param  {String} url
 * @param  {Object|undefined} options
 *
 * @return {Promise<Boolean>}
 */
change(url, options)
```

#### find

```javascript
/**
 * @param  {String} name
 * @param  {Object} params
 * @param  {Object|undefined} newContext
 *
 * @return {String|undefined}
 */
find(name, params, newContext)
```

#### back

```javascript
/**
 * @return {Promise}
 */
back()
```

#### match

```javascript
/**
 * Match a URL with a route
 *
 * @param  {String} url
 *
 * @return {Object|null}
 */
match(url)
```

#### substitute

```javascript
/**
 * @param  {String} name
 * @param  {Object} params
 *
 * @return {Promise<Boolean>}
 */
substitute(name, params)
```

#### restore

```javascript
/**
 * @return {Promise<Boolean>}
 */
restore()
```

#### preload

```javascript
/**
 * @return  {Promise}
 */
preload()
```

### Events

#### beforechange

#### change

### Examples
