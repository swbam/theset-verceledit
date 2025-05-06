import {
  createClient
} from "./chunk-WLENEDMN.js";
import "./chunk-VYUHMQ3I.js";
import {
  __commonJS,
  __toESM
} from "./chunk-4B2QHNJT.js";

// node_modules/.pnpm/cookie@1.0.2/node_modules/cookie/dist/index.js
var require_dist = __commonJS({
  "node_modules/.pnpm/cookie@1.0.2/node_modules/cookie/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parse = parse3;
    exports.serialize = serialize3;
    var cookieNameRegExp = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/;
    var cookieValueRegExp = /^[\u0021-\u003A\u003C-\u007E]*$/;
    var domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    var pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
    var __toString = Object.prototype.toString;
    var NullObject = (() => {
      const C = function() {
      };
      C.prototype = /* @__PURE__ */ Object.create(null);
      return C;
    })();
    function parse3(str, options) {
      const obj = new NullObject();
      const len = str.length;
      if (len < 2)
        return obj;
      const dec = (options == null ? void 0 : options.decode) || decode;
      let index = 0;
      do {
        const eqIdx = str.indexOf("=", index);
        if (eqIdx === -1)
          break;
        const colonIdx = str.indexOf(";", index);
        const endIdx = colonIdx === -1 ? len : colonIdx;
        if (eqIdx > endIdx) {
          index = str.lastIndexOf(";", eqIdx - 1) + 1;
          continue;
        }
        const keyStartIdx = startIndex(str, index, eqIdx);
        const keyEndIdx = endIndex(str, eqIdx, keyStartIdx);
        const key = str.slice(keyStartIdx, keyEndIdx);
        if (obj[key] === void 0) {
          let valStartIdx = startIndex(str, eqIdx + 1, endIdx);
          let valEndIdx = endIndex(str, endIdx, valStartIdx);
          const value = dec(str.slice(valStartIdx, valEndIdx));
          obj[key] = value;
        }
        index = endIdx + 1;
      } while (index < len);
      return obj;
    }
    function startIndex(str, index, max) {
      do {
        const code = str.charCodeAt(index);
        if (code !== 32 && code !== 9)
          return index;
      } while (++index < max);
      return max;
    }
    function endIndex(str, index, min) {
      while (index > min) {
        const code = str.charCodeAt(--index);
        if (code !== 32 && code !== 9)
          return index + 1;
      }
      return min;
    }
    function serialize3(name, val, options) {
      const enc = (options == null ? void 0 : options.encode) || encodeURIComponent;
      if (!cookieNameRegExp.test(name)) {
        throw new TypeError(`argument name is invalid: ${name}`);
      }
      const value = enc(val);
      if (!cookieValueRegExp.test(value)) {
        throw new TypeError(`argument val is invalid: ${val}`);
      }
      let str = name + "=" + value;
      if (!options)
        return str;
      if (options.maxAge !== void 0) {
        if (!Number.isInteger(options.maxAge)) {
          throw new TypeError(`option maxAge is invalid: ${options.maxAge}`);
        }
        str += "; Max-Age=" + options.maxAge;
      }
      if (options.domain) {
        if (!domainValueRegExp.test(options.domain)) {
          throw new TypeError(`option domain is invalid: ${options.domain}`);
        }
        str += "; Domain=" + options.domain;
      }
      if (options.path) {
        if (!pathValueRegExp.test(options.path)) {
          throw new TypeError(`option path is invalid: ${options.path}`);
        }
        str += "; Path=" + options.path;
      }
      if (options.expires) {
        if (!isDate(options.expires) || !Number.isFinite(options.expires.valueOf())) {
          throw new TypeError(`option expires is invalid: ${options.expires}`);
        }
        str += "; Expires=" + options.expires.toUTCString();
      }
      if (options.httpOnly) {
        str += "; HttpOnly";
      }
      if (options.secure) {
        str += "; Secure";
      }
      if (options.partitioned) {
        str += "; Partitioned";
      }
      if (options.priority) {
        const priority = typeof options.priority === "string" ? options.priority.toLowerCase() : void 0;
        switch (priority) {
          case "low":
            str += "; Priority=Low";
            break;
          case "medium":
            str += "; Priority=Medium";
            break;
          case "high":
            str += "; Priority=High";
            break;
          default:
            throw new TypeError(`option priority is invalid: ${options.priority}`);
        }
      }
      if (options.sameSite) {
        const sameSite = typeof options.sameSite === "string" ? options.sameSite.toLowerCase() : options.sameSite;
        switch (sameSite) {
          case true:
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError(`option sameSite is invalid: ${options.sameSite}`);
        }
      }
      return str;
    }
    function decode(str) {
      if (str.indexOf("%") === -1)
        return str;
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str;
      }
    }
    function isDate(val) {
      return __toString.call(val) === "[object Date]";
    }
  }
});

// node_modules/.pnpm/@supabase+ssr@0.6.1_@supabase+supabase-js@2.49.4/node_modules/@supabase/ssr/dist/module/version.js
var VERSION = "0.6.1";

// node_modules/.pnpm/@supabase+ssr@0.6.1_@supabase+supabase-js@2.49.4/node_modules/@supabase/ssr/dist/module/utils/helpers.js
var import_cookie = __toESM(require_dist());
var parse = import_cookie.parse;
var serialize = import_cookie.serialize;
function parseCookieHeader(header) {
  const parsed = (0, import_cookie.parse)(header);
  return Object.keys(parsed ?? {}).map((name) => ({
    name,
    value: parsed[name]
  }));
}
function serializeCookieHeader(name, value, options) {
  return (0, import_cookie.serialize)(name, value, options);
}
function isBrowser() {
  return typeof window !== "undefined" && typeof window.document !== "undefined";
}

// node_modules/.pnpm/@supabase+ssr@0.6.1_@supabase+supabase-js@2.49.4/node_modules/@supabase/ssr/dist/module/utils/constants.js
var DEFAULT_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax",
  httpOnly: false,
  // https://developer.chrome.com/blog/cookie-max-age-expires
  // https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html#name-cookie-lifetime-limits
  maxAge: 400 * 24 * 60 * 60
};

// node_modules/.pnpm/@supabase+ssr@0.6.1_@supabase+supabase-js@2.49.4/node_modules/@supabase/ssr/dist/module/utils/chunker.js
var MAX_CHUNK_SIZE = 3180;
var CHUNK_LIKE_REGEX = /^(.*)[.](0|[1-9][0-9]*)$/;
function isChunkLike(cookieName, key) {
  if (cookieName === key) {
    return true;
  }
  const chunkLike = cookieName.match(CHUNK_LIKE_REGEX);
  if (chunkLike && chunkLike[1] === key) {
    return true;
  }
  return false;
}
function createChunks(key, value, chunkSize) {
  const resolvedChunkSize = chunkSize ?? MAX_CHUNK_SIZE;
  let encodedValue = encodeURIComponent(value);
  if (encodedValue.length <= resolvedChunkSize) {
    return [{ name: key, value }];
  }
  const chunks = [];
  while (encodedValue.length > 0) {
    let encodedChunkHead = encodedValue.slice(0, resolvedChunkSize);
    const lastEscapePos = encodedChunkHead.lastIndexOf("%");
    if (lastEscapePos > resolvedChunkSize - 3) {
      encodedChunkHead = encodedChunkHead.slice(0, lastEscapePos);
    }
    let valueHead = "";
    while (encodedChunkHead.length > 0) {
      try {
        valueHead = decodeURIComponent(encodedChunkHead);
        break;
      } catch (error) {
        if (error instanceof URIError && encodedChunkHead.at(-3) === "%" && encodedChunkHead.length > 3) {
          encodedChunkHead = encodedChunkHead.slice(0, encodedChunkHead.length - 3);
        } else {
          throw error;
        }
      }
    }
    chunks.push(valueHead);
    encodedValue = encodedValue.slice(encodedChunkHead.length);
  }
  return chunks.map((value2, i) => ({ name: `${key}.${i}`, value: value2 }));
}
async function combineChunks(key, retrieveChunk) {
  const value = await retrieveChunk(key);
  if (value) {
    return value;
  }
  let values = [];
  for (let i = 0; ; i++) {
    const chunkName = `${key}.${i}`;
    const chunk = await retrieveChunk(chunkName);
    if (!chunk) {
      break;
    }
    values.push(chunk);
  }
  if (values.length > 0) {
    return values.join("");
  }
  return null;
}
async function deleteChunks(key, retrieveChunk, removeChunk) {
  const value = await retrieveChunk(key);
  if (value) {
    await removeChunk(key);
  }
  for (let i = 0; ; i++) {
    const chunkName = `${key}.${i}`;
    const chunk = await retrieveChunk(chunkName);
    if (!chunk) {
      break;
    }
    await removeChunk(chunkName);
  }
}

// node_modules/.pnpm/@supabase+ssr@0.6.1_@supabase+supabase-js@2.49.4/node_modules/@supabase/ssr/dist/module/utils/base64url.js
var TO_BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".split("");
var IGNORE_BASE64URL = " 	\n\r=".split("");
var FROM_BASE64URL = (() => {
  const charMap = new Array(128);
  for (let i = 0; i < charMap.length; i += 1) {
    charMap[i] = -1;
  }
  for (let i = 0; i < IGNORE_BASE64URL.length; i += 1) {
    charMap[IGNORE_BASE64URL[i].charCodeAt(0)] = -2;
  }
  for (let i = 0; i < TO_BASE64URL.length; i += 1) {
    charMap[TO_BASE64URL[i].charCodeAt(0)] = i;
  }
  return charMap;
})();
function stringToBase64URL(str) {
  const base64 = [];
  let queue = 0;
  let queuedBits = 0;
  const emitter = (byte) => {
    queue = queue << 8 | byte;
    queuedBits += 8;
    while (queuedBits >= 6) {
      const pos = queue >> queuedBits - 6 & 63;
      base64.push(TO_BASE64URL[pos]);
      queuedBits -= 6;
    }
  };
  stringToUTF8(str, emitter);
  if (queuedBits > 0) {
    queue = queue << 6 - queuedBits;
    queuedBits = 6;
    while (queuedBits >= 6) {
      const pos = queue >> queuedBits - 6 & 63;
      base64.push(TO_BASE64URL[pos]);
      queuedBits -= 6;
    }
  }
  return base64.join("");
}
function stringFromBase64URL(str) {
  const conv = [];
  const emit = (codepoint) => {
    conv.push(String.fromCodePoint(codepoint));
  };
  const state = {
    utf8seq: 0,
    codepoint: 0
  };
  let queue = 0;
  let queuedBits = 0;
  for (let i = 0; i < str.length; i += 1) {
    const codepoint = str.charCodeAt(i);
    const bits = FROM_BASE64URL[codepoint];
    if (bits > -1) {
      queue = queue << 6 | bits;
      queuedBits += 6;
      while (queuedBits >= 8) {
        stringFromUTF8(queue >> queuedBits - 8 & 255, state, emit);
        queuedBits -= 8;
      }
    } else if (bits === -2) {
      continue;
    } else {
      throw new Error(`Invalid Base64-URL character "${str.at(i)}" at position ${i}`);
    }
  }
  return conv.join("");
}
function codepointToUTF8(codepoint, emit) {
  if (codepoint <= 127) {
    emit(codepoint);
    return;
  } else if (codepoint <= 2047) {
    emit(192 | codepoint >> 6);
    emit(128 | codepoint & 63);
    return;
  } else if (codepoint <= 65535) {
    emit(224 | codepoint >> 12);
    emit(128 | codepoint >> 6 & 63);
    emit(128 | codepoint & 63);
    return;
  } else if (codepoint <= 1114111) {
    emit(240 | codepoint >> 18);
    emit(128 | codepoint >> 12 & 63);
    emit(128 | codepoint >> 6 & 63);
    emit(128 | codepoint & 63);
    return;
  }
  throw new Error(`Unrecognized Unicode codepoint: ${codepoint.toString(16)}`);
}
function stringToUTF8(str, emit) {
  for (let i = 0; i < str.length; i += 1) {
    let codepoint = str.charCodeAt(i);
    if (codepoint > 55295 && codepoint <= 56319) {
      const highSurrogate = (codepoint - 55296) * 1024 & 65535;
      const lowSurrogate = str.charCodeAt(i + 1) - 56320 & 65535;
      codepoint = (lowSurrogate | highSurrogate) + 65536;
      i += 1;
    }
    codepointToUTF8(codepoint, emit);
  }
}
function stringFromUTF8(byte, state, emit) {
  if (state.utf8seq === 0) {
    if (byte <= 127) {
      emit(byte);
      return;
    }
    for (let leadingBit = 1; leadingBit < 6; leadingBit += 1) {
      if ((byte >> 7 - leadingBit & 1) === 0) {
        state.utf8seq = leadingBit;
        break;
      }
    }
    if (state.utf8seq === 2) {
      state.codepoint = byte & 31;
    } else if (state.utf8seq === 3) {
      state.codepoint = byte & 15;
    } else if (state.utf8seq === 4) {
      state.codepoint = byte & 7;
    } else {
      throw new Error("Invalid UTF-8 sequence");
    }
    state.utf8seq -= 1;
  } else if (state.utf8seq > 0) {
    if (byte <= 127) {
      throw new Error("Invalid UTF-8 sequence");
    }
    state.codepoint = state.codepoint << 6 | byte & 63;
    state.utf8seq -= 1;
    if (state.utf8seq === 0) {
      emit(state.codepoint);
    }
  }
}

// node_modules/.pnpm/@supabase+ssr@0.6.1_@supabase+supabase-js@2.49.4/node_modules/@supabase/ssr/dist/module/cookies.js
var import_cookie2 = __toESM(require_dist());
var BASE64_PREFIX = "base64-";
function createStorageFromOptions(options, isServerClient) {
  const cookies = options.cookies ?? null;
  const cookieEncoding = options.cookieEncoding;
  const setItems = {};
  const removedItems = {};
  let getAll;
  let setAll;
  if (cookies) {
    if ("get" in cookies) {
      const getWithHints = async (keyHints) => {
        const chunkNames = keyHints.flatMap((keyHint) => [
          keyHint,
          ...Array.from({ length: 5 }).map((_, i) => `${keyHint}.${i}`)
        ]);
        const chunks = [];
        for (let i = 0; i < chunkNames.length; i += 1) {
          const value = await cookies.get(chunkNames[i]);
          if (!value && typeof value !== "string") {
            continue;
          }
          chunks.push({ name: chunkNames[i], value });
        }
        return chunks;
      };
      getAll = async (keyHints) => await getWithHints(keyHints);
      if ("set" in cookies && "remove" in cookies) {
        setAll = async (setCookies) => {
          for (let i = 0; i < setCookies.length; i += 1) {
            const { name, value, options: options2 } = setCookies[i];
            if (value) {
              await cookies.set(name, value, options2);
            } else {
              await cookies.remove(name, options2);
            }
          }
        };
      } else if (isServerClient) {
        setAll = async () => {
          console.warn("@supabase/ssr: createServerClient was configured without set and remove cookie methods, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness. Consider switching to the getAll and setAll cookie methods instead of get, set and remove which are deprecated and can be difficult to use correctly.");
        };
      } else {
        throw new Error("@supabase/ssr: createBrowserClient requires configuring a getAll and setAll cookie method (deprecated: alternatively both get, set and remove can be used)");
      }
    } else if ("getAll" in cookies) {
      getAll = async () => await cookies.getAll();
      if ("setAll" in cookies) {
        setAll = cookies.setAll;
      } else if (isServerClient) {
        setAll = async () => {
          console.warn("@supabase/ssr: createServerClient was configured without the setAll cookie method, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness.");
        };
      } else {
        throw new Error("@supabase/ssr: createBrowserClient requires configuring both getAll and setAll cookie methods (deprecated: alternatively both get, set and remove can be used)");
      }
    } else {
      throw new Error(`@supabase/ssr: ${isServerClient ? "createServerClient" : "createBrowserClient"} requires configuring getAll and setAll cookie methods (deprecated: alternatively use get, set and remove).${isBrowser() ? " As this is called in a browser runtime, consider removing the cookies option object to use the document.cookie API automatically." : ""}`);
    }
  } else if (!isServerClient && isBrowser()) {
    const noHintGetAll = () => {
      const parsed = (0, import_cookie2.parse)(document.cookie);
      return Object.keys(parsed).map((name) => ({
        name,
        value: parsed[name] ?? ""
      }));
    };
    getAll = () => noHintGetAll();
    setAll = (setCookies) => {
      setCookies.forEach(({ name, value, options: options2 }) => {
        document.cookie = (0, import_cookie2.serialize)(name, value, options2);
      });
    };
  } else if (isServerClient) {
    throw new Error("@supabase/ssr: createServerClient must be initialized with cookie options that specify getAll and setAll functions (deprecated, not recommended: alternatively use get, set and remove)");
  } else {
    getAll = () => {
      return [];
    };
    setAll = () => {
      throw new Error("@supabase/ssr: createBrowserClient in non-browser runtimes (including Next.js pre-rendering mode) was not initialized cookie options that specify getAll and setAll functions (deprecated: alternatively use get, set and remove), but they were needed");
    };
  }
  if (!isServerClient) {
    return {
      getAll,
      // for type consistency
      setAll,
      // for type consistency
      setItems,
      // for type consistency
      removedItems,
      // for type consistency
      storage: {
        isServer: false,
        getItem: async (key) => {
          const allCookies = await getAll([key]);
          const chunkedCookie = await combineChunks(key, async (chunkName) => {
            const cookie = (allCookies == null ? void 0 : allCookies.find(({ name }) => name === chunkName)) || null;
            if (!cookie) {
              return null;
            }
            return cookie.value;
          });
          if (!chunkedCookie) {
            return null;
          }
          let decoded = chunkedCookie;
          if (chunkedCookie.startsWith(BASE64_PREFIX)) {
            decoded = stringFromBase64URL(chunkedCookie.substring(BASE64_PREFIX.length));
          }
          return decoded;
        },
        setItem: async (key, value) => {
          const allCookies = await getAll([key]);
          const cookieNames = (allCookies == null ? void 0 : allCookies.map(({ name }) => name)) || [];
          const removeCookies = new Set(cookieNames.filter((name) => isChunkLike(name, key)));
          let encoded = value;
          if (cookieEncoding === "base64url") {
            encoded = BASE64_PREFIX + stringToBase64URL(value);
          }
          const setCookies = createChunks(key, encoded);
          setCookies.forEach(({ name }) => {
            removeCookies.delete(name);
          });
          const removeCookieOptions = {
            ...DEFAULT_COOKIE_OPTIONS,
            ...options == null ? void 0 : options.cookieOptions,
            maxAge: 0
          };
          const setCookieOptions = {
            ...DEFAULT_COOKIE_OPTIONS,
            ...options == null ? void 0 : options.cookieOptions,
            maxAge: DEFAULT_COOKIE_OPTIONS.maxAge
          };
          delete removeCookieOptions.name;
          delete setCookieOptions.name;
          const allToSet = [
            ...[...removeCookies].map((name) => ({
              name,
              value: "",
              options: removeCookieOptions
            })),
            ...setCookies.map(({ name, value: value2 }) => ({
              name,
              value: value2,
              options: setCookieOptions
            }))
          ];
          if (allToSet.length > 0) {
            await setAll(allToSet);
          }
        },
        removeItem: async (key) => {
          const allCookies = await getAll([key]);
          const cookieNames = (allCookies == null ? void 0 : allCookies.map(({ name }) => name)) || [];
          const removeCookies = cookieNames.filter((name) => isChunkLike(name, key));
          const removeCookieOptions = {
            ...DEFAULT_COOKIE_OPTIONS,
            ...options == null ? void 0 : options.cookieOptions,
            maxAge: 0
          };
          delete removeCookieOptions.name;
          if (removeCookies.length > 0) {
            await setAll(removeCookies.map((name) => ({
              name,
              value: "",
              options: removeCookieOptions
            })));
          }
        }
      }
    };
  }
  return {
    getAll,
    setAll,
    setItems,
    removedItems,
    storage: {
      // to signal to the libraries that these cookies are
      // coming from a server environment and their value
      // should not be trusted
      isServer: true,
      getItem: async (key) => {
        if (typeof setItems[key] === "string") {
          return setItems[key];
        }
        if (removedItems[key]) {
          return null;
        }
        const allCookies = await getAll([key]);
        const chunkedCookie = await combineChunks(key, async (chunkName) => {
          const cookie = (allCookies == null ? void 0 : allCookies.find(({ name }) => name === chunkName)) || null;
          if (!cookie) {
            return null;
          }
          return cookie.value;
        });
        if (!chunkedCookie) {
          return null;
        }
        let decoded = chunkedCookie;
        if (typeof chunkedCookie === "string" && chunkedCookie.startsWith(BASE64_PREFIX)) {
          decoded = stringFromBase64URL(chunkedCookie.substring(BASE64_PREFIX.length));
        }
        return decoded;
      },
      setItem: async (key, value) => {
        if (key.endsWith("-code-verifier")) {
          await applyServerStorage({
            getAll,
            setAll,
            // pretend only that the code verifier was set
            setItems: { [key]: value },
            // pretend that nothing was removed
            removedItems: {}
          }, {
            cookieOptions: (options == null ? void 0 : options.cookieOptions) ?? null,
            cookieEncoding
          });
        }
        setItems[key] = value;
        delete removedItems[key];
      },
      removeItem: async (key) => {
        delete setItems[key];
        removedItems[key] = true;
      }
    }
  };
}
async function applyServerStorage({ getAll, setAll, setItems, removedItems }, options) {
  const cookieEncoding = options.cookieEncoding;
  const cookieOptions = options.cookieOptions ?? null;
  const allCookies = await getAll([
    ...setItems ? Object.keys(setItems) : [],
    ...removedItems ? Object.keys(removedItems) : []
  ]);
  const cookieNames = (allCookies == null ? void 0 : allCookies.map(({ name }) => name)) || [];
  const removeCookies = Object.keys(removedItems).flatMap((itemName) => {
    return cookieNames.filter((name) => isChunkLike(name, itemName));
  });
  const setCookies = Object.keys(setItems).flatMap((itemName) => {
    const removeExistingCookiesForItem = new Set(cookieNames.filter((name) => isChunkLike(name, itemName)));
    let encoded = setItems[itemName];
    if (cookieEncoding === "base64url") {
      encoded = BASE64_PREFIX + stringToBase64URL(encoded);
    }
    const chunks = createChunks(itemName, encoded);
    chunks.forEach((chunk) => {
      removeExistingCookiesForItem.delete(chunk.name);
    });
    removeCookies.push(...removeExistingCookiesForItem);
    return chunks;
  });
  const removeCookieOptions = {
    ...DEFAULT_COOKIE_OPTIONS,
    ...cookieOptions,
    maxAge: 0
  };
  const setCookieOptions = {
    ...DEFAULT_COOKIE_OPTIONS,
    ...cookieOptions,
    maxAge: DEFAULT_COOKIE_OPTIONS.maxAge
  };
  delete removeCookieOptions.name;
  delete setCookieOptions.name;
  await setAll([
    ...removeCookies.map((name) => ({
      name,
      value: "",
      options: removeCookieOptions
    })),
    ...setCookies.map(({ name, value }) => ({
      name,
      value,
      options: setCookieOptions
    }))
  ]);
}

// node_modules/.pnpm/@supabase+ssr@0.6.1_@supabase+supabase-js@2.49.4/node_modules/@supabase/ssr/dist/module/createBrowserClient.js
var cachedBrowserClient;
function createBrowserClient(supabaseUrl, supabaseKey, options) {
  var _a, _b;
  const shouldUseSingleton = (options == null ? void 0 : options.isSingleton) === true || (!options || !("isSingleton" in options)) && isBrowser();
  if (shouldUseSingleton && cachedBrowserClient) {
    return cachedBrowserClient;
  }
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(`@supabase/ssr: Your project's URL and API key are required to create a Supabase client!

Check your Supabase project's API settings to find these values

https://supabase.com/dashboard/project/_/settings/api`);
  }
  const { storage } = createStorageFromOptions({
    ...options,
    cookieEncoding: (options == null ? void 0 : options.cookieEncoding) ?? "base64url"
  }, false);
  const client = createClient(supabaseUrl, supabaseKey, {
    ...options,
    global: {
      ...options == null ? void 0 : options.global,
      headers: {
        ...(_a = options == null ? void 0 : options.global) == null ? void 0 : _a.headers,
        "X-Client-Info": `supabase-ssr/${VERSION} createBrowserClient`
      }
    },
    auth: {
      ...options == null ? void 0 : options.auth,
      ...((_b = options == null ? void 0 : options.cookieOptions) == null ? void 0 : _b.name) ? { storageKey: options.cookieOptions.name } : null,
      flowType: "pkce",
      autoRefreshToken: isBrowser(),
      detectSessionInUrl: isBrowser(),
      persistSession: true,
      storage
    }
  });
  if (shouldUseSingleton) {
    cachedBrowserClient = client;
  }
  return client;
}

// node_modules/.pnpm/@supabase+ssr@0.6.1_@supabase+supabase-js@2.49.4/node_modules/@supabase/ssr/dist/module/createServerClient.js
function createServerClient(supabaseUrl, supabaseKey, options) {
  var _a, _b;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(`Your project's URL and Key are required to create a Supabase client!

Check your Supabase project's API settings to find these values

https://supabase.com/dashboard/project/_/settings/api`);
  }
  const { storage, getAll, setAll, setItems, removedItems } = createStorageFromOptions({
    ...options,
    cookieEncoding: (options == null ? void 0 : options.cookieEncoding) ?? "base64url"
  }, true);
  const client = createClient(supabaseUrl, supabaseKey, {
    ...options,
    global: {
      ...options == null ? void 0 : options.global,
      headers: {
        ...(_a = options == null ? void 0 : options.global) == null ? void 0 : _a.headers,
        "X-Client-Info": `supabase-ssr/${VERSION} createServerClient`
      }
    },
    auth: {
      ...((_b = options == null ? void 0 : options.cookieOptions) == null ? void 0 : _b.name) ? { storageKey: options.cookieOptions.name } : null,
      ...options == null ? void 0 : options.auth,
      flowType: "pkce",
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
      storage
    }
  });
  client.auth.onAuthStateChange(async (event) => {
    const hasStorageChanges = Object.keys(setItems).length > 0 || Object.keys(removedItems).length > 0;
    if (hasStorageChanges && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED" || event === "PASSWORD_RECOVERY" || event === "SIGNED_OUT" || event === "MFA_CHALLENGE_VERIFIED")) {
      await applyServerStorage({ getAll, setAll, setItems, removedItems }, {
        cookieOptions: (options == null ? void 0 : options.cookieOptions) ?? null,
        cookieEncoding: (options == null ? void 0 : options.cookieEncoding) ?? "base64url"
      });
    }
  });
  return client;
}
export {
  DEFAULT_COOKIE_OPTIONS,
  MAX_CHUNK_SIZE,
  codepointToUTF8,
  combineChunks,
  createBrowserClient,
  createChunks,
  createServerClient,
  deleteChunks,
  isBrowser,
  isChunkLike,
  parse,
  parseCookieHeader,
  serialize,
  serializeCookieHeader,
  stringFromBase64URL,
  stringFromUTF8,
  stringToBase64URL,
  stringToUTF8
};
//# sourceMappingURL=@supabase_ssr.js.map
