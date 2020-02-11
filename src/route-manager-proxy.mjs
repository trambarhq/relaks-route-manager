class RelaksRouteManagerProxy {
  constructor(routeManager) {
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

  push(name, params) {
    return this.routeManager.push(name, params);
  }

  replace(name, params) {
    return this.routeManager.replace(name, params);
  }

  substitute(name, params) {
    return this.routeManager.substitute(name, params);
  }

  restore() {
    return this.routeManager.restore();
  }

  change(url, options) {
    return this.routeManager.change(url, options);
  }

  find(name, params) {
    return this.routeManager.find(name, params);
  }
}

export {
  RelaksRouteManagerProxy,
};
