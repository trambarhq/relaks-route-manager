function promiseSelf() {
  let resolve, reject;
  const promise = new Promise((f1, f2) => {
    resolve = f1;
    reject = f2;
  });
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export {
  promiseSelf,
  delay,
};
