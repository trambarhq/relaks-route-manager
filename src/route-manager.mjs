import { EventEmitter } from 'relaks-event-emitter';
import { RelaksRouteManagerEvent } from './route-manager-event.mjs';
import { RelaksRouteManagerError } from './route-manager-error.mjs';

const SSR = (typeof window !== 'object');

const defaultOptions = {
  useHashFallback: false,
  trackLinks: (SSR) ? false : true,
  trackLocation: (SSR) ? false : true,
  preloadingDelay: NaN,
  reloadFaultyScript: false,
  basePath: '',
};

class RelaksRouteManager extends EventEmitter {
  constructor(options) {
    super();
    this.active = false;
    this.preloaded = false;
    this.options = {};
    this.routes = {};
    this.rewrites = [];

    // properties of the current route
    this.name = '';
    this.params = '';
    this.context = {};
    this.route = null;

    // properties of the current URL
    this.url = '';
    this.path = '';
    this.query = {};
    this.search = '';
    this.hash = '';

    this.history = [];
    this.startTime = getTimeStamp();
    this.queue = [];

    for (let name in defaultOptions) {
      if (options && options[name] !== undefined) {
        this.options[name] = options[name];
      } else {
        this.options[name] = defaultOptions[name];
      }
    }
    if (options) {
      let base = options.basePath || '';
      if (base.charAt(base.length - 1) === '/') {
        base = base.substr(0, base.length - 1);
      }
      if (base) {
        const basePathRewrite = {
          from: function(urlParts, context) {
            const path = urlParts.path;
            if (path.substr(0, base.length) === base) {
              if (path.charAt(base.length) === '/') {
                urlParts.path = path.substr(base.length);
              }
            }
          },
          to: function(urlParts, context) {
            const path = urlParts.path;
            urlParts.path = base + path;
          },
        };
        this.addRewrites([ basePathRewrite ]);
      }
      if (options.routes) {
        this.addRoutes(options.routes);
      }
      if (options.rewrites) {
        this.addRewrites(options.rewrites);
      }
    }
    this.handleLinkClick = this.handleLinkClick.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
  }

  /**
   * Activate the component
   */
  activate() {
    if (!this.active) {
      if (this.options.trackLinks) {
        window.addEventListener('click', this.handleLinkClick);
      }
      if (this.options.trackLocation) {
        window.addEventListener('popstate', this.handlePopState);
      }
      this.active = true;

      if (!this.preloaded) {
        const delay = this.options.preloadingDelay;
        if (delay) {
          setTimeout(() => {
            if (this.active && !this.preloaded) {
              this.preload();
              this.preloaded = true;
            }
          }, delay);
        }
      }
    }
  }

  /**
   * Deactivate the component
   */
  deactivate() {
    if (this.active) {
      if (this.options.trackLinks) {
        window.removeEventListener('click', this.handleLinkClick);
      }
      if (this.options.trackLocation) {
        window.removeEventListener('popstate', this.handlePopState);
      }
      this.active = false;
    }
  }

  /**
   * Load the initial route
   *
   * @param  {String|undefined} url
   *
   * @return {Promise<Boolean>}
   */
  start(url) {
    if (!url) {
      if (this.options.trackLocation) {
        url = this.getLocationURL(window.location);
      }
    }
    // wait for a change event or the promise returned by change()
    // need to wait for the second promise because change() could
    // fail in which case no event would be triggered
    let handler;
    const eventPromise = new Promise((resolve, reject) => {
      handler = function(evt) {
        this.removeEventListener('change', handler);
        resolve(true);
      };
    });
    this.addEventListener('change', handler);
    const methodPromise = this.change(url, { replace: true });
    return Promise.race([ methodPromise, eventPromise ]);
  }

  /**
   * Add routes
   *
   * @param  {Object<Object>} routes
   */
  addRoutes(routes) {
    for (let name in routes) {
      if (routes[name] !== this.routes[name]) {
        if (process.env.NODE_ENV !== 'production') {
          if (this.routes[name]) {
            console.warn('Overwriting existing route: ', this.routes[name]);
          }
        }
        this.routes[name] = routes[name];
      }
    }
  }

  /**
   * Remove routes
   *
   * @param  {Object<Object>} routes
   */
  removeRoutes(routes) {
    for (let name in routes) {
      if (routes[name] === this.routes[name]) {
        delete this.routes[name];
      }
    }
  }

  /**
   * Add rewrite rules
   *
   * @param  {Array<Object>} rewrites
   */
  addRewrites(rewrites) {
    for (let rewrite of rewrites) {
      this.rewrites.push(rewrite);
    }
  }

  /**
   * Add remove rules
   *
   * @param  {Array<Object>} rewrites
   */
  removeRewrites(rewrites) {
    for (let rewrite of rewrites) {
      const index = this.rewrites.indexOf(rewrite);
      if (index !== -1) {
        this.rewrites.splice(index, 1);
      }
    }
  }

  /**
   * Change the route to what the given URL points to
   *
   * @param  {String|HTMLAnchorElement|Location} url
   * @param  {Object|undefined} options
   *
   * @return {Promise<Boolean>}
   */
  change(url, options) {
    try {
      if (url instanceof Object) {
        url = this.getLocationURL(url);
      }
      const match = this.match(url);
      const replace = (options) ? options.replace || false : false;
      const time = getTimeStamp();
      return this.apply(match, time, true, replace);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Change the route to the one given, adding to history
   *
   * @param  {String} name
   * @param  {Object} params
   * @param  {Object|undefined} newContext
   *
   * @return {Promise<Boolean>}
   */
  push(name, params, newContext) {
    try {
      const match = this.generate(name, params, newContext);
      const time = getTimeStamp();
      return this.apply(match, time, true, false);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Replace the current route with the one given
   *
   * @param  {String} name
   * @param  {Object} params
   * @param  {Object|undefined} newContext
   *
   * @return {Promise<Boolean>}
   */
  replace(name, params, newContext) {
    try {
      const match = this.generate(name, params, newContext);
      const time = getTimeStamp();
      return this.apply(match, time, true, true);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Switch to a route without adding an entry to the history
   *
   * @param  {String} name
   * @param  {Object} params
   * @param  {Boolean} keepURL
   *
   * @return {Promise<Boolean>}
   */
  substitute(name, params, keepURL) {
    if (process.env.NODE_ENV !== 'production') {
      if (this.insideBeforeChangeHandler) {
        console.warn('Calling substitute() inside a beforechange handler. Perhaps you mean to call evt.substitute()?')
      }
    }
    const match = this.generate(name, params);
    const entry = this.history[this.history.length - 1];
    const time = (entry) ? entry.time : getTimeStamp();
    if ((match.url === undefined || keepURL) && entry) {
      // use URL of route being substituted
      match.url = entry.url;
      match.path = entry.path;
      match.query = entry.query;
      match.search = entry.search;
      match.hash = entry.hash;
    }
    return this.load(match).then(() => {
      if (match.url !== this.url) {
        this.setLocationURL(match.url, { time }, true);
      }
      this.finalize(match);
    });
  }

  /**
   * It should restore a route that has been substituted
   *
   * @return {Promise<Boolean>}
   */
  restore() {
    const entry = this.history[this.history.length - 1];
    if (!entry) {
      return Promise.resolve(false);
    }
    return this.load(entry).then(() => {
      const { url, time } = entry;
      if (url !== this.url) {
        this.setLocationURL(url, { time }, true);
      }
      this.finalize(entry);
      return true;
    });
  }

  /**
   * Get a URL for a route for the parameters given
   *
   * @param  {String} name
   * @param  {Object} params
   * @param  {Object|undefined} newContext
   *
   * @return {String|undefined}
   */
  find(name, params, newContext) {
    const match = this.generate(name, params, newContext);
    return this.applyFallback(match.url);
  }

  /**
   * Go back to the previous route (if possible)
   *
   * @return {Promise}
   */
  back() {
    if (this.history.length <= 1) {
      const err = new RelaksRouteManagerError(400, 'Going beyond starting page');
      return Promise.reject(err);
    }
    if (this.options.trackLocation) {
      return new Promise((resolve, reject) => {
        this.backResolve = resolve;
        this.backReject = reject;
        window.history.back();

        // just in case the operation fails for some reason
        setTimeout(() => {
          const reject = this.backReject;
          if (reject) {
            this.backResolve = undefined;
            this.backReject = undefined;
            reject(new RelaksRouteManagerError(400, 'Unable to go back'));
          }
        }, 50);
      });
    } else {
      const previous = this.history[this.history.length - 2];
      return this.apply(previous, previous.time, false, false);
    }
  }

  /**
   * Match a URL with a route
   *
   * @param  {String} url
   *
   * @return {Object|null}
   */
  match(url) {
    if (typeof(url) !== 'string') {
      throw new RelaksRouteManagerError(400, 'Invalid URL');
    }
    // perform rewrites
    const urlParts = this.parse(url);
    const context = {};
    this.rewrite('from', urlParts, context);

    // look for matching route
    const { path, query, search, hash } = urlParts;
    const params = {};
    for (let [ name, route ] of Object.entries(this.routes)) {
      const types = route.params;
      // if the path matches, then it's a match
      // query and hash variables are treated as options
      if (matchTemplate(path, route.path, types, params, true)) {
        if (route.query) {
          for (let [ varName, varTemplate ] of Object.entries(route.query)) {
            const varValue = query[varName];
            matchTemplate(varValue, varTemplate, types, params);
          }
        }
        matchTemplate(hash, route.hash, types, params);
        return {
          name,
          params,
          context,
          route,
          url,
          path,
          query,
          search,
          hash,
        };
      }
    }
    return null;
  }

  /**
   * Parse a URL into different parts
   *
   * @param  {String} url
   *
   * @return {Object}
   */
  parse(url) {
    if (typeof(url) !== 'string') {
      throw new RelaksRouteManagerError(400, 'Invalid URL');
    }
    let path = url;
    let hash = '';
    const hashIndex = path.indexOf('#');
    if (hashIndex !== -1) {
      hash = path.substr(hashIndex + 1);
      path = path.substr(0, hashIndex);
    }
    let query = {};
    let search = '';
    const queryIndex = path.indexOf('?');
    if (queryIndex !== -1) {
      search = path.substr(queryIndex);
      query = parseQueryString(search.substr(1));
      path = path.substr(0, queryIndex);
    }
    return { path, query, search, hash };
  }

  /**
   * Generate a match object given name a params and possibly a context
   *
   * @param  {String} name
   * @param  {Object} params
   * @param  {Object|undefined} newContext
   *
   * @return {String|undefined}
   */
  generate(name, params, newContext) {
    if (!params) {
      params = {};
    }
    const urlParts = this.fill(name, params);
    const route = this.routes[name];
    const context = Object.assign({}, this.context, newContext);
    const match = { name, params, context, route };
    if (urlParts) {
      // copy the URL parts first, before changing them in rewrite()
      Object.assign(match, urlParts);
      this.rewrite('to', urlParts, context);
      match.url = this.compose(urlParts);
    }
    return match;
  }

  /**
   * Compose a URL from its constituent parts
   *
   * @param  {Object} urlParts
   *
   * @return {String}
   */
  compose(urlParts) {
    const { path, query, hash } = urlParts;
    const queryString = composeQueryString(query);
    let url = path;
    if (queryString) {
      url += '?' + queryString;
    }
    if (hash) {
      url += '#' + hash;
    }
    return url;
  }

  /**
   * Load necessary module(s) for a route, append to history, set the state,
   * and trigger change event
   *
   * @param  {Object} match
   * @param  {String} time
   * @param  {Boolean} sync
   * @param  {Boolean} replace
   *
   * @return {Promise<Boolean>}
   */
  apply(match, time, sync, replace) {
    const confirmationEvent = new RelaksRouteManagerEvent('beforechange', this, match);
    let subEntry;
    confirmationEvent.substitute = (name, params, keepURL) => {
      const sub = this.generate(name, params, match.context);
      if (sub.url === undefined || keepURL) {
        // use URL of the intended route
        sub.url = match.url;
        sub.path = match.path;
        sub.query = match.query;
        sub.search = match.search;
        sub.hash = match.hash;
      }
      return this.load(sub).then(() => {
        subEntry = Object.assign({ time }, sub);
        this.updateHistory(subEntry, replace);
        if (sync) {
          this.setLocationURL(subEntry.url, { time }, replace);
        }
        this.finalize(subEntry);
      });
    };
    if (process.env.NODE_ENV !== 'production') {
      this.insideBeforeChangeHandler = true;
    }
    this.triggerEvent(confirmationEvent);
    if (process.env.NODE_ENV !== 'production') {
      this.insideBeforeChangeHandler = false;
    }
    return confirmationEvent.waitForDecision().then(() => {
      if (confirmationEvent.defaultPrevented) {
        return false;
      }
      // add the change to the queue, so we'd notice when multiple changes are
      // all waiting for the same promise to fulfill
      this.queue.push(match);
      return this.load(match).then(() => {
        let entry = Object.assign({ time }, match);
        if (subEntry) {
          // a substitution occurred--go to the route if the substitute
          // at the top of the history stack
          const subEntryIndex = this.history.indexOf(subEntry);
          if (subEntryIndex === this.history.length - 1) {
            if (entry.url !== subEntry.url) {
              this.setLocationURL(entry.url, { time }, true);
            }
            this.finalize(entry);
          }
          // replace the substitute entry with entry of the actual route
          // so that clicking the back button sends the user to the
          // intended page and not the substitute page
          if (subEntryIndex !== -1) {
            this.history[subEntryIndex] = entry;
          }
        } else {
          // ignore change unless it's at the end of the queue
          if (this.queue[this.queue.length - 1] !== match) {
            return false;
          }
          entry = this.updateHistory(entry, replace, true);
          if (sync) {
            this.setLocationURL(entry.url, { time }, replace);
          }
          this.finalize(entry);
          this.queue.splice(0);
        }
        return true;
      });
    });
  }

  /**
   * Set properties of component and fire change event
   *
   * @param  {Object} entry
   */
  finalize(entry) {
    Object.assign(this, entry);
    this.triggerEvent(new RelaksRouteManagerEvent('change', this));
  }


  /**
   * Fill a route templates with parameters
   *
   * @param  {String} name
   * @param  {Object} params
   *
   * @return {Object|null}
   */
  fill(name, params) {
    const route = this.routes[name];
    if (!route) {
      throw new RelaksRouteManagerError(500, 'No route by that name: ' + name);
    }
    if (route.path === '*') {
      return null;
    }
    const types = route.params;
    const path = fillTemplate(route.path, types, params, true);
    const hash = fillTemplate(route.hash, types, params);
    const query = {};
    if (typeof(path) !== 'string') {
      return null;
    }
    if (route.query) {
      for (let [ varName, varTemplate ] of Object.entries(route.query)) {
        const varValue = fillTemplate(varTemplate, types, params);
        if (varValue !== undefined) {
          query[varName] = varValue;
        }
      }
    }
    const queryString = composeQueryString(query);
    const search = (queryString) ? '?' + queryString : '';
    return { path, query, search, hash };
  }

  /**
   * Apply rewrites on URL parts
   *
   * @param  {String} direction
   * @param  {Object} urlParts
   * @param  {Object} context
   */
  rewrite(direction, urlParts, context) {
    if (direction === 'from') {
      for (let i = 0; i < this.rewrites.length; i++) {
        var rewrite = this.rewrites[i];
        if (rewrite.from) {
          if (rewrite.from(urlParts, context) === false) {
            break;
          }
        }
      }
    } else if (direction === 'to') {
      for (let i = this.rewrites.length - 1; i >= 0; i--) {
        var rewrite = this.rewrites[i];
        if (rewrite.to) {
          if (rewrite.to(urlParts, context) === false) {
            break;
          }
        }
      }
    }
  }

  /**
   * Call a route's load() function to load code needed (possibly asynchronously)
   *
   * @param  {Object} match
   *
   * @return {Promise}
   */
  load(match) {
    try {
      let result;
      const route = (match) ? this.routes[match.name] : null;
      if (!route) {
        throw new RelaksRouteManagerError(404, 'No route');
      }
      if (route.load) {
        result = route.load(match);
      }
      return Promise.resolve(result).catch((err) => {
        if (this.options.reloadFaultyScript) {
          if (/Loading chunk/i.test(err.message)) {
            if (typeof(performance) === 'object' && typeof(performance.navigation) === 'object') {
              if (performance.navigation.type !== 1) {
                if (navigator.onLine) {
                  // force reloading from server
                  console.log('Reloading page...');
                  location.reload(true);
                }
              }
            }
          }
        }
        throw err;
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Call the load function of every route
   *
   * @return  {Promise}
   */
  preload() {
    const promises = [];
    for (let [ name, route ] of Object.entries(this.routes)) {
      if (route && route.load) {
        const match = {
          params: {},
          context: {},
        };
        promises.push(route.load(match));
      }
    }
    return Promise.all(promises);
  }

  /**
   * Return a relative URL or empty string (if link is pointing to an external page)
   *
   * @param  {Location|HTMLAnchorElement} location
   *
   * @return {String}
   */
  getLocationURL(location) {
    const docLocation = window.location;
    if (location !== docLocation) {
      if (location.host !== docLocation.host) {
        throw new RelaksRouteManagerError(400, 'Host does not match');
      } else if (location.protocol !== docLocation.protocol) {
        throw new RelaksRouteManagerError(400, 'Protocol does not match');
      }
      if (this.options.useHashFallback) {
        if (location.pathname !== docLocation.pathname) {
          throw new RelaksRouteManagerError(400, 'Path does not match');
        }
        if (location.search !== docLocation.search) {
          throw new RelaksRouteManagerError(400, 'Query string does not match');
        }
      }
    }
    if (this.options.useHashFallback) {
      const path = location.hash.substr(1);
      return path || '/';
    } else {
      return location.pathname + location.search + location.hash;
    }
  }

  /**
   * Add or remove entries from history, depending on the entry's timestamp.
   * If the an entry with a matching time is found, return it when restore is
   * specified.
   *
   * @param  {Object} entry
   * @param  {Boolean} replace
   * @param  {Boolean} restore
   *
   * @return {Object}
   */
  updateHistory(entry, replace, restore) {
    if (entry.time >= this.startTime) {
      if (!replace) {
        // see if we're going backward
        let oldEntryIndex = -1;
        let oldEntry = null;
        for (let i = 0; i < this.history.length; i++) {
          const otherEntry = this.history[i];
          if (otherEntry.time === entry.time) {
            oldEntryIndex = i;
            oldEntry = otherEntry;
          }
        }
        if (oldEntry) {
          // no, going backward
          // remove entry and those after it
          this.history.splice(oldEntryIndex);

          if (restore) {
            // use what was stored in history instead of the properties
            // extracted from the URL; the two objects should be
            // identical unless this.history was altered
            entry = oldEntry;
          }
        }
      }
    } else {
      // going into history prior to page load
      // remember the time forward movement from deep into the past
      // works correctly
      this.history = [];
      this.startTime = entry.time;
    }
    if (replace && this.history.length > 0) {
      this.history[this.history.length - 1] = entry;
    } else {
      this.history.push(entry);
    }
    return entry;
  }

  /**
   * Set the browser's address bar when trackLocation is true
   *
   * @param  {String} url
   * @param  {Object} state
   * @param  {Boolean} replace
   */
  setLocationURL(url, state, replace) {
    if (this.options.trackLocation) {
      const currentURL = this.getLocationURL(location);
      if (currentURL !== url) {
        url = this.applyFallback(url);
        if (replace) {
          window.history.replaceState(state, '', url);
        } else {
          window.history.pushState(state, '', url);
        }
      }
    }
  }

  /**
   * Prepend URL with # when hash fallback is used
   *
   * @param  {String} url
   *
   * @return {String}
   */
  applyFallback(url) {
    if (this.options.useHashFallback) {
      if (url != undefined) {
        url = '#' + url;
      }
    }
    return url;
  }

  /**
   * Called when the user clicks on the page
   *
   * @param  {Event} evt
   */
  handleLinkClick(evt) {
    if (evt.button === 0 && !evt.defaultPrevented) {
      const link = getLink(evt.target);
      if (link && !link.target && !link.download) {
        try {
          const url = this.getLocationURL(link);
          if (url) {
            const match = this.match(url);
            if (match) {
              const time = getTimeStamp();
              evt.preventDefault();
              evt.stopPropagation();
              this.apply(match, time, true, false);
            }
          }
        } catch (err) {
        }
      }
    }
  }

  /**
   * Called when the user press the back button
   *
   * @param  {Event} evt
   */
  handlePopState(evt) {
    const time = (evt.state) ? evt.state.time : getTimeStamp();
    const url = this.getLocationURL(window.location);
    const match = this.match(url);
    const promise = this.apply(match, time, false, false);

    // resolve promise created in back()
    const resolve = this.backResolve;
    const reject = this.backReject;
    if (resolve) {
      this.backResolve = undefined;
      this.backReject = undefined;
      promise.then(resolve, reject);
    }
  }
}

const variableRegExp = /\$\{\w+\}/g;
const regExpCache = {};

function getURLTemplateRegExp(template, types, isPath) {
  if (!template) {
    return null;
  }
  let pattern = template.replace(variableRegExp, (match) => {
    const variable = match.substr(2, match.length - 3)
    const variableType = (types) ? types[variable] : String;
    let variablePattern;
    if (variableType === Number || variableType === Boolean) {
      variablePattern = '[\\d\\.]*';
    } else if (typeof(variableType) === 'object') {
      variablePattern = variableType.pattern;
    }
    if (!variablePattern) {
      if (isPath) {
        variablePattern = '[^/]*'
      } else {
        variablePattern = '.*';
      }
    }
    return '(' + variablePattern + ')';
  });
  if (isPath) {
    const lc = pattern.charAt(pattern - 1);
    if (lc === '/') {
      pattern += '?';
    } else {
      pattern += '/?';
    }
    pattern = '^' + pattern + '$';
  }
  let re = regExpCache[pattern];
  if (!re) {
    re = regExpCache[pattern] = new RegExp(pattern);
  }
  return re;
}

function getURLTemplateVariables(template) {
  const matches = template.match(variableRegExp);
  const list = [];
  if (matches) {
    for (let match of matches) {
      list.push(match.substr(2, match.length - 3));
    }
  }
  return list;
}

function matchTemplate(urlPart, template, types, params, isPath) {
  if (urlPart === undefined || !template) {
    return false;
  }
  if (typeof(template) === 'object') {
    if (template.from) {
      return template.from(urlPart, params);
    }
  } else if (typeof(template) === 'string') {
    if (template === '*') {
      return true;
    }
    const re = getURLTemplateRegExp(template, types, isPath);
    const matches = re.exec(urlPart);
    if (!matches) {
      return false;
    }
    const variables = getURLTemplateVariables(template);
    const values = {};
    for (let [ index, variable ] of variables.entries()) {
      const type = (types) ? types[variable] : String;
      const value = castValue(matches[index + 1], type);
      if (value !== undefined) {
        values[variable] = value;
      } else {
        if (isPath) {
          return false;
        }
      }
    }
    Object.assign(params, values);
    return true;
  }
  return false;
}

function fillTemplate(template, types, params, always) {
  if (typeof(template) === 'object') {
    if (template.to) {
      return template.to(params);
    }
  } else if (typeof(template) === 'string') {
    const variables = getURLTemplateVariables(template);
    let urlPath = template;
    for (let variable of variables) {
      const value = params[variable];
      const type = (types) ? types[variable] : String;
      if (value !== undefined || always) {
        const string = stringifyValue(value, type);
        urlPath = urlPath.replace('${' + variable + '}', string);
      } else {
        return;
      }
    }
    return urlPath;
  }
}

function castValue(string, type) {
  if (type === String) {
    return string;
  } else if (type === Number) {
    return parseFloat(string);
  } else if (type === Boolean) {
    const n = parseFloat(string);
    if (n === n) {
      return !!n;
    } else {
      return !!string;
    }
  } else if (type instanceof Object) {
    if (type.from) {
      return type.from(string);
    }
  }
}

function stringifyValue(value, type) {
  if (type === String) {
    return value;
  } else if (type === Number) {
    if (value === value) {
      return String(value);
    } else {
      return ''; // NAN
    }
  } else if (type === Boolean) {
    return (value) ? '1' : '0';
  } else if (type instanceof Object) {
    if (type.to) {
      return type.to(value);
    }
  }
}

function parseQueryString(queryString) {
  const values = {};
  if (queryString) {
    const pairs = queryString.split('&');
    for (let pair of pairs) {
      const parts = pair.split('=');
      const name = decodeURIComponent(parts[0]);
      const value = decodeURIComponent(parts[1] || '').replace(/\+/g, ' ');
      values[name] = value;
    }
  }
  return values;
}

function composeQueryString(query) {
  const pairs = [];
  for (let [ name, value ] of Object.entries(query)) {
    pairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
  }
  return pairs.join('&');
}

function getLink(element) {
  while (element && (element.tagName !== 'A' || !element.href)) {
    element = element.parentNode;
  }
  return element;
}

let counter = 0;

function getTimeStamp() {
  const s = (new Date).toISOString();
  const n = String(counter++);
  const c = '00000000'.substr(n.length) + n;
  return s.substr(0, 23) + c + 'Z';
}

export {
  RelaksRouteManager,
};
