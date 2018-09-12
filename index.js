var SSR = (typeof window !== 'object');
var defaultOptions = {
    useHashFallback: false,
    trackLinks: (SSR) ? false : true,
    trackLocation: (SSR) ? false : true,
    basePath: '',
};

function RelaksRouteManager(options) {
    this.active = false;
    this.url = '';
    this.name = '';
    this.params = '';
    this.context = '';
    this.routes = {};
    this.route = null;
    this.history = [];
    this.startTime = getTime();
    this.listeners = [];
    this.options = {};
    this.rewrites = [];
    for (var name in defaultOptions) {
        if (options && options[name] !== undefined) {
            this.options[name] = options[name];
        } else {
            this.options[name] = defaultOptions[name];
        }
    }
    if (options && options.routes) {
        this.addRoutes(options.routes);
    }
    if (options && options.rewrites) {
        this.addRewrites(options.rewrites);
    }
    this.handleLinkClick = this.handleLinkClick.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
}

var prototype = RelaksRouteManager.prototype;

/**
 * Activate the component
 */
prototype.activate = function() {
    if (!this.active) {
        if (this.options.trackLinks) {
            window.addEventListener('click', this.handleLinkClick);
        }
        if (this.options.trackLocation) {
            window.addEventListener('popstate', this.handlePopState);
        }
        this.active = true;
    }
};

/**
 * Deactivate the component
 *
 * @return {[type]}
 */
prototype.deactivate = function() {
    if (this.active) {
        if (this.options.trackLinks) {
            window.removeEventListener('click', this.handleLinkClick);
        }
        if (this.options.trackLocation) {
            window.removeEventListener('popstate', this.handlePopState);
        }
        this.active = false;
    }
};

/**
 * Load the initial route
 *
 * @param  {String|undefined} url
 *
 * @return {Promise<Boolean>}
 */
prototype.start = function(url) {
    if (!url) {
        if (this.options.trackLocation) {
            url = this.getLocationURL(window.location);
        }
    }
    // wait for a change event or the promise returned by change()
    // need to wait for the second promise because change() could
    // fail in which case no event would be triggered
    var _this = this;
    var handler;
    var eventPromise = new Promise(function(resolve, reject) {
        handler = function(evt) {
            _this.removeEventListener('change', handler);
            resolve(true);
        };
    });
    this.addEventListener('change', handler);
    var methodPromise = this.change(url, { replace: true });
    return Promise.race([ methodPromise, eventPromise ]);
}

/**
 * Attach an event handler
 *
 * @param  {String} type
 * @param  {Function} handler
 */
prototype.addEventListener = function(type, handler) {
    this.listeners.push({ type: type,  handler: handler });
};

/**
 * Remove an event handler
 *
 * @param  {String} type
 * @param  {Function} handler
 */
prototype.removeEventListener = function(type, handler) {
    this.listeners = this.listeners.filter(function(listener) {
        return !(listener.type === type && listener.handler === handler);
    })
};

/**
 * Send event to event listeners, return true or false depending on whether
 * there were any listeners
 *
 * @param  {RelaksDjangoDataSourceEvent} evt
 *
 * @return {Boolean}
 */
prototype.triggerEvent = function(evt) {
    var fired = false;
    this.listeners.forEach(function(listener) {
        if (listener.type === evt.type && listener.handler) {
            fired = true;
            listener.handler(evt);
        }
    });
    return fired;
};

/**
 * Add routes
 *
 * @param  {Object<Object>} routes
 */
prototype.addRoutes = function(routes) {
    for (var name in routes) {
        if (routes[name] !== this.routes[name]) {
            if (process.env.NODE_ENV !== 'production') {
                if (this.routes[name]) {
                    console.warn('Overwriting existing route: ', this.routes[name]);
                }
            }
            this.routes[name] = routes[name];
        }
    }
};

/**
 * Remove routes
 *
 * @param  {Object<Object>} routes
 */
prototype.removeRoutes = function(routes) {
    for (var name in routes) {
        if (routes[name] === this.routes[name]) {
            delete this.routes[name];
        }
    }
};

/**
 * Add rewrite rules
 *
 * @param  {Array<Object>} rewrites
 */
prototype.addRewrites = function(rewrites) {
    var _this = this;
    rewrites.forEach(function(rewrite) {
        _this.rewrites.push(rewrite);
    });
};

/**
 * Add remove rules
 *
 * @param  {Array<Object>} rewrites
 */
prototype.removeRewrites = function(rewrites) {
    var _this = this;
    rewrites.forEach(function(rewrite) {
        var index = _this.rewrites.indexOf(rewrite);
        if (index !== -1) {
            _this.rewrites.splice(index, 1);
        }
    });
};

/**
 * Change the route to what the given URL points to
 *
 * @param  {String} url
 * @param  {Object|undefined} options
 *
 * @return {Promise<Boolean>}
 */
prototype.change = function(url, options) {
    try {
        var match = this.match(url);
        var replace = (options) ? options.replace || false : false;
        var time = getTime();
        return this.apply(match, time, true, replace);
    } catch (err) {
        return Promise.reject(err);
    }
};

/**
 * Change the route to the one given, adding to history
 *
 * @param  {String} name
 * @param  {Object} params
 *
 * @return {Promise}
 */
prototype.push = function(name, params) {
    try {
        var url = this.find(name, params);
        if (this.options.useHashFallback) {
            url = url.substr(1);
        }
        return this.change(url);
    } catch (err) {
        return Promise.reject(err);
    }
};

/**
 * Replace the current route with the one given
 *
 * @param  {String} name
 * @param  {Object} params
 *
 * @return {Promise}
 */
prototype.replace = function(name, params) {
    try {
        var url = this.find(name, params);
        if (this.options.useHashFallback) {
            url = url.substr(1);
        }
        return this.change(url, { replace: true });
    } catch (err) {
        return Promise.reject(err);
    }
};

/**
 * Switch to a route without adding an entry to the history
 *
 * @param  {String} name
 * @param  {Object} params
 *
 * @return {Promise<Boolean>}
 */
prototype.substitute = function(name, params) {
    var _this = this;
    var context = assign({}, this.context);
    var entry = this.history[this.history.length - 1];
    var time = (entry) ? entry.time : getTime();
    var url = this.find(name, params)
    if (!url) {
        url = this.url;
    }
    var match = { url: url, name: name, params: params || {}, context: context };
    return this.load(match).then(() => {
        if (url) {
            _this.setLocationURL(url, { time: time }, true);
        }
        _this.finalize(match);
    });
};

/**
 * Get a URL for a route for the parameters given
 *
 * @param  {String} name
 * @param  {Object} params
 * @param  {Object|undefined} newContext
 *
 * @return {String|undefined}
 */
prototype.find = function(name, params, newContext) {
    var urlParts = this.fill(name, params || {});
    if (!urlParts) {
        return;
    }
    var context = this.context;
    if (newContext) {
        context = assign({}, this.context, newContext);
    } else {
        context = this.context;
    }
    this.rebase('to', urlParts);
    this.rewrite('to', urlParts, context);
    var url = composeURL(urlParts);
    if (this.options.useHashFallback) {
        url = '#' + url;
    }
    return url;
};

/**
 * Go back to the previous route (if possible)
 *
 * @return {Promise}
 */
prototype.back = function() {
    if (this.history.length <= 1) {
        var err = new RelaksRouteManagerError(400, 'Going beyond starting page');
        return Promise.reject(err);
    }
    if (this.options.trackLocation) {
        var _this = this;
        return new Promise(function(resolve, reject) {
            _this.backResolve = resolve;
            _this.backReject = reject;
            window.history.back();

            // just in case the operation fails for some reason
            setTimeout(function() {
                var reject = _this.backReject;
                if (reject) {
                    _this.backResolve = undefined;
                    _this.backReject = undefined;
                    reject(new RelaksRouteManagerError(400, 'Unable to go back'));
                }
            }, 50);
        });
    } else {
        var previous = this.history[this.history.length - 2];
        return this.apply(previous, previous.time, false, false);
    }
};

/**
 * Match a URL with a route
 *
 * @param  {String} url
 *
 * @return {Object|null}
 */
prototype.match = function(url) {
    if (typeof(url) !== 'string') {
        throw new RelaksRouteManagerError(400, 'Invalid URL');
    }
    // perform rewrites
    var urlParts = parseURL(url);
    var context = {};
    this.rewrite('from', urlParts, context);

    // remove base path
    if (!this.rebase('from', urlParts)) {
        return null;
    }

    // look for matching route
    var params = {};
    var routes = this.routes;
    for (var name in routes) {
        var routeDef = routes[name];
        var types = routeDef.params;
        // if the path matches, then it's a match
        // query and hash variables are treated as options
        if (matchTemplate(urlParts.path, routeDef.path, types, params, true)) {
            for (var queryVarName in routeDef.query) {
                var queryVarTemplate = routeDef.query[queryVarName];
                var queryVarValue = urlParts.query[queryVarName];
                matchTemplate(queryVarValue, queryVarTemplate, types, params);
            }
            matchTemplate(urlParts.hash, routeDef.hash, types, params);
            return { url: url, name: name, params: params, context: context, route: routeDef };
        }
    }
    return null;
};

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
prototype.apply = function(match, time, sync, replace) {
    var _this = this;
    var confirmationEvent = new RelaksRouteManagerEvent('beforechange', this, match);
    var subEntry;
    confirmationEvent.substitute = function(name, params) {
        // duplicate the context object, just in case load() changes it
        var context = assign({}, match.context);
        var url = _this.find(name, params)
        if (!url) {
            // use URL of the intended route
            url = match.url;
        }
        var sub = { url: url, name: name, params: params || {}, context: context };
        return _this.load(sub).then(() => {
            subEntry = {
                url: sub.url,
                name: sub.name,
                params: sub.params,
                context: sub.context,
                time: time
            };
            _this.updateHistory(subEntry, replace);
            if (sync) {
                _this.setLocationURL(subEntry.url, { time: time }, replace);
            }
            _this.finalize(subEntry);
        });
    };
    this.triggerEvent(confirmationEvent);
    return confirmationEvent.waitForDecision().then(function() {
        if (confirmationEvent.defaultPrevented) {
            return false;
        }
        return _this.load(match).then(function() {
            var entry = {
                url: match.url,
                name: match.name,
                params: match.params,
                context: match.context,
                time: time
            };
            if (subEntry) {
                // a substitution occurred--go to the route if the substitute
                // at the top of the history stack
                var subEntryIndex = _this.history.indexOf(subEntry);
                if (subEntryIndex === _this.history.length - 1) {
                    if (entry.url !== subEntry.url) {
                        _this.setLocationURL(entry.url, { time: time }, true);
                    }
                    _this.finalize(entry);
                }
                // replace the substitute entry with entry of the actual route
                // so that clicking the back button sends the user to the
                // intended page and not the substitute page
                if (subEntryIndex !== -1) {
                    _this.history[subEntryIndex] = entry;
                }
            } else {
                entry = _this.updateHistory(entry, replace, true);
                if (sync) {
                    _this.setLocationURL(entry.url, { time: time }, replace);
                }
                _this.finalize(entry);
            }
            return true;
        });
    });
};

prototype.finalize = function(entry) {
    this.url = entry.url;
    this.name = entry.name;
    this.params = entry.params;
    this.context = entry.context;
    this.route = this.routes[entry.name];
    this.triggerEvent(new RelaksRouteManagerEvent('change', this));
};

/**
 * Fill a route templates with parameters
 *
 * @param  {String} name
 * @param  {Object} params
 *
 * @return {Object|null}
 */
prototype.fill = function(name, params) {
    var routeDef = this.routes[name];
    if (!routeDef) {
        throw new RelaksRouteManagerError(500, 'No route by that name: ' + name);
    }
    if (routeDef.path === '*' || typeof(routeDef.path) !== 'string') {
        return null;
    }
    var types = routeDef.params;
    var path = fillTemplate(routeDef.path, types, params, true);
    var hash = fillTemplate(routeDef.hash, types, params);
    var query = {};
    for (var queryVarName in routeDef.query) {
        var queryVarTemplate = routeDef.query[queryVarName];
        var queryVarValue = fillTemplate(queryVarTemplate, types, params);
        if (queryVarValue !== undefined) {
            query[queryVarName] = queryVarValue;
        }
    }
    return { path: path, hash: hash, query: query };
};

/**
 * Apply rewrites on URL parts
 *
 * @param  {String} direction
 * @param  {Object} urlParts
 * @param  {Object} context
 */
prototype.rewrite = function(direction, urlParts, context) {
    if (direction === 'from') {
        for (var i = 0; i < this.rewrites.length; i++) {
            var from = this.rewrites[i].from;
            if (from) {
                if (from(urlParts, context) === false) {
                    break;
                }
            }
        }
    } else if (direction === 'to') {
        for (var i = this.rewrites.length - 1; i >= 0; i--) {
            var to = this.rewrites[i].to;
            if (to) {
                if (to(urlParts, context) === false) {
                    break;
                }
            }
        }
    }
};

/**
 * Add or remove basePath from a URL's path part. Return false if it can't be done.
 *
 * @param  {String} direction
 * @param  {Object} urlParts
 *
 * @return {Boolean}
 */
prototype.rebase = function(direction, urlParts) {
    var basePath = this.options.basePath;
    if (direction === 'from') {
        var newPath = getRelativePath(basePath, urlParts.path);
        if (newPath) {
            urlParts.path = newPath;
            return true;
        }
    } else if (direction === 'to') {
        if (basePath) {
            urlParts.path = basePath + urlParts.path;
        }
        return true;
    }
    return false;
};

prototype.load = function(match) {
    try {
        var result;
        var routeDef = (match) ? this.routes[match.name] : null;
        if (!routeDef) {
            throw new RelaksRouteManagerError(404, 'No route');
        }
        if (routeDef.load) {
            result = routeDef.load(match.params, match.context);
        }
        return Promise.resolve(result);
    } catch (err) {
        return Promise.reject(err);
    }
};

/**
 * Return a relative URL or empty string (if link is pointing to an external page)
 *
 * @param  {Location|HTMLAnchorElement} location
 *
 * @return {String}
 */
prototype.getLocationURL = function(location) {
    var docLocation = window.location;
    if (location !== docLocation) {
        if (location.protocol !== docLocation.protocol) {
            return '';
        } else if (location.host !== docLocation.host) {
            return '';
        }
        if (this.options.useHashFallback) {
            if (location.pathname !== docLocation.pathname) {
                return '';
            }
            if (location.search !== docLocation.search) {
                return '';
            }
        }
    }
    if (this.options.useHashFallback) {
        var path = location.hash.substr(1);
        return path || '/';
    } else {
        return location.pathname + location.search + location.hash;
    }
};

prototype.updateHistory = function(entry, replace, restore) {
    if (entry.time >= this.startTime) {
        if (!replace) {
            // see if we're going backward
            var oldEntryIndex = -1;
            var oldEntry = null;
            for (var i = 0; i < this.history.length; i++) {
                if (this.history[i].time === entry.time) {
                    oldEntryIndex = i;
                    oldEntry = this.history[i];
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

prototype.setLocationURL = function(url, state, replace) {
    if (this.options.trackLocation) {
        var currentURL = this.getLocationURL(location);
        if (currentURL !== url) {
            if (this.options.useHashFallback) {
                url = '#' + url;
            }
            if (replace) {
                window.history.replaceState(state, '', url);
            } else {
                window.history.pushState(state, '', url);
            }
        }
    }
};

/**
 * Called when the user clicks on the page
 *
 * @param  {Event} evt
 */
prototype.handleLinkClick = function(evt) {
    if (evt.button === 0) {
        var link = getLink(evt.target);
        if (link && !link.target && !link.download) {
            var url = this.getLocationURL(link);
            if (url) {
                var match = this.match(url);
                if (match) {
                    var time = getTime();
                    evt.preventDefault();
                    evt.stopPropagation();
                    this.apply(match, time, true, false);
                }
            }
        }
    }
};

/**
 * Called when the user press the back button
 *
 * @param  {Event} evt
 */
prototype.handlePopState = function(evt) {
    var time = (evt.state) ? evt.state.time : getTime();
    var url = this.getLocationURL(window.location);
    var match = this.match(url);
    var promise = this.apply(match, time, false, false);

    // resolve promise created in back()
    var resolve = this.backResolve;
    var reject = this.backReject;
    if (resolve) {
        this.backResolve = undefined;
        this.backReject = undefined;
        promise.then(resolve, reject);
    }
};

var variableRegExp = /\$\{\w+\}/g;
var regExpCache = {};

function getURLTemplateRegExp(template, types, isPath) {
    if (!template) {
        return null;
    }
    var pattern = template.replace(variableRegExp, function(match) {
        var variable = match.substr(2, match.length - 3)
        var variableType = types[variable];
        var variablePattern;
        if (variableType === Number || variableType === Boolean) {
            variablePattern = '[\\d\\.]+';
        } else if (typeof(variableType) === 'object') {
            variablePattern = variableType.pattern;
        }
        if (!variablePattern) {
            if (isPath) {
                variablePattern = '[^/]+'
            } else {
                variablePattern = '.+';
            }
        }
        return '(' + variablePattern + ')';
    });
    if (isPath) {
        var lc = pattern.charAt(pattern - 1);
        if (lc === '/') {
            pattern += '?';
        } else {
            pattern += '/?';
        }
        pattern = '^' + pattern + '$';
    }
    var re = regExpCache[pattern];
    if (!re) {
        re = regExpCache[pattern] = new RegExp(pattern);
    }
    return re;
}

function getURLTemplateVariables(template) {
    var matches = template.match(variableRegExp);
    var list = [];
    if (matches) {
        for (var i = 0; i < matches.length; i++) {
            var match = matches[i];
            list.push(match.substr(2, match.length - 3));
        }
    }
    return list;
}

function matchTemplate(urlPart, template, types, params, isPath) {
    if (!urlPart || !template) {
        return false;
    }
    if (template instanceof Array) {
        var match = false;
        for (var i = 0; i < template.length; i++) {
            var t = template[i];
            if (matchTemplate(urlPart, t, types, params, isPath)) {
                match = true;
                if (isPath) {
                    break;
                }
            }
        }
        return match;
    } else if (typeof(template) === 'object') {
        if (template.from) {
            return template.from(urlPart, params);
        }
    } else if (typeof(template) === 'string') {
        if (template === '*') {
            return true;
        }
        var re = getURLTemplateRegExp(template, types, isPath);
        var matches = re.exec(urlPart);
        if (!matches) {
            return false;
        }
        var variables = getURLTemplateVariables(template);
        var values = {};
        for (var i = 0; i < variables.length; i++) {
            var variable = variables[i];
            var type = types[variable];
            var value = castValue(matches[i + 1], type);
            if (value !== undefined) {
                values[variable] = value;
            } else {
                if (isPath) {
                    return false;
                }
            }
        }
        assign(params, values);
        return true;
    }
    return false;
}

function fillTemplate(template, types, params, always) {
    if (template instanceof Array) {
        var tokens = [];
        for (var i = 0; i < template.length; i++) {
            var t = template[i];
            var s = fillTemplate(t, types, params, always);
            if (s) {
                tokens.push(s);
            }
        }
        return tokens.join('');
    } else if (typeof(template) === 'object') {
        if (template.to) {
            return template.to(params);
        }
    } else if (typeof(template) === 'string') {
        var variables = getURLTemplateVariables(template);
        var urlPath = template;
        for (var i = 0; i < variables.length; i++) {
            var variable = variables[i];
            var value = params[variable];
            var type = types[variable];
            if (value !== undefined || always) {
                var string = stringifyValue(value, type);
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
        var n = parseFloat(string);
        if (n === n) {
            return n;
        }
    } else if (type === Boolean) {
        var n = parseFloat(string);
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
        return String(value);
    } else if (type === Boolean) {
        return (value) ? '0' : '1';
    } else if (type instanceof Object) {
        if (type.to) {
            return type.to(value);
        }
    }
}

function getRelativePath(basePath, path) {
    if (!basePath) {
        return path;
    }
    if (path.substr(0, basePath.length) === basePath) {
        if (path.charAt(basePath.length) === '/') {
            return path.substr(basePath.length);
        } else if (path === basePath) {
            return '/';
        }
    }
}

function parseURL(url) {
    if (typeof(url) !== 'string') {
        throw new RelaksRouteManagerError(400, 'Invalid URL');
    }
    var path = url;
    var hash = '';
    var hashIndex = path.indexOf('#');
    if (hashIndex !== -1) {
        hash = path.substr(hashIndex + 1);
        path = path.substr(0, hashIndex);
    }
    var query = {};
    var queryIndex = path.indexOf('?');
    if (queryIndex !== -1) {
        query = parseQueryString(path.substr(queryIndex + 1));
        path = path.substr(0, queryIndex);
    }
    return { path: path, query: query, hash: hash };
}

function parseQueryString(queryString) {
    var values = {};
    if (queryString) {
        var pairs = queryString.split('&');
        for (var i = 0; i < pairs.length; i++) {
            var parts = pairs[i].split('=');
            var name = decodeURIComponent(parts[0]);
            var value = decodeURIComponent(parts[1] || '');
            value = value.replace(/\+/g, ' ');
            values[name] = value;
        }
    }
    return values;
}

function composeURL(urlParts) {
    var url = urlParts.path;
    var queryString = composeQueryString(urlParts.query);
    if (queryString) {
        url += '?' + queryString;
    }
    if (urlParts.hash) {
        url += '#' + urlParts.hash;
    }
    return url;
}

function composeQueryString(query) {
    var pairs = [];
    for (var name in query) {
        var value = query[name];
        var parts = [
            encodeURIComponent(name),
            encodeURIComponent(value),
        ];
        pairs.push(parts.join('='));
    }
    return pairs.join('&');
}

function getLink(element) {
    while (element && element.tagName !== 'A' && !element.href) {
        element = element.parentNode;
    }
    return element;
}

function getTime() {
    return (new Date).toISOString();
}

function assign(dst, src) {
    for (var i = 1; i < arguments.length; i++) {
        src = arguments[i];
        for (var key in src) {
            dst[key] = src[key];
        }
    }
    return dst;
}

function RelaksRouteManagerEvent(type, target, props) {
    this.type = type;
    this.target = target;
    assign(this, props);
    this.defaultPrevented = false;
    this.decisionPromise = null;
}

var prototype = RelaksRouteManagerEvent.prototype;

prototype.preventDefault = function() {
    this.defaultPrevented = true;
};

prototype.postponeDefault = function(promise) {
    if (process.env.NODE_ENV !== 'production') {
        if (!promise || !(promise.then instanceof Function)) {
            console.warn('Non-promise passed to postponeDefault()');
        }
    }
    this.decisionPromise = promise;
};

prototype.waitForDecision = function() {
    if (!this.decisionPromise) {
        return Promise.resolve();
    }
    return this.decisionPromise.then((decision) => {
        if (decision === false) {
            this.defaultPrevented = true;
        }
    });
};

function RelaksRouteManagerError(status, message) {
    this.status = status;
    this.message = message;
}

RelaksRouteManagerError.prototype = Object.create(Error.prototype)

module.exports = RelaksRouteManager;
module.exports.RelaksRouteManager = RelaksRouteManager;
module.exports.RelaksRouteManagerEvent = RelaksRouteManagerEvent;
module.exports.RelaksRouteManagerError = RelaksRouteManagerError;
