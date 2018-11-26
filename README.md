Relaks Route Manager
--------------------
Relaks Route Manager is a simple, flexible route manager designed for React applications that use [Relaks](https://github.com/chung-leong/relaks). It monitors the browser's current location using the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) and extract parameters from the URL. You can then vary the contents displayed by your app based on these parameters. In addition, it traps clicks on hyperlinks, automatically handling page requests internally.

The library has a promise-based asynchronous interface. It's specifically designed with WebPack code-splitting in mind. It's also designed to be used in isomorphic React apps.

* [Installation](#installation)
* [Usage](#usage)
* [Options](#options)
* [Routing table](#routing-table)
* [Rewrite rules](#rewrite-rules)
* [Properties](#properties)
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
    basePath: '',
    trackLinks: true,
    trackLocation: true,
    routes: routingTable,
    rewrites: rewriteRules,
    preloadingDelay: 2000,
    useHashFallback: true,
    reloadFaultyScript: true,
};
let routeManager = new RouteManager(options);
routeManager.activate();
await routeManager.start();
```

```javascript
/* Root-level React component */
class Application extends PureComponent {
    constructor(props) {
        super(props);
        let { routeManager } = props;
        this.state = {
            route: new Route(routeManager);
        }
    }

    componentDidMount() {
        let { routeManager } = this.props;
        routeManager.addEventListener('change', this.handleRouteChange);
    }

    /* ... */

    handleRouteChange = (evt) => {
        let { routeManager } = this.props;
        let route = new Route(routeManager);
        this.setState({ route });
    }
}
```

Components are expected to access functionalities of the route manager through a proxy object--`Route` in the sample code above. See the documentation of Relaks for an [explanation](https://github.com/chung-leong/relaks#proxy-objects). A [default implementation](https://github.com/chung-leong/relaks-route-manager/blob/master/proxy.js) is provided for reference purpose. It's recommended that you create your own.

## Options

* [basePath](#basepath)
* [preloadingDelay](#preloadingdelay)
* [reloadFaultyScript](#reloadFaultyScript)
* [trackLinks](#tracklinks)
* [trackLocation](#tracklocation)
* [useHashFallback](#usehashfallback)

### basePath

When specified, create a rewrite rule that strips the base path from the URL prior to matching and adds in the base path when a URL is requested through `find()`.

### preloadingDelay

Amount of time (in milliseconds) to wait before initiating page preloading. Relevant only for apps that employ code-splitting. When specified, the route manager will call `load()` of every route after the delay.

Default value: `NaN` (no preploading of pages)

### reloadFaultyScript

Force the document to reload when WebPack fails to load a JavaScript module. The [Navigation Timing API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigation) is used to check whether the document has already been refreshed, so that the document will not continually reload if the error cannot be resolved by reloading.

Default value: `false`

### trackLinks

Intercept click events emitted by hyperlinks (`A` elements). Links with the attribute `target` or `download` are ignored.

Default value: `true` when the window object is present (i.e. in a web-browser); `false` otherwise (e.g. in Node.js).

### trackLocation

Track changes of the current location caused by the visitor pressing the browser's back or forward button.

Default value: `true` when the window object is present (i.e. in a web-browser); `false` otherwise (e.g. in Node.js).

### useHashFallback

Place the URL of the app's current route in the hash portion of the browser location instead of changing the actual path. When `useHashFallback` is false, the location might look like the following:

`https://example.com/news/`

When it's true, the location will look like this:

`https://example.com/#/news/`

Hash fallback is useful when you're unable to add rewrite rules to the web server in order to enable client-side path changes. It's the only way to use this library when your app is running as a local file (in Cordova or Electron, for example).

Default value: `false`

### rewrites

An array containing rewrite functions that modify a URL prior to matching it against the routing table. See [rewrite rules](#rewrite-rules).

### routes

A hash table (i.e. an object) containing your app's routes. See [routing table](#routing-table).

## Routing table

Here's a section of the routing table used in [one of the examples](https://github.com/chung-leong/relaks-starwars-example-sequel):

```javascript
let routes = {
    'welcome': {
        path: '/',
        load: async (match) => {
            match.params.module = await import('pages/welcome-page' /* webpackChunkName: "welcome-page" */);
        }
    },
    'film-list': {
        path: '/films/',
        load: async (match) => {
            match.params.module = await import('pages/film-list' /* webpackChunkName: "film-list" */);
        }
    },
    'film-summary': {
        path: '/films/${id}/',
        params: { id: Number },
        load: async (match) => {
            match.params.module = await import('pages/film-page' /* webpackChunkName: "film-page" */);
        }
    },
    /* ... */
};
```

The key of each entry is the route's name. A route definition object may have these properties:

* `path` - a pattern used to match against the path of the URL
* `query` - an object containing patterns used to match against query variables
* `hash` - a patterned used to match against the hash of the URL
* `params` - an object specifying the parameters' types
* `load` - a function that is called every time the route is used

The ES6-like `${name}` syntax is used to specify where capturing occurs. If an entry with the name is found in `params`, it'll used to cast the parameter to the correct type. Otherwise it'll left as a string. A parameter's type impacts matching. If it's `Number` or `Boolean`, the matching string can only contain digits. If it's `String`, the string can have any character, except when matching is done on a path, in which case it may not contain `/`.

The following shows a route where parameters are extracted from all parts of a URL:

```javascript
{
    'dog-page': {
        path: '/owners/${ownerName}/dogs/${dogName}',
        query: {
            f: '${friendly}'
        },
        hash: 'P${paragraphNumber}',
        params: {
            ownerName: String,
            dogName: String,
            friendly: Boolean,
            paragraphNumber: Number,
        },
        load: async (match) => {
            match.params.module = await import('pages/dog-page' /* webpackChunkName: "dog-page" */);
        },
        authentication: true,
    }
}
```

A route is chosen when its `path` matches the URL. Parameters from `query` and `hash` are treated as optional. When `path` is `"*"`, it'll match any path. Such a route could be used for a 404 page. It should be placed at the bottom of the routing table.

The route definition may contain custom fields. In the example above, we're specifying that our dog page requires authentication.

### Loading a route

Once the route manager finds the correct entry for a route, it'll invoke its `load()` function. The function will receive an object containing `params` and `context`, as well as properties of the URL, such as `path` and `query`. If on-demand loading is employed, the function should initiate the code import and return a promise. The example above show how that's done using ES7 async/await syntax. It would look as follows if we write it in old-fashioned JavaScript:

```javascript
load: function(match) {
    return import('pages/dog-page' /* webpackChunkName: "dog-page" */).then(function(module) {
        match.params.module = module;
    });
},
```

The `/* webpackChunkName: ... */` comment gives the module module a name. Without it the JavaScript file would have an unintuitive numeric name. Consult the [WebPack documentation](https://webpack.js.org/guides/code-splitting/) for more details about code-splitting.

The parameter `module` is not special. It's simply a name used by the example app. The route manager does not doing anything beyond calling the function. It's up to your code to make correct use of the parameters. Imagine your app have different navigation bar depending on which page the visitor is in. Your `load()` functions might look something like the following:

```javascript
load: async (match) => {
    match.params.page = await import('pages/television' /* webpackChunkName: "television-page" */);
    match.params.nav = await import('nav/electronics' /* webpackChunkName: "electronics-nav" */);
},
```

### Custom matching

In lieu of a string pattern, you can supply an object containing two functions: `from()` and `to()`. The route manager invokes `from()` when it tries to match a URL to a route. It invokes `to()` when it forms a URL. For example, the code below can be used to capture the rest of the path, something that isn't possible using the default mechanism:

```javascript
class WikiPath {
    static from(path, params) {
        let regExp = /^\/wiki\/(.*)/;
        let match = regExp.exec(path);
        if (match) {
            params.pagePath = match[1];
            return true;
        }
    }

    static to(params) {
        return `/wiki/${params.pagePath}`;
    }
}
```

The route manager will not perform typecasting on parameters extracted in this manner.

### Custom typecasting

You can perform more sophisticated typecasting by placing an object with `from()` and `to()` methods in `params`. The following code converts a string to an array of `Number` and back:

```javascript
class NumberArray {
    static from(s) {
        if (s) {
            return s.split(',').map((s) => {
                return parseInt(s);
            });
        } else {
            return [];
        }
    }

    static to(a) {
        return a.join(',');
    }
}
```

## Rewrite rules

Rewrite rules let you extract parameters from the URL and save them the route manager's rewrite context. They're useful in situations when you have parameters that are applicable to all routes. For example, suppose we are building a CMS that uses Git as a backend. By default, the app would fetch data from the HEAD of the master branch. The end user can also view data from a different branch or a commit earlier in time. Instead of adding these parameters to every route, we can use a rewrite rule to extract them from the URL if it begins with `/@<branch>:<commit>`. Our app can then obtain the branch and commit ID from the route manager's `context` property.

A rewrite rule is an object containing two functions: `from()` and `to()`. The route manager invokes `from()` before it tries to match a URL to a route. It invokes `to()` when it forms a URL. The rule for our hypothetical app might something look like this:

```javascript
class ExtractCommitID {
    static from(urlParts, context) {
        let regExp = /^\/@([^\/]+)/;
        let match = regExp.exec(urlParts.path);
        if (match) {
            // e.g. https://example.net/@master:/news/
            let parts = match[1].split(':');
            context.branch = parts[0];
            context.commit = parts[1] || 'HEAD';
            urlParts.path = urlParts.path.substr(match[0].length) || '/';
        } else {
            // e.g. https://example.net/news/
            context.branch = 'master';
            context.commit = 'HEAD';
        }
    }

    static to(urlParts, context) {
        if (context.branch !== 'master' || context.commit !== 'HEAD') {
            let parts = [ context.branch ];
            if (context.commit !== 'HEAD') {
                parts.push(context.commit);
            }
            urlParts.path = `/@` + parts.join(':') + urlParts.path;
        }
    }
}
```

`urlParts` is an object containing the different parts of a URL: `path`, `query`, and `hash`. Typically, `from()` would remove the part of the path that it's looking for.

When a new context isn't provided to `find()`, it'll use the existing one. That means once the user clicks a link with a branch specified, all links will specify it automatically.

Multiple rules can be supplied to the route manager. If a rewrite function wishes to prevent subsequent rules from coming into play, it should return `false`.

## Properties

**Concerning the current route:**

* `context` - the current rewrite context
* `name` - the name of the route
* `params` - parameters extracted from the URL
* `route` - the route definition object

**Concerning the current URL:**

* `hash` - the hash  (without leading '#')
* `path` - the path part
* `query` - the query variables
* `search` - the query string (with leading '?')
* `url` - the URL itself

## Methods

**Event listeners:**

* [addEventListener](#addeventlistener)
* [removeEventListener](#removeeventlistener)

**Activation**

* [activate()](#activate)
* [deactivate()](#deactivate)

**Navigation:**

* [back](#back)
* [change](#change)
* [push](#push)
* [replace](#replace)
* [start](#start)

**Look-up:**

* [find](#find)
* [match](#match)

**Others:**

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

### activate

```typescript
function activate(): void
```

Activate the route manager, attaching event listeners to the DOM.

### deactivate

```typescript
function deactivate(): void
```

Deactivate the route manager, removing event listeners from the DOM.

### back

```typescript
async function back(): void
```

Go back to the previous page. The function will reject attempts to go beyond the browsing history of the app.

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

### push

```typescript
async function push(name: string, params?: object, newContext?: object): boolean
```

Change the route, saving the previous route in browsing history. `name` is the name of desired page (i.e. a key in the routing table), while `params` are the route parameters.

If `newContext` is supplied, it'll be merged with the existing rewrite context and becomes the new context. Otherwise the existing context is reused.

No checks are done on `params`. It's possible to supply parameters that could not appear in a route's URL.

The returned promise is fulfilled with `false` when `evt.preventDefault()` is called during `beforechange`.

### replace

```typescript
async function replace(name: string, params?: object, newContext?: object): boolean
```

Change the route, displacing the previous route.

### start

```typescript
async function start(url?: string): boolean
```

Start the route manager, using `url` for the initial route. If `url` is omitted and [trackLocation](#tracklocation) is `true`, the URL will be obtained from the browser's `location` object.

The promise returned by this method is fulfilled when a `change` event occurs. This can happen either because the intended route is reached or if `evt.postponeDefault()` and `evt.substitute()` are used during a `beforechange` event.

### find

```typescript
function find(name: string, params?: object, newContext?: object): string
```

Find the URL of a route. `name` is the name of desired page, while `params` are the route parameters.

If `newContext` is supplied, it'll be merged with the existing context and used for rewrite the URL. Otherwise the existing context is used.

### match

```typescript
function match(url: string): object
```

Match a URL with a route, returning a object containing the following fields:

* `context` - rewrite context
* `hash` - hash part of the URL (without leading '#')
* `name` - name of the route
* `params` - parameters extract from `url`
* `path` - path part of the URL
* `query` - an object containing query variables
* `route` - route definition
* `search` - query string (with leading '?')
* `url` - the parameter passed to this function

`url` should be an internal, relative URL.

An exception is thrown if no match is found.

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

**Default action:**

Permit the change to occur.

**Properties:**

* `context` - rewrite context
* `hash` - hash part of the URL (without leading '#')
* `name` - name of the new route
* `params` - parameters extract from the URL
* `path` - path part of the URL
* `query` - an object containing query variables
* `route` - route definition
* `search` - query string (with leading '?')
* `url` - the URL
* `defaultPrevented` - whether `preventDefault()` was called
* `propagationStopped` - whether `stopImmediatePropagation()` was called
* `target` - the route manager
* `type` - "beforechange"

**Methods:**

* `substitute(name: string, params?: object, newContext?: object)` - change the route while the requested route change is on hold
* `postponeDefault(promise: Promise)` - postpone the route change util `promise` is fulfilled
* `preventDefault()` - stop the route change from happening
* `stopImmediatePropagation()` - stop other listeners from receiving the event

If an event listener decides that the visitor cannot immediately proceed to the route, it can call `evt.postponeDefault()` to defer the change. The method expects a promise. If the promise is fulfilled with anything other than `false`, the route change will occur then. While the promise is pending, `evt.substitute()` can be used to switch to a page where the visitor can perform the necessary action. The following describes a login process involving a login page:

1. The user clicks on a link to an access-controlled page, triggering a `beforechange` event.
2. The `beforechange` handler notices the route requires authentication. It calls `evt.postponeDefault()` to defer the change, then `evt.substitute()` to redirect to the login page.
3. `evt.substitute()` triggers a `change` event. The app rerenders to show the login page.
4. The visitor logs in.
5. The promise given to `evt.postponeDefault()` is fulfilled. The route changes to the intended, access-controlled page.

A call to `start()` will also trigger the `beforechange` event. Suppose a visitor has enter the URL of an access-controlled page into the browser location bar. The following sequence would occur:

1. `start()` triggers a `beforechange` event.
2. The `beforechange` handler notices the route requires authentication. It calls `evt.postponeDefault()` to defer the change, then `evt.substitute()` to redirect to the login page.
3. `evt.substitute()` triggers a `change` event. The promise returned by `start()` is fulfilled.
4. The application's UI code starts (i.e. the root React component is rendered), with the login page as the current route.
5. The visitor logs in.
6. The promise given to `evt.postponeDefault()` is fulfilled. The route changes to the intended, access-controlled page.

### change

The `change` event is emitted after a route change has occurred, meaning the route manager has successfully load the necessary code and updated its internal state.

**Properties:**

* `propagationStopped` - whether `stopImmediatePropagation()` was called
* `target` - the route manager
* `type` - `"change"`

**Methods:**

* `stopImmediatePropagation()` - stop other listeners from receiving the event

## Examples

* [Starwars API: Episode V](https://github.com/chung-leong/relaks-starwars-example-sequel) - sequel to the first Starwars API example
* [Django todo list](https://github.com/chung-leong/relaks-django-todo-example) - demonstrates authentication and data saving using [relaks-django-data-source](https://github.com/chung-leong/relaks-django-data-source)

## License

This project is licensed under the MIT License - see the [LICENSE](#LICENSE) file for details
