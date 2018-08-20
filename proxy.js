function RelaksRouteManagerProxy(routeManager) {
    this.routeManager = routeManager;
    this.name = routeManager.state.name;
    this.params = routeManager.state.params;
    this.context = routeManager.state.context;
    this.history = routeManager.state.history;
}

var prototype = RelaksRouteManagerProxy.prototype;

prototype.push = function(name, params) {
    return this.routeManager.push(name, params);
};

prototype.replace = function(name, params) {
    return this.routeManager.replace(name, params);
};

prototype.change = function(url, options) {
    return this.routeManager.change(url, options);
};

prototype.find = function(name, params) {
    return this.routeManager.find(name, params);
};

module.exports = RelaksRouteManagerProxy;
