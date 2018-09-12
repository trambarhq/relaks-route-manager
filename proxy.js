function RelaksRouteManagerProxy(routeManager) {
    this.routeManager = routeManager;
    this.name = routeManager.name;
    this.params = routeManager.params;
    this.context = routeManager.context;
    this.history = routeManager.history;

    this.url = routeManager.url;
    this.path = routeManager.path;
    this.query = routeManager.query;
    this.search = routeManager.search;
    this.hash = routeManager.hash;
}

var prototype = RelaksRouteManagerProxy.prototype;

prototype.push = function(name, params) {
    return this.routeManager.push(name, params);
};

prototype.replace = function(name, params) {
    return this.routeManager.replace(name, params);
};

prototype.substitute = function(name, params) {
    return this.routeManager.substitute(name, params);
};

prototype.restore = function() {
    return this.routeManager.restore();
};

prototype.change = function(url, options) {
    return this.routeManager.change(url, options);
};

prototype.find = function(name, params) {
    return this.routeManager.find(name, params);
};

module.exports = RelaksRouteManagerProxy;
