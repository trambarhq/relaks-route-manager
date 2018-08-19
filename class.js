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
            parameters: PropTypes.object,
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

prototype.componentWillReceiveProps = function(nextProps) {
    if (this.props.trackLinks !== nextProps.trackLinks) {
        this.setLinkHandler(nextProps.trackLinks);
    }
    if (this.props.trackLocation !== nextProps.trackLocation) {
        this.setLocationHandler(nextProps.trackLocation);
    }
};

prototype.componentWillUnmount = function() {
    if (this.props.trackLinks) {
        this.setLinkHandler(false);
    }
    if (this.props.trackLocation) {
        this.setLocationHandler(false);
    }
};

prototype.change = function(url, replace) {
    var urlParts = parseURL(url);
    var context = {};
    this.rebase('to', urlParts);
    this.rewrite('from', urlParts, context);
    var params = {};
    var name = this.match(urlParts, params, context);
    if (name) {
        var _this = this;
        this.load(name, params, context).then(function() {
            var state = {
                name: name,
                url: url,
                params: params,
                context: context,
            };
            _this.setLocationURL(url, replace);
            _this.setState(state, function() {
                _this.triggerChangeEvent();
            });
        });
    }
};

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
    this.rewrite('to', urlParts, context);
    this.rebase('to', urlParts);
    var url = composeURL(urlParts);
    if (this.props.useHashFallback) {
        url = '#' + url;
    }
    return url;
};

prototype.match = function(urlParts, params) {
    var routes = this.props.routes;
    for (var name in routes) {
        var routeDef = routes[name];
        var types = routeDef.parameters;
        // if the path matches, then it's a match
        // query and hash variables are treated as options
        if (matchTemplate(urlParts.path, routeDef.path, types, params, true)) {
            for (var queryVarName in routeDef.query) {
                var queryVarTemplate = routeDef.query[queryVarName];
                var queryVarValue = urlParts.query[queryVarName];
                matchTemplate(queryVarValue, queryVarTemplate, types, params);
            }
            matchTemplate(urlParts.hash, routeDef.hash, types, params);
            return name;
        }
    }
    return null;
};

prototype.fill = function(name, params) {
    var routeDef = this.props.routes[name];
    if (!routeDef) {
        throw new Error('No route by that name: ' + name);
    }
    var types = routeDef.parameters;
    var path = fillTemplate(routeDef.path, types, params, true);
    var hash = fillTemplate(routeDef.hash, types, params);
    var query = {};
    for (var queryVarName in routeDef.query) {
        var queryVarTemplate = routeDef.query[queryVarName];
        var queryVarValue = fillTemplate(queryVarTemplate, types, params);
        query[queryVarName] = queryVarValue;
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
            var f = rewrites[i];
            if (f(direction, urlParts, context) === false) {
                break;
            }
        }
    } else if (direction === 'to') {
        for (var i = rewrites.length - 1; i >= 0; i--) {
            var f = rewrites[i];
            if (f(direction, urlParts, context) === false) {
                break;
            }
        }
    }
};

/**
 * Add or remove basePath from a URL's path part
 *
 * @param  {String} direction
 * @param  {Object} urlParts
 */
prototype.rebase = function(direction, urlParts) {
    var basePath = this.props.basePath;
    if (direction === 'from') {
        var newPath = getRelativePath(basePath, urlParts.path);
        if (newPath) {
            urlParts.path = newPath;
        }
    } else if (direction === 'to') {
        if (basePath) {
            urlParts.path = basePath + urlParts.path;
        }
    }
};

prototype.load = function(name, params, context) {
    try {
        var result;
        var routeDef = this.props.routes[name];
        if (routeDef && routeDef.load) {
            result = routeDef.load(params, context);
        }
        return Promise.resolve(result);
    } catch (err) {
        return Promise.reject(err);
    }
};

prototype.getLocationURL = function(location) {
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
            document.addEventListener('click', this.handlers.handleLinkClick);
        }
    } else {
        if (this.handlers.handleLinkClick) {
            document.removeEventListener('click', this.handlers.handleLinkClick);
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

prototype.handleLinkClick = function(evt) {
    if (evt.button === 0) {
        var link = getLink(evt.target);
        var match = false;
        if (link && !link.target && !link.download) {
            var { protocol, host, pathname, search } = link;
            if (protocol === location.protocol && host === location.host) {
                if (this.props.useHashFallback) {
                    if (pathname === location.pathname && search === location.search) {
                        match = true;
                    }
                } else {
                    var basePath = this.props.basePath;
                    if (pathname.substr(0, basePath.length) === basePath && pathname.charAt(basePath.length) === '/') {
                        match = true;
                    }
                }
            }
        }
        if (match) {
            evt.preventDefault();
            evt.stopPropagation();

            var url = this.getLocationURL(link);
            this.change(url);
        }
    }
};

prototype.handlePopState = function(evt) {
    evt.preventDefault();

    var url = this.getLocationURL(location);
    this.change(url);
};

return prototype.constructor;
};

var variableRegExp = /\$\{\w+\}/g;

var regExpCache = {};

function getURLTemplateRegExp(template, sep) {
    if (!template) {
        return null;
    }
    var key = sep + ':' + template;
    var re = regExpCache[key];
    if (!re) {
        var pattern = template.replace(variableRegExp, '([^' + sep + ']+)');
        re = new RegExp('^' + pattern + '$');
        regExpCache[key] = re;
    }
    return re;
}

var variableListCache = {};

function getURLTemplateVariables(template) {
    var list = variableListCache[template];
    if (!list) {
        var matches = template.match(variableRegExp);
        list = [];
        if (matches) {
            for (var i = 0; i < matches.length; i++) {
                var match = matches[i];
                list.push(match.substr(2, match.length - 3));
            }
        }
        variableListCache[template] = list;
    }
    return list;
}

function matchTemplate(urlPart, template, types, params, all) {
    if (!urlPart || !template) {
        return false;
    }
    if (typeof(template) === 'object') {
        if (template.from) {
            return template.from(urlPart, params);
        }
    } else if (typeof(template) === 'string') {
        var re = getURLTemplateRegExp(template);
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
                if (all) {
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
    if (typeof(template) === 'object') {
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
            }
        }
        return urlPath;
    }
    return '';
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
        if (string.toLowerCase() === 't') {
            return true;
        } else if (string.toLowerCase() === 'f') {
            return false;
        } else {
            var n = parseFloat(string);
            if (n === n) {
                return !!n;
            } else {
                return !!string;
            }
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
        return (value) ? 't' : 'f';
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
