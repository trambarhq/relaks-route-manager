module.exports = function(React, PropTypes) {

var prototype = Object.create(React.Component.prototype);

function ReactRouteManager() {
    this.handlers = {};
    this.state = {
        url: null,
        name: null,
        params: {},
        context: {},
        history: [],
    };
}

prototype.constructor = ReactRouteManager;
prototype.constructor.prototype = prototype;

if (process.env.NODE_ENV !== 'production' && PropTypes) {
    prototype.constructor.propTypes = {
        trackLinks: PropTypes.bool,
        trackLocation: PropTypes.bool,
        useHashFallback: PropTypes.bool,
        basePath: PropTypes.string,
        routes: PropTypes.objectOf(PropTypes.shape({
            path: PropTypes.string.isRequired,
            params: PropTypes.object,
            load: PropTypes.func,
        })).isRequired,
        rewrites: PropTypes.arrayOf(PropTypes.func),
        onChange: PropTypes.func,
    }
}
if (process.env.INCLUDE_DISPLAY_NAME) {
    prototype.constructor.displayName = 'ReactRouteManager';
}

prototype.constructor.defaultProps = {
    trackLinks: true,
    trackLocation: true,
    useHashFallback: false,
    basePath: '',
};

prototype.render = function() {
    return null;
};

prototype.triggerChangeEvent = function() {
    if (this.props.onChange) {
        this.props.onChange({
            type: 'change',
            target: this,
        });
    }
};

prototype.componentWillMount = function() {
    if (this.props.trackLinks) {
        this.setLinkHandler(true);
    }
    if (this.props.trackLocation) {
        this.setLocationHandler(true);
    }
    var url = this.getLocationURL(location);
    this.change(url, true);
};

/**
 * Attach/remove handlers on prop changes
 *
 * @param  {Object} nextProps
 *
 * @return {[type]}
 */
prototype.componentWillReceiveProps = function(nextProps) {
    if (this.props.trackLinks !== nextProps.trackLinks) {
        this.setLinkHandler(nextProps.trackLinks);
    }
    if (this.props.trackLocation !== nextProps.trackLocation) {
        this.setLocationHandler(nextProps.trackLocation);
    }
};

/**
 * Remove handlers on unmount
 */
prototype.componentWillUnmount = function() {
    if (this.props.trackLinks) {
        this.setLinkHandler(false);
    }
    if (this.props.trackLocation) {
        this.setLocationHandler(false);
    }
};

/**
 * Change the route
 *
 * @param  {String} url
 * @param  {Boolean|undefined} replace
 *
 * @return {Promise}
 */
prototype.change = function(url, replace) {
    var match = this.match(url);
    if (match) {
        this.setLocationURL(url, replace);
        return this.apply(match);
    } else {
        var err = new Error('No route');
        return Promise.reject(err);
    }
};

/**
 * Load necessary module(s) for a route, set the state, and trigger change event
 *
 * @param  {Object} match
 *
 * @return {Promise}
 */
prototype.apply = function(match) {
    var _this = this;
    return this.load(match).then(function() {
        _this.setState(match, function() {
            _this.triggerChangeEvent();
        });
    });
};

/**
 * Get a URL for a route for the parameters given
 *
 * @param  {String} name
 * @param  {Object} params
 * @param  {Object|undefined} newContext
 *
 * @return {String}
 */
prototype.find = function(name, params, newContext) {
    var urlParts = this.fill(name, params);
    var context = this.state.context;
    if (newContext) {
        var orgContext = context;
        context = {};
        for (var name in orgContext) {
            context[name] = orgContext[name];
        }
        for (var name in newContext) {
            context[name] = newContext[name];
        }
    }
    this.rebase('to', urlParts);
    this.rewrite('to', urlParts, context);
    var url = composeURL(urlParts);
    if (this.props.useHashFallback) {
        url = '#' + url;
    }
    return url;
};

prototype.match = function(url) {
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
    var routes = this.props.routes;
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
            return { url: url, name: name, params: params, context: context };
        }
    }
    return null;
};

/**
 * Fill a route templates with parameters
 *
 * @param  {String} name
 * @param  {Object} params
 *
 * @return {Object}
 */
prototype.fill = function(name, params) {
    var routeDef = this.props.routes[name];
    if (!routeDef) {
        throw new Error('No route by that name: ' + name);
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
    var rewrites = this.props.rewrites;
    if (!(rewrites instanceof Array)) {
        return;
    }
    if (direction === 'from') {
        for (var i = 0; i < rewrites.length; i++) {
            var r = rewrites[i];
            var f = (r) ? r.from : null;
            if (f) {
                if (f(urlParts, context) === false) {
                    break;
                }
            }
        }
    } else if (direction === 'to') {
        for (var i = rewrites.length - 1; i >= 0; i--) {
            var r = rewrites[i];
            var f = (r) ? r.to : null;
            if (f) {
                if (f(urlParts, context) === false) {
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
    var basePath = this.props.basePath;
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
        var routeDef = this.props.routes[match.name];
        if (routeDef && routeDef.load) {
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
    var documentLocation = window.location;
    if (location !== documentLocation) {
        if (location.protocol !== documentLocation.protocol) {
            return '';
        } else if (location.host !== documentLocation.host) {
            return '';
        }
        if (this.props.useHashFallback) {
            if (location.pathname !== documentLocation.pathname) {
                return '';
            }
            if (location.search === documentLocation.search) {
                return '';
            }
        }
    }
    if (this.props.useHashFallback) {
        var path = location.hash.substr(1);
        return path || '/';
    } else {
        return location.pathname + location.search + location.hash;
    }
};

prototype.setLocationURL = function(url, replace) {
    var currentURL = this.getLocationURL(location);
    if (currentURL !== url) {
        if (this.props.useHashFallback) {
            var hash = '#' + url;
            if (replace) {
                location.replace(hash)
            } else {
                location.href = hash;
            }
        } else {
            if (replace) {
                history.replaceState({}, '', url);
            } else {
                history.pushState({}, '', url);
            }
        }
    }
};

prototype.setLinkHandler = function(enabled) {
    if (enabled) {
        if (!this.handlers.handleLinkClick) {
            this.handlers.handleLinkClick = this.handleLinkClick.bind(this);
            window.addEventListener('click', this.handlers.handleLinkClick);
        }
    } else {
        if (this.handlers.handleLinkClick) {
            window.removeEventListener('click', this.handlers.handleLinkClick);
            this.handlers.handleLinkClick = undefined;
        }
    }
};

prototype.setLocationHandler = function(enabled) {
    if (enabled) {
        if (!this.handlers.handlePopState) {
            this.handlers.handlePopState = this.handlePopState.bind(this);
            window.addEventListener('popstate', this.handlers.handlePopState);
        }
    } else {
        if (this.handlers.handlePopState) {
            window.removeEventListener('popstate', this.handlers.handlePopState);
            this.handlers.handlePopState = undefined;
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
        var match = false;
        if (link && !link.target && !link.download) {
            var url = this.getLocationURL(link);
            if (url) {
                var match = this.match(url);
                if (match) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    this.apply(match);
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
    evt.preventDefault();

    var url = this.getLocationURL(location);
    var match = this.match(url);
    if (match) {
        this.apply(match);
    }
};

return prototype.constructor;
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
        for (var name in values) {
            params[name] = values[name];
        }
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
