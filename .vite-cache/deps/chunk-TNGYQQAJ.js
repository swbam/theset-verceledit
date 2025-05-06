import {
  Primitive
} from "./chunk-CMHHY5YU.js";
import {
  require_jsx_runtime
} from "./chunk-Z6BYPTQQ.js";
import {
  require_react
} from "./chunk-7L4PC2P2.js";
import {
  __toESM
} from "./chunk-4B2QHNJT.js";

// node_modules/.pnpm/@radix-ui+react-visually-hidden@1.2.0_@types+react-dom@18.3.6_@types+react@18.3.20__@ty_4d21c19f7cece061e093055495114f72/node_modules/@radix-ui/react-visually-hidden/dist/index.mjs
var React = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var VISUALLY_HIDDEN_STYLES = Object.freeze({
  // See: https://github.com/twbs/bootstrap/blob/main/scss/mixins/_visually-hidden.scss
  position: "absolute",
  border: 0,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  wordWrap: "normal"
});
var NAME = "VisuallyHidden";
var VisuallyHidden = React.forwardRef(
  (props, forwardedRef) => {
    return (0, import_jsx_runtime.jsx)(
      Primitive.span,
      {
        ...props,
        ref: forwardedRef,
        style: { ...VISUALLY_HIDDEN_STYLES, ...props.style }
      }
    );
  }
);
VisuallyHidden.displayName = NAME;
var Root = VisuallyHidden;

export {
  VISUALLY_HIDDEN_STYLES,
  Root
};
//# sourceMappingURL=chunk-TNGYQQAJ.js.map
