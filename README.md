Relaks Route Manager
--------------------
Relaks Route Manager is a simple, flexible route manager designed for React applications that uses [Relaks](https://github.com/chung-leong/relaks). It monitors the browser's current location using the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) and extract parameters from the URL. You can then vary the contents displayed by your app based on these parameters. In addition, it can also trap clicks on hyperlinks, automatically handling page requests internally.

The library has a promise-based asynchronous interface. It's specifically designed with WebPack code-splitting in mind. It's also designed to be used in isomorphic React apps.

* [Installation](#installation)
* [Usage](#usage)
* [Options](#options)
* [Routing table](#routing-table)
* [Rewrite rules](#rewrite-rules)
* [Methods](#methods)
* [Events](#events)
* [Examples](#examples)

## Installation

```sh
npm --save-dev install relaks-route-manager
```

## Usage

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

## Options

### useHashFallback

Place the URL of the app's current route in the hash portion of the browser location instead of changing the actual path. When `useHashFallback` is false, the location might look like the following:

`https://example.com/news/`

When it's true, the location will like this:

`https://example.com/#/news/`

Hash fallback is useful when you're unable to add necessary rewrite rules the web server in order to enable client-side path changes. It's the only way to use this library when your app is running as a local file (in Cordova or Electron, for example).

Default value: `false`

### trackLocation

Track changes of the current location caused by the visitor pressing the browser's back or forward button.

Default value: `true` when the window object is present (i.e. in a web-browser); `false` otherwise (e.g. in Node.js).

### trackLinks

Intercept click events emitted by hyperlinks (A elements). Links with the attribute `target` or `download` are ignored.

Default value: `true` when the window object is present (i.e. in a web-browser); `false` otherwise (e.g. in Node.js).

### preloadingDelay

Amount of time (in milliseconds) to wait before initiating page preloading. Relevant only for apps that employ code-splitting. When specified, the route manager will call `load()` of every route after the delay.

Default value: `NaN` (no preploading of pages)

### routes

A hash table (i.e. an object) containing your app's routes. See [routing table](#routing-table).

### rewrites

An array containing rewrite functions that modify a URL prior to matching it against the routing table. See [rewrite rules](#rewrite-rules).

### basePath

When specified, create a rewrite rule that strips the base path from the URL prior to matching and adds in the base path when a URL is requested through `find()`.

## Routing table

```javascript
let routes = {
    'welcome': {
        path: '/',
        load: async () => {
            params.module = await import('pages/welcome-page' /* webpackChunkName: "welcome-page" */);
        }
    },
    'film-list': {
        path: '/films/',
        load: async () => {
            params.module = await import('pages/film-list' /* webpackChunkName: "film-list" */);
        }
    },
    'film-summary': {
        path: '/films/${id}/',
        params: { id: Number },
        load: async () => {
            params.module = await import('pages/film-page' /* webpackChunkName: "film-page" */);
        }
    },
    /* ... */
};
```

## Rewrite rules

A rewrite rule is an object containing two functions: `from()` and `to()`. The route manager invokes `from()` before it tries to match a URL to a route. It invokes `to()` when it forms a URL (i.e. when `find()` is called). Both functions receives `urlParts` and `context` as arguments

## Methods

* [addEventListener](#addeventlistener)
* [removeEventListener](#removeeventlistener)

* [start](#start)
* [push](#push)
* [replace](#replace)
* [change](#change)
* [find](#find)
* [back](#back)
* [match](#match)
* [preload](#preload)

### addEventListener

```typescript
function addEventListener(name: string, handler: function, beginning?:boolean): void
```

Add an event listener to the route manager. `handler` will be called whenever events of `type` occur. When `beginning` is true, the listener will be place before any existing listeners. Otherwise it's added at the end of the list.

Inherited from [relaks-event-emitter](https://github.com/chung-leong/relaks-event-emitter).

### removeEventListener

```typescript
function removeEventListener(name: string, handler: function): void
```

Remove an event listener from the route manager. `handler` and `type` must match what was given to `addEventListener()`.

Inherited from [relaks-event-emitter](https://github.com/chung-leong/relaks-event-emitter).

### start

```typescript
async function start(url?: string): boolean
```

Start the route manager, using `url` for the initial route. If `url` is omitted and [trackLocation](#trackLocation) is `true`, the URL will be obtained from the browser's `location` object.

The promise returned by this method is fulfilled when a `change` event occurs. This can happen either because the intended route is reached or if `evt.postponeDefault()` and `evt.substitute()` are used during a `beforechange` event.

### push

```typescript
async function push(name: string, params?: object, newContext?: object): boolean
```

Change the route, saving the previous route in browsing history. `name` is the name of desired page (i.e. a key in the routing table), while `params` are the route parameters.

If `newContext` is supplied, it'll be merged with the existing rewrite context and becomes the new context. Otherwise the existing is reused.

No checks are done on `params`. It's possible to supply parameters that would not in a route's URL.

The returned promise is fulfilled with `false` when `evt.preventDefault()` is called during `beforechange`.

### replace

```typescript
async function replace(name: string, params?: object, newContext?: object): boolean
```

Change the route, displacing the previous route.

### change

```typescript
async function change(url: string, options?: object): boolean
```

```typescript
async function change(link: HTMLAnchorElement, options?: object): boolean
```

Use a URL to change the route. By default, the previous route is pushed into browsing history. Supply the option `{ replace: true }` to override this behavior.

`url` must be an internal, relative URL.

Generally, you would use `push()` or `replace()` instead when changing the route programmatically.

### find

```typescript
function find(name: string, params?: object, newContext?: object): string
```

Find the URL of a route. `name` is the name of desired page, while `params` are the route parameters.

If `newContext` is supplied, it'll be merged with the existing context and used for rewrite the URL. Otherwise the existing context is used.

### back

```typescript
async function back(): void
```

Go back to the previous page. The function will reject attempts to go beyond the browsing history of the app.

### match

```typescript
function match(url: string): object
```

Match a URL with a route. `url` should be an internal, relative URL. Returns a object containing the following fields:

* `name` - name of the route
* `params` - parameters extract from `url`
* `context` - rewrite context
* `route` - the route definition
* `url` - the parameter passed to this function
* `path` - the path part of the URL
* `query` - an object containing the query variables
* `search` - the query string (with leading '?')
* `hash` - the hash part of the URL (without leading '#')

An exception is thrown if not match is found.

### preload

```typescript
async function preload(): void
```

Run the `load()` methods of every route. The object passed to `load()` will contain `params` and `context` so you can safely update their properties. Other field such as `name` and `url` will be `undefined`.

## Events

* [beforechange](#beforechange)
* [change](#change)

### beforechange

The `beforechange` event is emitted when a route change is about to occur. It gives your app a chance to prevent or postpone the change. For example, you might wish to ask the user to confirm the decision to leave a page when doing so means the loss of unsaved changes. Another usage scenario is to ask the user to log in before viewing a non-public page.

#### Properties

* `type` - 'beforechange'
* `target` - the route manager
* `defaultPrevented` - whether `preventDefault()` was called
* `propagationStopped` - whether `stopImmediatePropagation()` was called
* `name` - name of the new route
* `params` - parameters extract from `url`
* `context` - rewrite context
* `route` - the route definition
* `url` - the parameter passed to this function
* `path` - the path part of the URL
* `query` - an object containing the query variables
* `search` - the query string (with leading '?')
* `hash` - the hash part of the URL (without leading '#')

#### Methods

* `preventDefault()` - stops the route change from happening
* `postponeDefault(promise: Promise)` - postpones the route change util `promise` is fulfilled
* `stopImmediatePropagation()` - stops other listeners from receiving the event
* `substitute(name: string, params?: object, newContext?: object)` - change the route while the required route change is on hold

An event listener can check `evt.route` to see if a route requires authentication. If so, it should call `evt.postponeDefault()` with a promise that fulfills to `true` after authentication--or to `false` if the user declines. The application should then bring up the user interface for logging in. If that involves a different page, use `evt.substitute()` to change the route. The following describes such a login process:

1. The user clicks on a link to an access-controlled page, triggering a `beforechange` event.
2. The `beforechange` handler notices the route requires authentication. It calls `evt.postponeDefault()` to block the change, then `evt.substitute()` to redirect to the login page.
3. `evt.substitute()` triggers a `change` event. The app rerenders to show the login page.
4. The visitor logs in.
5. The promise given to `evt.postponeDefault()` is fulfilled. The route changes to the intended, access-controlled page.

A call to `start()` will also trigger the `beforechange` event. Suppose a visitor has enter the URL of an access-controlled page into the browser location bar. The following sequence would occur:

1. `start()` triggers a `beforechange` event.
2. The `beforechange` handler notices the route requires authentication. It calls `evt.postponeDefault()` to block the change, then `evt.substitute()` to redirect to the login page.
3. `evt.substitute()` triggers a `change` event. The promise returned by `start()` is fulfilled.
4. The application's UI code starts (i.e. the root React component is rendered), with the login page as the current route.
5. The visitor logs in.
6. The promise given to `evt.postponeDefault()` is fulfilled. The route changes to the intended, access-controlled page.

### change

The `change` event is emitted after a route change has occurred, meaning the route manager has successfully load the necessary code and updated its internal state.

#### Properties

* `type` - 'change'
* `target` - the route manager
* `propagationStopped` - whether `stopImmediatePropagation()` was called

#### Methods

* `stopImmediatePropagation()` - stops other listeners from receiving the event

## Examples

* [Starwars API: Episode V](https://github.com/chung-leong/relaks-starwars-example-sequel) - sequel to the first Starwars API example
* [Django todo list](https://github.com/chung-leong/relaks-django-todo-example) - demonstrates authentication and data saving using [relaks-django-data-source](https://github.com/chung-leong/relaks-django-data-source)

## License

This project is licensed under the MIT License - see the [LICENSE](#LICENSE) file for details
