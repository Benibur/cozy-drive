"use strict";
self["webpackHotUpdatecozy_drive"]("public", {
"./src/modules/views/OnlyOffice/Scribe/ScribePopover.jsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ScribePopover: () => (ScribePopover)
});
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./node_modules/react/index.js");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var prop_types__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__("./node_modules/prop-types/index.js");
/* ESM import */var prop_types__WEBPACK_IMPORTED_MODULE_16___default = /*#__PURE__*/__webpack_require__.n(prop_types__WEBPACK_IMPORTED_MODULE_16__);
/* ESM import */var cozy_ui_transpiled_react_Paper__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__("./node_modules/cozy-ui/transpiled/react/Paper/index.js");
/* ESM import */var cozy_ui_transpiled_react_Spinner__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__("./node_modules/cozy-ui/transpiled/react/Spinner/index.js");
/* ESM import */var cozy_ui_transpiled_react_Typography__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__("./node_modules/cozy-ui/transpiled/react/Typography/index.js");
/* ESM import */var twake_i18n__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("./node_modules/twake-i18n/dist/index.js");
/* ESM import */var cozy_client__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__("./node_modules/cozy-client/dist/index.js");
/* ESM import */var cozy_client__WEBPACK_IMPORTED_MODULE_12___default = /*#__PURE__*/__webpack_require__.n(cozy_client__WEBPACK_IMPORTED_MODULE_12__);
/* ESM import */var _modules_views_OnlyOffice_Scribe_ScribeContainer__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("./src/modules/views/OnlyOffice/Scribe/ScribeContainer.jsx");
/* ESM import */var _modules_views_OnlyOffice_Scribe_ScribeActionMenu__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__("./src/modules/views/OnlyOffice/Scribe/ScribeActionMenu.jsx");
/* ESM import */var _modules_views_OnlyOffice_Scribe_ScribeContext__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__("./src/modules/views/OnlyOffice/Scribe/ScribeContext.jsx");
/* ESM import */var _modules_views_OnlyOffice_Scribe_scribeAI__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__("./src/modules/views/OnlyOffice/Scribe/scribeAI.js");
/* ESM import */var _modules_views_OnlyOffice_Scribe_scribeConversion__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__("./src/modules/views/OnlyOffice/Scribe/scribeConversion.js");
/* ESM import */var _modules_views_OnlyOffice_Scribe_tableCellMarkers__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__("./src/modules/views/OnlyOffice/Scribe/tableCellMarkers.js");
/* ESM import */var _modules_views_OnlyOffice_Scribe_ScribeResultPanel__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__("./src/modules/views/OnlyOffice/Scribe/ScribeResultPanel.jsx");
/* ESM import */var _modules_views_OnlyOffice_Scribe_scribeDevMode__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__("./src/modules/views/OnlyOffice/Scribe/scribeDevMode.js");
/* ESM import */var _modules_views_OnlyOffice_Scribe_scribe_styl__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__("./src/modules/views/OnlyOffice/Scribe/scribe.styl");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");

var _s = $RefreshSig$();
















/**
 * ScribePopover - Main popover container managing the three-step state machine.
 *
 * Step 1 ('menu'): Action selection via ScribeActionMenu (submenus + free prompt).
 * Step 2 ('loading'): Spinner + action-specific loading message while AI processes.
 * Step 3 ('result'): Displays the AI-transformed text via ScribeResultPanel.
 *
 * Closing the popover during loading aborts the in-flight API request via AbortController.
 */ const ScribePopover = (param)=>{
    let { open, selectedText, selectedHtml, onReplace, onInsert, onCancel, onOpenPanel, tableAmbiguity } = param;
    _s();
    const { t } = (0,twake_i18n__WEBPACK_IMPORTED_MODULE_2__.useI18n)();
    const client = (0,cozy_client__WEBPACK_IMPORTED_MODULE_12__.useClient)();
    const scribe = (0,_modules_views_OnlyOffice_Scribe_ScribeContext__WEBPACK_IMPORTED_MODULE_5__.useScribe)();
    const addMessage = scribe === null || scribe === void 0 ? void 0 : scribe.addMessage;
    const abortRef = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
    const [step, setStep] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)('menu') // 'menu' | 'loading' | 'result'
    ;
    const [result, setResult] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)({
        text: '',
        breadcrumb: '',
        error: '',
        canRetry: false
    });
    const [loadingMessage, setLoadingMessage] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)('');
    const [lastAction, setLastAction] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
    // Dev mode: store source HTML and intermediate MD for debug panels
    const [devData, setDevData] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)({
        html: '',
        md: ''
    });
    // Raw LLM response (with cell markers) for reinjection; display version goes in result.text
    const [rawResult, setRawResult] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)('');
    // Warning when cell marker count mismatches between extraction and LLM response
    const [cellWarning, setCellWarning] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
    // Ambiguity message for partial table selections (TBL-02)
    const [ambiguityMessage, setAmbiguityMessage] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
    // Drag offset for result panel repositioning
    const [dragOffset, setDragOffset] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)({
        x: 0,
        y: 0
    });
    // Panel size for result panel resizing (null = use default CSS sizing)
    const [panelSize, setPanelSize] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
    // Reset to menu state when popover opens with new intent
    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(()=>{
        if (open) {
            setStep('menu');
            setResult({
                text: '',
                breadcrumb: '',
                error: '',
                canRetry: false
            });
            setLoadingMessage('');
            setLastAction(null);
            setDevData({
                html: '',
                md: ''
            });
            setRawResult('');
            setCellWarning(null);
            setAmbiguityMessage(null);
            setDragOffset({
                x: 0,
                y: 0
            });
            setPanelSize(null);
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
        }
    }, [
        open
    ]);
    // Detect ambiguous table selection and show warning instead of menu
    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(()=>{
        if (tableAmbiguity) {
            setAmbiguityMessage(tableAmbiguity.message);
        } else {
            setAmbiguityMessage(null);
        }
    }, [
        tableAmbiguity
    ]);
    // Focus the loading panel when step transitions to 'loading'
    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(()=>{
        if (step === 'loading' && loadingRef.current) {
            loadingRef.current.focus();
        }
    }, [
        step
    ]);
    const handleActionSelect = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)(async (actionId, label, breadcrumb)=>{
        // Don't send ambiguous selections to LLM
        if (tableAmbiguity) return;
        // Compute intermediate MD for dev panels (enrichedMd preferred over htmlToMarkdown)
        const inputMd = enrichedMd || (selectedHtml ? (0,_modules_views_OnlyOffice_Scribe_scribeConversion__WEBPACK_IMPORTED_MODULE_7__.htmlToMarkdown)(selectedHtml) : selectedText);
        // Compute normalized HTML for dev panels
        const normalized = selectedHtml ? (0,_modules_views_OnlyOffice_Scribe_scribeConversion__WEBPACK_IMPORTED_MODULE_7__.normalizeHtml)(selectedHtml) : '';
        // Dev mode: test-markdown bypasses LLM entirely
        if (actionId === 'test-markdown') {
            setDevData({
                html: selectedHtml || '',
                normalizedHtml: normalized,
                md: inputMd,
                source: enrichedMd ? 'plugin' : 'turndown'
            });
            setResult({
                text: inputMd,
                breadcrumb: 'Test MD',
                error: '',
                canRetry: false
            });
            setStep('result');
            return;
        }
        // Store action params for retry
        setLastAction({
            actionId,
            label,
            breadcrumb
        });
        // Capture dev data for normal flow too
        if ((0,_modules_views_OnlyOffice_Scribe_scribeDevMode__WEBPACK_IMPORTED_MODULE_10__.isScribeDevMd)()) {
            setDevData({
                html: selectedHtml || '',
                normalizedHtml: normalized,
                md: inputMd,
                source: enrichedMd ? 'plugin' : 'turndown'
            });
        }
        // 1. Transition to loading
        setStep('loading');
        const loadingInfo = (0,_modules_views_OnlyOffice_Scribe_scribeAI__WEBPACK_IMPORTED_MODULE_6__.deriveLoadingMessage)(actionId, label);
        setLoadingMessage(loadingInfo.params ? t(loadingInfo.key, loadingInfo.params) : t(loadingInfo.key));
        setResult({
            text: '',
            breadcrumb,
            error: '',
            canRetry: false
        });
        // 2. Create AbortController
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            // 3. Build messages and call API
            const extra = {};
            if (actionId === 'translate-custom') {
                extra.language = label;
            }
            if (selectedHtml) {
                extra.html = selectedHtml;
            }
            if (enrichedMd) {
                extra.enrichedMd = enrichedMd;
            }
            const messages = (0,_modules_views_OnlyOffice_Scribe_scribeAI__WEBPACK_IMPORTED_MODULE_6__.buildMessages)(actionId, selectedText, label, Object.keys(extra).length > 0 ? extra : undefined);
            const text = await (0,_modules_views_OnlyOffice_Scribe_scribeAI__WEBPACK_IMPORTED_MODULE_6__.callScribeAI)(client, messages, {
                signal: controller.signal
            });
            // 4. Pre-process cell markers for preview display, keep raw for reinjection
            const { displayMd, warning } = (0,_modules_views_OnlyOffice_Scribe_tableCellMarkers__WEBPACK_IMPORTED_MODULE_8__.transformCellMarkersForPreview)(text, enrichedMd);
            setRawResult(text);
            setCellWarning(warning);
            setResult({
                text: displayMd,
                breadcrumb,
                error: '',
                canRetry: false
            });
            setStep('result');
            // 5. Mirror action into shared conversation history
            if (addMessage) {
                addMessage({
                    id: Date.now(),
                    role: 'user',
                    content: breadcrumb,
                    timestamp: new Date()
                });
                addMessage({
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: text,
                    timestamp: new Date()
                });
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                return;
            }
            const classified = (0,_modules_views_OnlyOffice_Scribe_scribeAI__WEBPACK_IMPORTED_MODULE_6__.classifyScribeError)(err);
            setResult({
                text: '',
                breadcrumb,
                error: classified.messageKey ? t(classified.messageKey) : '',
                canRetry: classified.canRetry
            });
            setStep('result');
            // Mirror error into shared conversation history
            if (addMessage) {
                addMessage({
                    id: Date.now(),
                    role: 'user',
                    content: breadcrumb,
                    timestamp: new Date()
                });
                addMessage({
                    id: Date.now() + 1,
                    role: 'error',
                    content: classified.messageKey ? t(classified.messageKey) : 'Error',
                    timestamp: new Date()
                });
            }
        } finally{
            if (abortRef.current === controller) {
                abortRef.current = null;
            }
        }
    }, [
        selectedText,
        selectedHtml,
        client,
        t,
        addMessage
    ]);
    const handleClose = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)(()=>{
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        onCancel();
    }, [
        onCancel
    ]);
    const handleReplace = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)(()=>{
        onReplace(rawResult || result.text);
    }, [
        rawResult,
        result.text,
        onReplace
    ]);
    const handleInsert = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)(()=>{
        onInsert(rawResult || result.text);
    }, [
        rawResult,
        result.text,
        onInsert
    ]);
    const handleRetry = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)(()=>{
        if (lastAction) {
            handleActionSelect(lastAction.actionId, lastAction.label, lastAction.breadcrumb);
        }
    }, [
        lastAction,
        handleActionSelect
    ]);
    const menuRef = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
    const loadingRef = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
    const handleEntered = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)(()=>{
        if (document.activeElement) {
            document.activeElement.blur();
        }
        setTimeout(()=>{
            if (menuRef.current) {
                menuRef.current.focus();
            }
        }, 50);
    }, []);
    const devMode = (0,_modules_views_OnlyOffice_Scribe_scribeDevMode__WEBPACK_IMPORTED_MODULE_10__.isScribeDevMd)();
    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_modules_views_OnlyOffice_Scribe_ScribeContainer__WEBPACK_IMPORTED_MODULE_3__.ScribeContainer, {
        open: open,
        onClose: handleClose,
        transitionDuration: 0,
        TransitionProps: {
            onEntered: handleEntered
        },
        disableAutoFocus: true,
        disableEnforceFocus: true,
        anchorReference: "anchorPosition",
        anchorPosition: {
            top: (typeof window !== 'undefined' ? window.innerHeight / 2 : 400) + dragOffset.y,
            left: (typeof window !== 'undefined' ? window.innerWidth / 2 : 500) + dragOffset.x
        },
        transformOrigin: {
            vertical: 'center',
            horizontal: 'center'
        },
        BackdropProps: {
            style: {
                backgroundColor: 'rgba(0, 0, 0, 0.5)'
            }
        },
        PaperProps: {
            style: {
                borderRadius: 8,
                boxShadow: 'none',
                backgroundColor: 'transparent',
                overflow: 'visible',
                ...devMode && step === 'result' ? {
                    maxWidth: '95vw'
                } : {}
            }
        },
        children: [
            step === 'menu' && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_modules_views_OnlyOffice_Scribe_ScribeActionMenu__WEBPACK_IMPORTED_MODULE_4__.ScribeActionMenu, {
                ref: menuRef,
                onSelect: handleActionSelect,
                onClose: handleClose,
                onOpenPanel: onOpenPanel,
                selectedText: selectedText
            }, void 0, false, {
                fileName: "/home/ben/Dev-local/cozy-drive-scribe-in-right-panel/src/modules/views/OnlyOffice/Scribe/ScribePopover.jsx",
                lineNumber: 239,
                columnNumber: 9
            }, undefined),
            step === 'loading' && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(cozy_ui_transpiled_react_Paper__WEBPACK_IMPORTED_MODULE_13__["default"], {
                ref: loadingRef,
                tabIndex: -1,
                className: _modules_views_OnlyOffice_Scribe_scribe_styl__WEBPACK_IMPORTED_MODULE_11__["default"]["scribe-loading-panel"],
                elevation: 0,
                style: {
                    outline: 'none'
                },
                children: [
                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(cozy_ui_transpiled_react_Spinner__WEBPACK_IMPORTED_MODULE_14__["default"], {
                        size: "large"
                    }, void 0, false, {
                        fileName: "/home/ben/Dev-local/cozy-drive-scribe-in-right-panel/src/modules/views/OnlyOffice/Scribe/ScribePopover.jsx",
                        lineNumber: 243,
                        columnNumber: 11
                    }, undefined),
                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(cozy_ui_transpiled_react_Typography__WEBPACK_IMPORTED_MODULE_15__["default"], {
                        variant: "body2",
                        color: "textSecondary",
                        className: _modules_views_OnlyOffice_Scribe_scribe_styl__WEBPACK_IMPORTED_MODULE_11__["default"]["scribe-loading-message"],
                        children: loadingMessage
                    }, void 0, false, {
                        fileName: "/home/ben/Dev-local/cozy-drive-scribe-in-right-panel/src/modules/views/OnlyOffice/Scribe/ScribePopover.jsx",
                        lineNumber: 244,
                        columnNumber: 11
                    }, undefined)
                ]
            }, void 0, true, {
                fileName: "/home/ben/Dev-local/cozy-drive-scribe-in-right-panel/src/modules/views/OnlyOffice/Scribe/ScribePopover.jsx",
                lineNumber: 242,
                columnNumber: 9
            }, undefined),
            step === 'result' && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_modules_views_OnlyOffice_Scribe_ScribeResultPanel__WEBPACK_IMPORTED_MODULE_9__.ScribeResultPanel, {
                breadcrumb: result.breadcrumb,
                resultText: result.text,
                error: result.error,
                canRetry: result.canRetry,
                cellWarning: cellWarning,
                onRetry: handleRetry,
                onReplace: handleReplace,
                onInsert: handleInsert,
                onClose: handleClose,
                rawLlmResult: rawResult,
                devData: devMode ? devData : null,
                dragOffset: dragOffset,
                onDragMove: setDragOffset,
                panelSize: panelSize,
                onResize: setPanelSize
            }, void 0, false, {
                fileName: "/home/ben/Dev-local/cozy-drive-scribe-in-right-panel/src/modules/views/OnlyOffice/Scribe/ScribePopover.jsx",
                lineNumber: 250,
                columnNumber: 9
            }, undefined)
        ]
    }, void 0, true, {
        fileName: "/home/ben/Dev-local/cozy-drive-scribe-in-right-panel/src/modules/views/OnlyOffice/Scribe/ScribePopover.jsx",
        lineNumber: 217,
        columnNumber: 5
    }, undefined);
};
_s(ScribePopover, "zSyALMJw+rXgKf3qSyuIGQNTcRY=", false, function() {
    return [
        twake_i18n__WEBPACK_IMPORTED_MODULE_2__.useI18n,
        cozy_client__WEBPACK_IMPORTED_MODULE_12__.useClient,
        _modules_views_OnlyOffice_Scribe_ScribeContext__WEBPACK_IMPORTED_MODULE_5__.useScribe
    ];
});
_c = ScribePopover;
ScribePopover.propTypes = {
    open: (prop_types__WEBPACK_IMPORTED_MODULE_16___default().bool.isRequired),
    selectedText: (prop_types__WEBPACK_IMPORTED_MODULE_16___default().string.isRequired),
    selectedHtml: (prop_types__WEBPACK_IMPORTED_MODULE_16___default().string),
    enrichedMd: (prop_types__WEBPACK_IMPORTED_MODULE_16___default().string),
    tableAmbiguity: prop_types__WEBPACK_IMPORTED_MODULE_16___default().shape({
        type: (prop_types__WEBPACK_IMPORTED_MODULE_16___default().string),
        message: (prop_types__WEBPACK_IMPORTED_MODULE_16___default().string)
    }),
    partialTableInfo: (prop_types__WEBPACK_IMPORTED_MODULE_16___default().object),
    onReplace: (prop_types__WEBPACK_IMPORTED_MODULE_16___default().func.isRequired),
    onInsert: (prop_types__WEBPACK_IMPORTED_MODULE_16___default().func.isRequired),
    onCancel: (prop_types__WEBPACK_IMPORTED_MODULE_16___default().func.isRequired),
    onOpenPanel: (prop_types__WEBPACK_IMPORTED_MODULE_16___default().func)
};

var _c;
$RefreshReg$(_c, "ScribePopover");

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
__webpack_require__.h = () => ("55381279b88f90bb")
})();

}
);
//# sourceMappingURL=public.0853ba9cf5d1c5b1.hot-update.js.map