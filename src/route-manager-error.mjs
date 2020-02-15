class RelaksRouteManagerError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export {
  RelaksRouteManagerError,
  RelaksRouteManagerError as RouteManagerError,
};
