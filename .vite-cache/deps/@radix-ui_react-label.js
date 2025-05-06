"use client";
import {
  Primitive
} from "./chunk-CMHHY5YU.js";
import "./chunk-34W74XJ5.js";
import "./chunk-577H3BKK.js";
import {
  require_jsx_runtime
} from "./chunk-Z6BYPTQQ.js";
import {
  require_react
} from "./chunk-7L4PC2P2.js";
import {
  __toESM
} from "./chunk-4B2QHNJT.js";

// node_modules/.pnpm/@radix-ui+react-label@2.1.4_@types+react-dom@18.3.6_@types+react@18.3.20__@types+react@_1353575bda139f780bd465780521e267/node_modules/@radix-ui/react-label/dist/index.mjs
var React = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var NAME = "Label";
var Label = React.forwardRef((props, forwardedRef) => {
  return (0, import_jsx_runtime.jsx)(
    Primitive.label,
    {
      ...props,
      ref: forwardedRef,
      onMouseDown: (event) => {
        var _a;
        const target = event.target;
        if (target.closest("button, input, select, textarea")) return;
        (_a = props.onMouseDown) == null ? void 0 : _a.call(props, event);
        if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
      }
    }
  );
});
Label.displayName = NAME;
var Root = Label;
export {
  Label,
  Root
};
//# sourceMappingURL=@radix-ui_react-label.js.map
