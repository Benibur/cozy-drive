"use strict";
self["webpackHotUpdatecozy_drive"]("intents", {
"./src/modules/views/OnlyOffice/Scribe/scribeAI.js": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  SYSTEM_PROMPT: () => (SYSTEM_PROMPT),
  buildMessages: () => (buildMessages),
  callScribeAI: () => (callScribeAI),
  classifyScribeError: () => (classifyScribeError),
  deriveLoadingMessage: () => (deriveLoadingMessage)
});
/* ESM import */var core_js_modules_es_array_includes_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/core-js/modules/es.array.includes.js");
/* ESM import */var core_js_modules_es_array_includes_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_array_includes_js__WEBPACK_IMPORTED_MODULE_0__);
/* ESM import */var core_js_modules_es_error_cause_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./node_modules/core-js/modules/es.error.cause.js");
/* ESM import */var core_js_modules_es_error_cause_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_error_cause_js__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var _modules_views_OnlyOffice_Scribe_scribeActions__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("./src/modules/views/OnlyOffice/Scribe/scribeActions.js");
/* ESM import */var _modules_views_OnlyOffice_Scribe_scribeConversion__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("./src/modules/views/OnlyOffice/Scribe/scribeConversion.js");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");
/**
 * Scribe AI module — LLM API call wrapper, prompt builder, and loading message derivation.
 *
 * Calls POST /ai/v1/chat/completions via client.stackClient.fetchJSON() directly
 * (not chatCompletion()) to support AbortController signal for request cancellation.
 *
 * Exports: callScribeAI, buildMessages, deriveLoadingMessage, classifyScribeError, SYSTEM_PROMPT
 *
 * deriveLoadingMessage returns { key, params? } i18n descriptors (not strings).
 * classifyScribeError returns { messageKey, canRetry } with i18n keys (not strings).
 */ 



/**
 * System prompt framing Scribe as a writing assistant.
 * Prompt templates stay in English; output language handled by system prompt.
 */ const SYSTEM_PROMPT = 'You are a writing assistant. Return only the transformed text, no explanations or commentary. ' + 'Preserve all Markdown formatting and HTML tags exactly as structured in the input. ' + 'Key rules for formatting markers: ' + '(1) Each formatted segment is self-contained — markers open and close within the same segment (e.g. <u>**bold underlined**</u>, never **<u>bold underlined</u>**). ' + '(2) Adjacent <u> tags are intentional — do NOT merge </u><u> into a single <u>...</u>. ' + '(3) Adjacent links to the same URL are intentional — do NOT merge [a](url)[b](url) into [ab](url). ' + '(4) Nesting order is always: <u> outermost, then [link], then ~~, then **, then *, then ` innermost. ' + '(5) If you add or rewrite text that should carry formatting from adjacent segments, replicate the same marker structure. ' + 'Respond in the same language as the input text.';
/**
 * Search SCRIBE_ACTIONS (including children and dynamic translate children)
 * for an action matching the given id.
 *
 * Reused from mockTransform.js pattern.
 *
 * @param {string} actionId
 * @returns {Object|null} The action config object, or null if not found
 */ function findActionConfig(actionId) {
    if (actionId === 'free-prompt') {
        return _modules_views_OnlyOffice_Scribe_scribeActions__WEBPACK_IMPORTED_MODULE_2__.FREE_PROMPT_CONFIG;
    }
    for (const action of _modules_views_OnlyOffice_Scribe_scribeActions__WEBPACK_IMPORTED_MODULE_2__.SCRIBE_ACTIONS){
        if (action.id === actionId) {
            return action;
        }
        if (action.children) {
            for (const child of action.children){
                if (child.id === actionId) {
                    return child;
                }
            }
        }
    }
    // Check dynamic translate children (not in static SCRIBE_ACTIONS)
    if (actionId.startsWith('translate-')) {
        const translateChildren = (0,_modules_views_OnlyOffice_Scribe_scribeActions__WEBPACK_IMPORTED_MODULE_2__.buildTranslateChildren)('');
        for (const child of translateChildren){
            if (child.id === actionId) {
                return child;
            }
        }
    }
    return null;
}
/**
 * Build the messages array for a Scribe AI call.
 *
 * @param {string} actionId - The action identifier from scribeActions.js
 * @param {string} selectedText - The text selected in the editor
 * @param {string} label - Display label (for free-prompt: the user's instruction; for translate-custom: the language name)
 * @param {Object} [extra] - Extra data (e.g. { language: 'Spanish' } for translate-custom)
 * @returns {Array<{role: string, content: string}>} Messages array for the AI endpoint
 */ function buildMessages(actionId, selectedText, label, extra) {
    // Prepend system instructions to user message (single user role)
    // to avoid issues with RAG backends that may not support the system role
    let systemBase = SYSTEM_PROMPT;
    if ((extra === null || extra === void 0 ? void 0 : extra.enrichedMd) && (extra.enrichedMd.includes('[TABLE:') || extra.enrichedMd.includes('[CELL:'))) {
        systemBase += ' Preserve all [TABLE:N]...[/TABLE] and [CELL:r,c]...[/CELL] markers exactly as-is. Only modify the text content between the opening [CELL:r,c] and closing [/CELL] tags. Do not add, remove, or reorder [TABLE:N] or [CELL:r,c] markers.';
    }
    if ((extra === null || extra === void 0 ? void 0 : extra.enrichedMd) && extra.enrichedMd.includes('[^scribe-fn-')) {
        systemBase += ' Preserve all [^scribe-fn-N] footnote reference markers exactly as-is. Do NOT add footnote definitions ([^N]: text). The footnote content is managed separately — only preserve the inline reference markers.';
    }
    if ((extra === null || extra === void 0 ? void 0 : extra.enrichedMd) && extra.enrichedMd.includes('{{REF:')) {
        systemBase += ' Preserve all {{REF:scribe-ref-N:visible text}} cross-reference markers exactly as-is. You may modify surrounding text but must keep these markers intact with their original visible text.';
    }
    const systemPrefix = systemBase + '\n\n';
    // Prefer enrichedMd (plugin-side extraction) > htmlToMarkdown(html) > plain text
    const textForPrompt = (extra === null || extra === void 0 ? void 0 : extra.enrichedMd) || ((extra === null || extra === void 0 ? void 0 : extra.html) ? (0,_modules_views_OnlyOffice_Scribe_scribeConversion__WEBPACK_IMPORTED_MODULE_3__.htmlToMarkdown)(extra.html) : selectedText);
    // Free-prompt: wrap user instruction with guardrail template
    if (actionId === 'free-prompt') {
        return [
            {
                role: 'user',
                content: `${systemPrefix}Apply the following instruction to the text below. Return only the modified text.\n\nInstruction: ${label}\n\nText: ${textForPrompt}`
            }
        ];
    }
    // All other actions: look up config and interpolate prompt template
    const action = findActionConfig(actionId);
    if (!action || !action.prompt) {
        // Fallback: send selectedText as-is with label as instruction
        return [
            {
                role: 'user',
                content: `${systemPrefix}${label}:\n\n${textForPrompt}`
            }
        ];
    }
    let prompt = action.prompt;
    prompt = prompt.replace('{selectedText}', textForPrompt);
    // translate-custom: label contains the user-typed language name (Pitfall 5)
    if (actionId === 'translate-custom') {
        prompt = prompt.replace('{language}', label);
    }
    // Also handle extra.language for any translate action
    if (extra && extra.language) {
        prompt = prompt.replace('{language}', extra.language);
    }
    return [
        {
            role: 'user',
            content: `${systemPrefix}${prompt}`
        }
    ];
}
/**
 * Call the LLM via cozy-stack with AbortController support.
 *
 * Uses fetchJSON directly instead of chatCompletion() because
 * chatCompletion() merges options into request body, preventing
 * AbortController signal passthrough (Pitfall 1 in research).
 *
 * @param {Object} client - CozyClient instance from useClient()
 * @param {Array<{role: string, content: string}>} messages - System + user messages
 * @param {Object} [options] - { signal: AbortController.signal }
 * @returns {Promise<string>} The AI-generated text content
 * @throws {Error} If response is empty
 * @throws {DOMException} AbortError if request was cancelled
 * @throws {FetchError} If HTTP request fails
 */ async function callScribeAI(client, messages) {
    let { signal } = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    var _response_choices__message, _response_choices_, _response_choices;
    const response = await client.stackClient.fetchJSON('POST', '/ai/v1/chat/completions', {
        messages,
        temperature: 0.3
    }, {
        signal
    });
    // Defensive double-check pattern from AIAssistantPanel
    const content = (response === null || response === void 0 ? void 0 : response.content) || (response === null || response === void 0 ? void 0 : (_response_choices = response.choices) === null || _response_choices === void 0 ? void 0 : (_response_choices_ = _response_choices[0]) === null || _response_choices_ === void 0 ? void 0 : (_response_choices__message = _response_choices_.message) === null || _response_choices__message === void 0 ? void 0 : _response_choices__message.content);
    if (!content) {
        throw new Error('Empty response from AI');
    }
    return content;
}
/**
 * Map of action IDs to their i18n loading message keys.
 */ const LOADING_KEYS = {
    'correct-grammar': 'Scribe.loading.correct_grammar',
    'tone-professional': 'Scribe.loading.tone_professional',
    'tone-casual': 'Scribe.loading.tone_casual',
    'tone-polite': 'Scribe.loading.tone_polite',
    'improve-shorter': 'Scribe.loading.improve_shorter',
    'improve-expand': 'Scribe.loading.improve_expand',
    'improve-emojify': 'Scribe.loading.improve_emojify',
    'improve-bullets': 'Scribe.loading.improve_bullets'
};
/**
 * Derive a loading message descriptor for a Scribe action.
 *
 * Returns an object with { key, params? } so the caller can resolve
 * the translated string via t(result.key, result.params).
 *
 * @param {string} actionId - The action identifier
 * @param {string} label - The action's display label (used as language name for translate actions)
 * @returns {{ key: string, params?: Object }} i18n descriptor for the loading message
 */ function deriveLoadingMessage(actionId, label) {
    // Free-prompt: label is the user's full prompt, not suitable for display
    if (actionId === 'free-prompt') {
        return {
            key: 'Scribe.loading.processing'
        };
    }
    // Translate actions: use interpolated "Translating to %{language}..." pattern
    if (actionId.startsWith('translate-')) {
        return {
            key: 'Scribe.translate.translating_to',
            params: {
                language: label
            }
        };
    }
    // Known action IDs: map to i18n loading key
    if (LOADING_KEYS[actionId]) {
        return {
            key: LOADING_KEYS[actionId]
        };
    }
    // Fallback for unknown IDs
    return {
        key: 'Scribe.loading.processing'
    };
}
/**
 * Classify a Scribe AI error into an i18n message key and retry eligibility.
 *
 * Returns { messageKey, canRetry } so the caller can resolve the translated
 * error string via t(result.messageKey).
 *
 * @param {Error} err - The error thrown by callScribeAI
 * @returns {{ messageKey: string, canRetry: boolean }}
 */ function classifyScribeError(err) {
    // AbortError: user cancelled — handled upstream, safety catch
    if (err.name === 'AbortError') {
        return {
            messageKey: '',
            canRetry: false
        };
    }
    // FetchError from cozy-stack-client (check by name, not instanceof)
    if (err.name === 'FetchError' && typeof err.status === 'number') {
        if (err.status === 401 || err.status === 403) {
            return {
                messageKey: 'Scribe.error.auth',
                canRetry: false
            };
        }
        if (err.status === 429) {
            return {
                messageKey: 'Scribe.error.rate_limit',
                canRetry: true
            };
        }
        if (err.status >= 500) {
            return {
                messageKey: 'Scribe.error.server',
                canRetry: true
            };
        }
        return {
            messageKey: 'Scribe.error.generic',
            canRetry: false
        };
    }
    // Network errors (TypeError or fetch failure messages)
    if (err instanceof TypeError || err.message && (err.message.includes('Failed to fetch') || err.message.includes('Network request failed'))) {
        return {
            messageKey: 'Scribe.error.network',
            canRetry: true
        };
    }
    // Empty response from AI
    if (err.message === 'Empty response from AI') {
        return {
            messageKey: 'Scribe.error.empty_response',
            canRetry: true
        };
    }
    // Default: unexpected error, allow retry
    return {
        messageKey: 'Scribe.error.unexpected',
        canRetry: true
    };
}

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
__webpack_require__.h = () => ("4dcc399b69bbf2b0")
})();

}
);
//# sourceMappingURL=intents.8dd0cef864c4e58c.hot-update.js.map