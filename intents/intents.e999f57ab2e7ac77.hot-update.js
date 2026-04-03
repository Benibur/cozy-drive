"use strict";
self["webpackHotUpdatecozy_drive"]("intents", {
"./src/modules/views/OnlyOffice/useCozyBridge.js": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  useCozyBridge: () => (useCozyBridge)
});
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/index.js");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* ESM import */var _lib_cozy_bridge__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/lib/cozy-bridge/index.js");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");
var _s = $RefreshSig$();


/**
 * React hook wrapping CozyBridge lifecycle with intent state.
 *
 * Creates a CozyBridge instance on mount, registers handlers for:
 * - AI_TEXT_ASSISTANT: opens Scribe popover (or closes panel if panel is open)
 * - TOGGLE_SCRIBE_PANEL: toggles the side panel open/closed
 *
 * @param {string[]} allowedOrigins - Stable array of allowed origins.
 *   In dev: ['*']. In prod: derive from instance URL and OO server URL.
 *   Must be memoized by the parent to avoid unnecessary re-renders.
 * @param {object} [options]
 * @param {Function} [options.onTogglePanel] - Callback to toggle the panel (from ScribeContext)
 * @param {boolean} [options.isPanelOpen] - Current panel state; when true, AI_TEXT_ASSISTANT
 *   closes the panel instead of opening the popover (single Ctrl+Shift+I close)
 * @param {Function} [options.onSelectionChanged] - Called when plugin reports selection change
 * @returns {{ pendingIntent: object|null, respond: Function }}
 */ function useCozyBridge(allowedOrigins) {
    let { onTogglePanel, isPanelOpen, onSelectionChanged } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    _s();
    const [pendingIntent, setPendingIntent] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
    const bridgeRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
    const respondRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
    const togglePanelRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(onTogglePanel);
    const isPanelOpenRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(isPanelOpen);
    const onSelectionChangedRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(onSelectionChanged);
    // Keep refs current to avoid stale closures in bridge handlers
    (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(()=>{
        togglePanelRef.current = onTogglePanel;
    }, [
        onTogglePanel
    ]);
    (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(()=>{
        isPanelOpenRef.current = isPanelOpen;
    }, [
        isPanelOpen
    ]);
    (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(()=>{
        onSelectionChangedRef.current = onSelectionChanged;
    }, [
        onSelectionChanged
    ]);
    (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(()=>{
        const bridge = new _lib_cozy_bridge__WEBPACK_IMPORTED_MODULE_1__.CozyBridge(allowedOrigins);
        bridgeRef.current = bridge;
        bridge.onIntent('AI_TEXT_ASSISTANT', (intentMessage, respondFn)=>{
            // If panel is open, Ctrl+Shift+I should close the panel
            // instead of opening a popover
            if (isPanelOpenRef.current) {
                respondFn({
                    status: 'ok',
                    action: 'cancel',
                    data: {}
                });
                if (togglePanelRef.current) togglePanelRef.current();
                return;
            }
            setPendingIntent(intentMessage);
            respondRef.current = respondFn;
        });
        bridge.onIntent('TOGGLE_SCRIBE_PANEL', ()=>{
            if (togglePanelRef.current) togglePanelRef.current();
        });
        bridge.onIntent('SELECTION_CHANGED', (intentMessage)=>{
            console.log('[Scribe] SELECTION_CHANGED received', intentMessage.data);
            if (onSelectionChangedRef.current) {
                onSelectionChangedRef.current(intentMessage.data);
            }
        });
        return ()=>{
            bridge.destroy();
            bridgeRef.current = null;
            respondRef.current = null;
        };
    }, [
        allowedOrigins
    ]);
    const respond = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)((responsePayload)=>{
        if (!respondRef.current) {
            console.warn('[useCozyBridge] No pending intent to respond to');
            return;
        }
        respondRef.current(responsePayload);
        respondRef.current = null;
        setPendingIntent(null);
    }, []);
    return {
        pendingIntent,
        respond
    };
}
_s(useCozyBridge, "uMjbi2dmMi8HvQ+iJiH3Hs+LQY8=");

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),

},function(__webpack_require__) {
// webpack/runtime/get_full_hash
(() => {
__webpack_require__.h = () => ("77f40255c6b51663")
})();

}
);
//# sourceMappingURL=intents.e999f57ab2e7ac77.hot-update.js.map