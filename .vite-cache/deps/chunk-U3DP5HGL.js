import {
  require_jsx_runtime
} from "./chunk-Z6BYPTQQ.js";
import {
  require_react
} from "./chunk-7L4PC2P2.js";
import {
  __toESM
} from "./chunk-4B2QHNJT.js";

// node_modules/.pnpm/@radix-ui+react-direction@1.1.1_@types+react@18.3.20_react@18.3.1/node_modules/@radix-ui/react-direction/dist/index.mjs
var React = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var DirectionContext = React.createContext(void 0);
function useDirection(localDir) {
  const globalDir = React.useContext(DirectionContext);
  return localDir || globalDir || "ltr";
}

export {
  useDirection
};
//# sourceMappingURL=chunk-U3DP5HGL.js.map
