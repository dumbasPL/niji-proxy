import 'dotenv/config';
import { Server } from "proxy-chain";

console.log("Starting... (hint: use DEBUG=1 to enable debug messages)");

const {
  LISTEN_HOST = "0.0.0.0",
  LISTEN_PORT = "8080",
  GOOD_HOST_REGEX,
  GOOD_PROXY,
  BAD_PROXY,
  DEBUG: ENV_DEBUG,
} = process.env;

/** @type {<T>(fn: () => T, message: string) => T} */
const TRY = (fn, message) => {
  try {
    return fn();
  } catch (error) {
    console.error(message);
    process.exit(1);
  }
}

/** @type {(condition: any, message: string, warn?: boolean) => void} */
const CHECK = (condition, message, warn) => {
  if (!condition) {
    if (warn === true) {
      console.warn(message);
      return;
    }
    console.error(message);
    process.exit(1);
  }
}

CHECK(!!GOOD_HOST_REGEX, "GOOD_HOST_REGEX is required");

const listenHost = LISTEN_HOST;
const listenPort = parseInt(LISTEN_PORT);
const goodHostRegex = TRY(() => new RegExp(GOOD_HOST_REGEX), "GOOD_HOST_REGEX must be a valid regular expression");
const goodProxy = TRY(() => new URL(GOOD_PROXY), "GOOD_PROXY must be a valid URL");
const badProxy = TRY(() => BAD_PROXY ? new URL(BAD_PROXY) : null, "BAD_PROXY must be a valid URL");

CHECK(listenPort >= 0 && listenPort <= 65535, "LISTEN_PORT must be a valid port number");
CHECK(!/(?<!\\)\./.test(goodHostRegex), "GOOD_HOST_REGEX contains unescaped dot (.) character(s) (aka. wildcards). Make sure this is intentional! If not, escape them with a backslash (\\)", true);
CHECK(/https?/.test(goodProxy.protocol), "GOOD_PROXY must be an HTTP or HTTPS proxy URL");

CHECK(badProxy != null, "BAD_PROXY is missing. Using direct connection instead", true);
if (badProxy) {
  CHECK(/https?/.test(badProxy.protocol), "BAD_PROXY must be an HTTP or HTTPS proxy URL");
  CHECK(badProxy.username || badProxy.password, "no authentication provided for BAD_PROXY. BAD_PROXY will be used without authentication", true);
}

const goodProxyHasAuth = !!(goodProxy.username || goodProxy.password);
if (goodProxyHasAuth) {
  console.warn("GOOD_PROXY will use the provided authentication and ignore any authentication provided by the client");
} else {
  console.warn("no authentication provided for GOOD_PROXY. GOOD_PROXY will use authentication from provided by the client");
}

const DEBUG = (...message) => {
  if (ENV_DEBUG && ENV_DEBUG !== "0" && ENV_DEBUG !== "false") {
    console.debug(...message);
  }
}

DEBUG('config', {
  listenHost,
  listenPort,
  goodHostRegex,
  goodProxy: goodProxy.href,
  badProxy: badProxy?.href ?? null,
  goodProxyHasAuth,
})

const server = new Server({
  host: listenHost,
  port: listenPort,
  prepareRequestFunction: ({ hostname, username, password, connectionId }) => {
    if (!goodHostRegex.test(hostname)) {
      DEBUG(`${connectionId}: ${hostname} used ${badProxy ? "bad proxy" : "direct connection"}`);
      return {
        requestAuthentication: false,
        upstreamProxyUrl: badProxy?.href ?? undefined,
      };
    }
    if (goodProxyHasAuth) {
      DEBUG(`${connectionId}: ${hostname} used good proxy with predefined authentication`);
      return {
        requestAuthentication: false,
        upstreamProxyUrl: goodProxy.href,
      };
    }
    if (!username && !password) {
      DEBUG(`${connectionId}: ${hostname} missing authentication`);
      return {
        requestAuthentication: true,
        failMsg: "No authentication provided",
      };
    }
    const proxyUrl = new URL(goodProxy.href);
    proxyUrl.username = username;
    proxyUrl.password = password;
    DEBUG(`${connectionId}: ${hostname} used good proxy with provided authentication ${username}:${password}`);
    return {
      requestAuthentication: false,
      upstreamProxyUrl: proxyUrl.href,
    };
  },
});

server.listen().then(() => {
  console.log(`Listening on ${server.host ?? '0.0.0.0'}:${server.port}`);
});

// ctrl+c handler
let closing = false;
async function close() {
  if (closing) {
    console.log('Forcing exit...');
    await server.close(true);
    process.exit(1);
  }

  console.log('Closing server...');
  closing = true;
  await server.close();
  process.exit(0);
}
process.on('SIGINT', close);
process.on('SIGTERM', close);

// unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown', error);
  process.exit(1);
});