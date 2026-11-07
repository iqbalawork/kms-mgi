var GAS_TIMEOUT_MS = { read: 90000, write: 380000 };

function gasError(message) {
  var err = new Error(message);
  err.gas = true;
  return err;
}

function gasReady() {
  return typeof GAS_URL === 'string' && /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(GAS_URL) && !/PASTE_/.test(GAS_URL);
}

function gasRpc(token, fn, args, isRead) {
  if (!gasReady()) {
    return Promise.reject(gasError('The app is not connected to its server yet. Set GAS_URL in js/config.js.'));
  }
  var limit = isRead ? GAS_TIMEOUT_MS.read : GAS_TIMEOUT_MS.write;
  var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  var timedOut = false;
  var timer = setTimeout(function () {
    timedOut = true;
    if (ctrl) ctrl.abort();
  }, limit);
  var body = JSON.stringify({ token: token || '', fn: String(fn), args: Array.isArray(args) ? args : [] });
  var done = function () { clearTimeout(timer); };

  return fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: body,
    credentials: 'omit',
    redirect: 'follow',
    cache: 'no-store',
    signal: ctrl ? ctrl.signal : undefined
  })
    .then(function (res) {
      if (res.status === 429 || res.status >= 500) {
        throw gasError('A server error occurred (HTTP ' + res.status + '). Please try again.');
      }
      if (!res.ok) {
        throw gasError('The server refused the request (HTTP ' + res.status + '). Check GAS_URL and the web app access.');
      }
      return res.text();
    })
    .then(function (text) {
      var reply;
      try {
        reply = JSON.parse(text);
      } catch (e) {
        throw gasError('A server error occurred: the reply could not be read.');
      }
      if (!reply || reply.success !== true) {
        throw gasError((reply && reply.message) || 'A server error occurred: the reply was empty.');
      }
      return reply.data;
    })
    .catch(function (err) {
      if (err && err.gas) throw err;
      if (timedOut) throw gasError('The request timed out after ' + Math.round(limit / 1000) + ' seconds. Please try again.');
      throw gasError('NetworkError: the server could not be reached. Check your connection.');
    })
    .then(function (data) {
      done();
      return data;
    }, function (err) {
      done();
      throw err;
    });
}
