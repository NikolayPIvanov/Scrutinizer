export const requestPromisesWithTimeout = async <T>(
  promise: Promise<T>,
  timeout = 10000
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Promise timed out after ${timeout} ms`));
    }, timeout);

    promise
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(reason => {
        clearTimeout(timer);
        reject(reason);
      });
  });
};

export const requestMultiplePromisesWithTimeout = async <T>(
  promises: Promise<T>[],
  timeout = 10000
): Promise<{success: T[]; error: T[]}> => {
  const timeoutPromises = promises.map(promise =>
    requestPromisesWithTimeout(promise, timeout)
  );

  const results = await Promise.allSettled(timeoutPromises);
  const success = [];
  const error = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      success.push(result.value);
    } else {
      error.push(result.reason);
    }
  }

  return {success, error};
};
