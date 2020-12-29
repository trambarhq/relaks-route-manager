class RelaksRouteManagerProxy {
  constructor(routeManager) {
    this.routeManager = routeManager;
    this.name = routeManager.name;
    this.route = routeManager.route;
    this.params = routeManager.params;
    this.context = routeManager.context;
    this.history = routeManager.history;

    this.url = routeManager.url;
    this.path = routeManager.path;
    this.query = routeManager.query;
    this.search = routeManager.search;
    this.hash = routeManager.hash;

    for (let name in this.route) {
      if (!this.hasOwnProperty(name)) {
        this[name] = this.route[name];
      }
    }
  }

  push(name, params, context) {
    return this.routeManager.push(name, params, context);
  }

  replace(name, params, context) {
    return this.routeManager.replace(name, params, context);
  }

  substitute(name, params, context) {
    return this.routeManager.substitute(name, params, context);
  }

  restore() {
    return this.routeManager.restore();
  }

  change(url, options) {
    return this.routeManager.change(url, options);
  }

  find(name, params, context) {
    return this.routeManager.find(name, params, context);
  }
}

export {
  RelaksRouteManagerProxy,
  RelaksRouteManagerProxy as RouteManagerProxy,
};
