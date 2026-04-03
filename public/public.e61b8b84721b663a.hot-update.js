"use strict";
self["webpackHotUpdatecozy_drive"]("public", {
"./src/modules/views/OnlyOffice/View.jsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  "default": () => (__WEBPACK_DEFAULT_EXPORT__)
});
/* ESM import */var core_js_modules_es_array_includes_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/core-js/modules/es.array.includes.js");
/* ESM import */var core_js_modules_es_array_includes_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_array_includes_js__WEBPACK_IMPORTED_MODULE_0__);
/* ESM import */var core_js_modules_es_error_cause_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./node_modules/core-js/modules/es.error.cause.js");
/* ESM import */var core_js_modules_es_error_cause_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_error_cause_js__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var prop_types__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__("./node_modules/prop-types/index.js");
/* ESM import */var prop_types__WEBPACK_IMPORTED_MODULE_19___default = /*#__PURE__*/__webpack_require__.n(prop_types__WEBPACK_IMPORTED_MODULE_19__);
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("./node_modules/react/index.js");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_3__);
/* ESM import */var cozy_flags__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__("./node_modules/cozy-flags/dist/index.browser.js");
/* ESM import */var cozy_ui_transpiled_react_Spinner__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__("./node_modules/cozy-ui/transpiled/react/Spinner/index.js");
/* ESM import */var cozy_ui_transpiled_react_providers_Breakpoints__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__("./node_modules/cozy-ui/transpiled/react/providers/Breakpoints/index.js");
/* ESM import */var _modules_views_OnlyOffice_Error__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__("./src/modules/views/OnlyOffice/Error.jsx");
/* ESM import */var _modules_views_OnlyOffice_OnlyOfficeAIAssistantPanel__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__("./src/modules/views/OnlyOffice/OnlyOfficeAIAssistantPanel.tsx");
/* ESM import */var _modules_views_OnlyOffice_OnlyOfficeProvider__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__("./src/modules/views/OnlyOffice/OnlyOfficeProvider.jsx");
/* ESM import */var _modules_views_OnlyOffice_ReadOnlyFab__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__("./src/modules/views/OnlyOffice/ReadOnlyFab.jsx");
/* ESM import */var _modules_views_OnlyOffice_Scribe_ScribeContext__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__("./src/modules/views/OnlyOffice/Scribe/ScribeContext.jsx");
/* ESM import */var _modules_views_OnlyOffice_Scribe_ScribePanel__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__("./src/modules/views/OnlyOffice/Scribe/ScribePanel.jsx");
/* ESM import */var _modules_views_OnlyOffice_Scribe_scribeConversion__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__("./src/modules/views/OnlyOffice/Scribe/scribeConversion.js");
/* ESM import */var _modules_views_OnlyOffice_Scribe_ScribeFloatingButton__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__("./src/modules/views/OnlyOffice/Scribe/ScribeFloatingButton.jsx");
/* ESM import */var _modules_views_OnlyOffice_Scribe_ScribePopover__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__("./src/modules/views/OnlyOffice/Scribe/ScribePopover.jsx");
/* ESM import */var _modules_views_OnlyOffice_config__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__("./src/modules/views/OnlyOffice/config.js");
/* ESM import */var _modules_views_OnlyOffice_helpers__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__("./src/modules/views/OnlyOffice/helpers.js");
/* ESM import */var _modules_views_OnlyOffice_useCozyBridge__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__("./src/modules/views/OnlyOffice/useCozyBridge.js");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");



var _s = $RefreshSig$();

















// Strip <p>...</p> wrapper when HTML is a single paragraph,
// so PasteHtml inserts inline without creating extra line breaks.
// Multi-paragraph, lists, headings etc. are left untouched.
const unwrapSingleParagraph = (html)=>{
    const match = html.match(/^<p>(.*)<\/p>$/s);
    if (match && !match[1].includes('<p>')) return match[1];
    return html;
};
const forceIframeHeight = (value)=>{
    const iframe = document.getElementsByName(_modules_views_OnlyOffice_config__WEBPACK_IMPORTED_MODULE_14__.FRAME_EDITOR_NAME)[0];
    if (iframe) iframe.style.height = value;
};
const View = (param)=>{
    let { id, apiUrl, docEditorConfig } = param;
    var _pendingIntent_data, _pendingIntent_data1, _pendingIntent_data2, _pendingIntent_data3, _pendingIntent_data4;
    _s();
    const [isError, setIsError] = (0,react__WEBPACK_IMPORTED_MODULE_3__.useState)(false);
    const { isEditorReady, isReadOnly, isTrashed } = (0,_modules_views_OnlyOffice_OnlyOfficeProvider__WEBPACK_IMPORTED_MODULE_7__.useOnlyOfficeContext)();
    const { isMobile, isDesktop } = (0,cozy_ui_transpiled_react_providers_Breakpoints__WEBPACK_IMPORTED_MODULE_17__["default"])();
    const isScribeEnabled = (0,cozy_flags__WEBPACK_IMPORTED_MODULE_4__["default"])('drive.scribe.enabled');
    const scribe = (0,_modules_views_OnlyOffice_Scribe_ScribeContext__WEBPACK_IMPORTED_MODULE_9__.useScribe)();
    const isPanelOpen = scribe ? scribe.isPanelOpen : false;
    const togglePanel = scribe ? scribe.togglePanel : undefined;
    const openPanel = scribe ? scribe.openPanel : undefined;
    const setCurrentSelection = scribe ? scribe.setCurrentSelection : undefined;
    const setPanelActions = scribe ? scribe.setPanelActions : undefined;
    // cozy-bridge: listen for Scribe intents from OO plugin
    // In dev, allow all origins. In production, derive from serverUrl/instance.
    const allowedOrigins = (0,react__WEBPACK_IMPORTED_MODULE_3__.useMemo)(()=>[
            '*'
        ], []) // TODO: restrict in production
    ;
    // Update selection in ScribeContext whenever the plugin reports a change
    const handleSelectionChanged = (0,react__WEBPACK_IMPORTED_MODULE_3__.useCallback)((data)=>{
        if (setCurrentSelection) {
            setCurrentSelection(data.text || null, data.html || null);
        }
    }, [
        setCurrentSelection
    ]);
    const { pendingIntent, respond } = (0,_modules_views_OnlyOffice_useCozyBridge__WEBPACK_IMPORTED_MODULE_16__.useCozyBridge)(allowedOrigins, {
        onTogglePanel: togglePanel,
        isPanelOpen,
        onSelectionChanged: handleSelectionChanged
    });
    const showFloatingZone = isScribeEnabled && !isPanelOpen;
    // Delay popover display by 100ms to allow double Ctrl+Shift+I to open panel
    // without a popover flash. If the panel opens during the delay, popover is skipped.
    const [popoverReady, setPopoverReady] = (0,react__WEBPACK_IMPORTED_MODULE_3__.useState)(false);
    const popoverTimerRef = (0,react__WEBPACK_IMPORTED_MODULE_3__.useRef)(null);
    const partialTableInfoRef = (0,react__WEBPACK_IMPORTED_MODULE_3__.useRef)(null);
    (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(()=>{
        if (pendingIntent && !isPanelOpen) {
            popoverTimerRef.current = setTimeout(()=>{
                setPopoverReady(true);
            }, 100);
            return ()=>{
                clearTimeout(popoverTimerRef.current);
                popoverTimerRef.current = null;
            };
        } else {
            setPopoverReady(false);
            if (popoverTimerRef.current) {
                clearTimeout(popoverTimerRef.current);
                popoverTimerRef.current = null;
            }
        }
    }, [
        pendingIntent,
        isPanelOpen
    ]);
    // Feed selection data from pendingIntent into ScribeContext
    (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(()=>{
        if (!setCurrentSelection || !(pendingIntent === null || pendingIntent === void 0 ? void 0 : pendingIntent.data)) return;
        setCurrentSelection(pendingIntent.data.text || null, pendingIntent.data.html || null);
        partialTableInfoRef.current = pendingIntent.data.partialTableInfo || null;
    }, [
        pendingIntent,
        setCurrentSelection
    ]);
    // Broadcast a message to all descendant iframes (reaches plugin inside OO editor iframe)
    const broadcastToFrames = (0,react__WEBPACK_IMPORTED_MODULE_3__.useCallback)((msg)=>{
        const walk = (win)=>{
            try {
                for(let i = 0; i < win.frames.length; i++){
                    try {
                        win.frames[i].postMessage(msg, '*');
                        walk(win.frames[i]);
                    } catch (e) {
                    // cross-origin frame, skip
                    }
                }
            } catch (e) {
            // access denied
            }
        };
        walk(window);
    }, []);
    // Send trigger-intent to plugin iframe
    const triggerScribe = (0,react__WEBPACK_IMPORTED_MODULE_3__.useCallback)(()=>{
        broadcastToFrames({
            type: 'cozy-bridge:trigger-intent',
            action: 'AI_TEXT_ASSISTANT'
        });
    }, [
        broadcastToFrames
    ]);
    const focusEditor = (0,react__WEBPACK_IMPORTED_MODULE_3__.useCallback)(()=>{
        const iframe = document.getElementsByName(_modules_views_OnlyOffice_config__WEBPACK_IMPORTED_MODULE_14__.FRAME_EDITOR_NAME)[0];
        if (iframe) iframe.focus();
    }, []);
    const handleReplace = (0,react__WEBPACK_IMPORTED_MODULE_3__.useCallback)((text)=>{
        const html = unwrapSingleParagraph((0,_modules_views_OnlyOffice_Scribe_scribeConversion__WEBPACK_IMPORTED_MODULE_11__.markdownToHtml)(text).trim());
        const data = {
            text,
            html,
            md: text
        };
        if (partialTableInfoRef.current) {
            data.partialTableInfo = partialTableInfoRef.current;
        }
        respond({
            status: 'ok',
            action: 'replace',
            data
        });
        setTimeout(focusEditor, 100);
    }, [
        respond,
        focusEditor
    ]);
    const handleInsert = (0,react__WEBPACK_IMPORTED_MODULE_3__.useCallback)((text)=>{
        const html = unwrapSingleParagraph((0,_modules_views_OnlyOffice_Scribe_scribeConversion__WEBPACK_IMPORTED_MODULE_11__.markdownToHtml)(text).trim());
        const data = {
            text,
            html,
            md: text
        };
        if (partialTableInfoRef.current) {
            data.partialTableInfo = partialTableInfoRef.current;
        }
        respond({
            status: 'ok',
            action: 'insert',
            data
        });
        setTimeout(focusEditor, 100);
    }, [
        respond,
        focusEditor
    ]);
    // Wire respond-based handlers into ScribeContext so MessageActions can call them
    (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(()=>{
        if (!setPanelActions) return;
        setPanelActions({
            replace: handleReplace,
            insert: handleInsert
        });
        return ()=>setPanelActions(null);
    }, [
        setPanelActions,
        handleReplace,
        handleInsert
    ]);
    const handleCancel = (0,react__WEBPACK_IMPORTED_MODULE_3__.useCallback)(()=>{
        respond({
            status: 'ok',
            action: 'cancel',
            data: {}
        });
        setTimeout(focusEditor, 100);
    }, [
        respond,
        focusEditor
    ]);
    // Use a ref for handleCancel so the keydown listener never goes stale
    const handleCancelRef = (0,react__WEBPACK_IMPORTED_MODULE_3__.useRef)(handleCancel);
    (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(()=>{
        handleCancelRef.current = handleCancel;
    }, [
        handleCancel
    ]);
    // Close popover when panel opens while popover is active.
    // Use respond() directly instead of handleCancel to avoid focusEditor
    // stealing focus from the panel.
    (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(()=>{
        if (isPanelOpen && pendingIntent) {
            respond({
                status: 'ok',
                action: 'cancel',
                data: {}
            });
        }
    }, [
        isPanelOpen,
        pendingIntent,
        respond
    ]);
    // Focus management: return focus to editor when panel closes
    const prevPanelOpenRef = (0,react__WEBPACK_IMPORTED_MODULE_3__.useRef)(isPanelOpen);
    (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(()=>{
        const wasOpen = prevPanelOpenRef.current;
        prevPanelOpenRef.current = isPanelOpen;
        if (!isPanelOpen && wasOpen) {
            setTimeout(focusEditor, 100);
        }
    }, [
        isPanelOpen,
        focusEditor
    ]);
    // Ctrl+Shift+I single-press from open popover: open panel and close popover
    (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(()=>{
        const popoverOpen = !!pendingIntent && !isPanelOpen;
        if (!popoverOpen) return;
        const handler = (e)=>{
            const isCtrlShiftI = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i');
            if (!isCtrlShiftI) return;
            e.preventDefault();
            if (openPanel) openPanel();
            handleCancelRef.current();
        };
        document.addEventListener('keydown', handler);
        return ()=>document.removeEventListener('keydown', handler);
    }, [
        pendingIntent,
        isPanelOpen,
        openPanel
    ]);
    // Ctrl+Shift+I when panel is open is handled by useCozyBridge:
    // the plugin casts AI_TEXT_ASSISTANT or TOGGLE_SCRIBE_PANEL, and the bridge
    // handler closes the panel. No document keydown listener needed here
    // since OO keeps focus in its cross-origin iframe.
    const initEditor = (0,react__WEBPACK_IMPORTED_MODULE_3__.useCallback)(()=>{
        new window.DocsAPI.DocEditor('onlyOfficeEditor', docEditorConfig);
        forceIframeHeight('0');
    }, [
        docEditorConfig
    ]);
    const handleError = (0,react__WEBPACK_IMPORTED_MODULE_3__.useCallback)(()=>{
        const scriptNode = document.getElementById(id);
        scriptNode && scriptNode.remove();
        setIsError(true);
    }, [
        setIsError,
        id
    ]);
    (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(()=>{
        const scriptAlreadyLoaded = document.getElementById(id);
        if (scriptAlreadyLoaded) return initEditor();
        const script = document.createElement('script');
        script.id = id;
        script.src = apiUrl;
        script.async = true;
        script.onload = ()=>initEditor();
        script.onerror = ()=>handleError();
        document.body.appendChild(script);
    }, [
        id,
        apiUrl,
        initEditor,
        handleError
    ]);
    (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(()=>{
        if (isEditorReady) {
            forceIframeHeight('100%');
        }
    }, [
        isEditorReady
    ]);
    const showReadOnlyFab = isMobile && isEditorReady && !isReadOnly && !isTrashed && (0,_modules_views_OnlyOffice_helpers__WEBPACK_IMPORTED_MODULE_15__.isOfficeEditingEnabled)(isDesktop);
    if (isError) return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxDEV)(_modules_views_OnlyOffice_Error__WEBPACK_IMPORTED_MODULE_5__["default"], {}, void 0, false, {
        fileName: "/home/ben/Dev-local/cozy-drive-scribe-in-right-panel/src/modules/views/OnlyOffice/View.jsx",
        lineNumber: 253,
        columnNumber: 23
    }, undefined);
    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxDEV)(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__.Fragment, {
        children: [
            !isEditorReady && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxDEV)("div", {
                className: "u-flex u-flex-items-center u-flex-justify-center u-flex-grow-1",
                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxDEV)(cozy_ui_transpiled_react_Spinner__WEBPACK_IMPORTED_MODULE_18__["default"], {
                    size: "xxlarge"
                }, void 0, false, {
                    fileName: "/home/ben/Dev-local/cozy-drive-scribe-in-right-panel/src/modules/views/OnlyOffice/View.jsx",
                    lineNumber: 259,
                    columnNumber: 11
                }, undefined)
            }, void 0, false, {
                fileName: "/home/ben/Dev-local/cozy-drive-scribe-in-right-panel/src/modules/views/OnlyOffice/View.jsx",
                lineNumber: 258,
                columnNumber: 9
            }, undefined),
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxDEV)("div", {
                className: "u-flex u-flex-grow-1",
                style: {
                    minHeight: 0,
                    overflow: 'hidden'
                },
                children: [
                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxDEV)("div", {
                        id: "onlyOfficeEditor",
                        style: {
                            flex: '1 1 auto',
                            minWidth: 0
                        }
                    }, void 0, false, {
                        fileName: "/home/ben/Dev-local/cozy-drive-scribe-in-right-panel/src/modules/views/OnlyOffice/View.jsx",
                        lineNumber: 263,
                        columnNumber: 9
                    }, undefined),
                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxDEV)(_modules_views_OnlyOffice_OnlyOfficeAIAssistantPanel__WEBPACK_IMPORTED_MODULE_6__["default"], {}, void 0, false, {
                        fileName: "/home/ben/Dev-local/cozy-drive-scribe-in-right-panel/src/modules/views/OnlyOffice/View.jsx",
                        lineNumber: 264,
                        columnNumber: 9
                    }, undefined),
                    isScribeEnabled && isPanelOpen && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxDEV)(_modules_views_OnlyOffice_Scribe_ScribePanel__WEBPACK_IMPORTED_MODULE_10__.ScribePanel, {}, void 0, false, {
                        fileName: "/home/ben/Dev-local/cozy-drive-scribe-in-right-panel/src/modules/views/OnlyOffice/View.jsx",
                        lineNumber: 265,
                        columnNumber: 44
                    }, undefined)
                ]
            }, void 0, true, {
                fileName: "/home/ben/Dev-local/cozy-drive-scribe-in-right-panel/src/modules/views/OnlyOffice/View.jsx",
                lineNumber: 262,
                columnNumber: 7
            }, undefined),
            isScribeEnabled && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxDEV)(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__.Fragment, {
                children: [
                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxDEV)(_modules_views_OnlyOffice_Scribe_ScribeFloatingButton__WEBPACK_IMPORTED_MODULE_12__.ScribeFloatingZone, {
                        visible: showFloatingZone,
                        onTriggerScribe: triggerScribe,
                        onTogglePanel: togglePanel
                    }, void 0, false, {
                        fileName: "/home/ben/Dev-local/cozy-drive-scribe-in-right-panel/src/modules/views/OnlyOffice/View.jsx",
                        lineNumber: 269,
                        columnNumber: 11
                    }, undefined),
                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxDEV)(_modules_views_OnlyOffice_Scribe_ScribePopover__WEBPACK_IMPORTED_MODULE_13__.ScribePopover, {
                        open: popoverReady && !!pendingIntent && !isPanelOpen,
                        selectedText: (pendingIntent === null || pendingIntent === void 0 ? void 0 : (_pendingIntent_data = pendingIntent.data) === null || _pendingIntent_data === void 0 ? void 0 : _pendingIntent_data.text) || '',
                        selectedHtml: (pendingIntent === null || pendingIntent === void 0 ? void 0 : (_pendingIntent_data1 = pendingIntent.data) === null || _pendingIntent_data1 === void 0 ? void 0 : _pendingIntent_data1.html) || '',
                        enrichedMd: (pendingIntent === null || pendingIntent === void 0 ? void 0 : (_pendingIntent_data2 = pendingIntent.data) === null || _pendingIntent_data2 === void 0 ? void 0 : _pendingIntent_data2.enrichedMd) || '',
                        tableAmbiguity: (pendingIntent === null || pendingIntent === void 0 ? void 0 : (_pendingIntent_data3 = pendingIntent.data) === null || _pendingIntent_data3 === void 0 ? void 0 : _pendingIntent_data3.tableAmbiguity) || null,
                        partialTableInfo: (pendingIntent === null || pendingIntent === void 0 ? void 0 : (_pendingIntent_data4 = pendingIntent.data) === null || _pendingIntent_data4 === void 0 ? void 0 : _pendingIntent_data4.partialTableInfo) || null,
                        onReplace: handleReplace,
                        onInsert: handleInsert,
                        onCancel: handleCancel,
                        onOpenPanel: openPanel ? ()=>{
                            openPanel();
                            respond({
                                status: 'ok',
                                action: 'cancel',
                                data: {}
                            });
                        } : undefined
                    }, void 0, false, {
                        fileName: "/home/ben/Dev-local/cozy-drive-scribe-in-right-panel/src/modules/views/OnlyOffice/View.jsx",
                        lineNumber: 274,
                        columnNumber: 11
                    }, undefined)
                ]
            }, void 0, true),
            showReadOnlyFab && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxDEV)(_modules_views_OnlyOffice_ReadOnlyFab__WEBPACK_IMPORTED_MODULE_8__["default"], {}, void 0, false, {
                fileName: "/home/ben/Dev-local/cozy-drive-scribe-in-right-panel/src/modules/views/OnlyOffice/View.jsx",
                lineNumber: 291,
                columnNumber: 27
            }, undefined)
        ]
    }, void 0, true);
};
_s(View, "gnN2ApAVajfgv20azRhul4HuWwU=", false, function() {
    return [
        _modules_views_OnlyOffice_OnlyOfficeProvider__WEBPACK_IMPORTED_MODULE_7__.useOnlyOfficeContext,
        cozy_ui_transpiled_react_providers_Breakpoints__WEBPACK_IMPORTED_MODULE_17__["default"],
        _modules_views_OnlyOffice_Scribe_ScribeContext__WEBPACK_IMPORTED_MODULE_9__.useScribe,
        _modules_views_OnlyOffice_useCozyBridge__WEBPACK_IMPORTED_MODULE_16__.useCozyBridge
    ];
});
_c = View;
View.propTypes = {
    id: (prop_types__WEBPACK_IMPORTED_MODULE_19___default().string.isRequired),
    apiUrl: (prop_types__WEBPACK_IMPORTED_MODULE_19___default().string.isRequired),
    docEditorConfig: (prop_types__WEBPACK_IMPORTED_MODULE_19___default().object.isRequired)
};
/* ESM default export */ const __WEBPACK_DEFAULT_EXPORT__ = (/*#__PURE__*/_c1 = react__WEBPACK_IMPORTED_MODULE_3___default().memo(View));
var _c, _c1;
$RefreshReg$(_c, "View");
$RefreshReg$(_c1, "%default%");

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
__webpack_require__.h = () => ("201e9eb494a4e384")
})();

}
);
//# sourceMappingURL=public.e61b8b84721b663a.hot-update.js.map