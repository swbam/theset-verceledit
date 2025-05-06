import {
  createSlot
} from "./chunk-34W74XJ5.js";
import {
  require_react_dom
} from "./chunk-577H3BKK.js";
import {
  require_jsx_runtime
} from "./chunk-Z6BYPTQQ.js";
import {
  require_react
} from "./chunk-7L4PC2P2.js";
import {
  __toESM
} from "./chunk-4B2QHNJT.js";

// node_modules/.pnpm/@radix-ui+react-primitive@2.1.0_@types+react-dom@18.3.6_@types+react@18.3.20__@types+re_2db60265c3471e023a198105e60a5157/node_modules/@radix-ui/react-primitive/dist/index.mjs
var React = __toESM(require_react(), 1);
var ReactDOM = __toESM(require_react_dom(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var NODES = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul"
];
var Primitive = NODES.reduce((primitive, node) => {
  const Slot = createSlot(`Primitive.${node}`);
  const Node = React.forwardRef((props, forwardedRef) => {
    const { asChild, ...primitiveProps } = props;
    const Comp = asChild ? Slot : node;
    if (typeof window !== "undefined") {
      window[Symbol.for("radix-ui")] = true;
    }
    return (0, import_jsx_runtime.jsx)(Comp, { ...primitiveProps, ref: forwardedRef });
  });
  Node.displayName = `Primitive.${node}`;
  return { ...primitive, [node]: Node };
}, {});
function dispatchDiscreteCustomEvent(target, event) {
  if (target) ReactDOM.flushSync(() => target.dispatchEvent(event));
}

export {
  Primitive,
  dispatchDiscreteCustomEvent
};
//# sourceMappingURL=chunk-CMHHY5YU.js.map
