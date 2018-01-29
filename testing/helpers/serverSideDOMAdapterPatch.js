"use strict";

var domAdapter = require("core/dom_adapter");
var windowUtils = require("core/utils/window");
var readyCallbacks = require("core/utils/ready_callbacks");

exports.set = function() {
    domAdapter.listen = function(element, event, callback, useCapture) {
        // Note: in Angular domAdapter it wiil be "window"
        if(element === windowUtils.getWindow()) {
            window.addEventListener(event, callback, useCapture);
            return function() {
                window.removeEventListener(event, callback);
            };
        } else {
            element.addEventListener(event, callback, useCapture);
            return function() {
                element.removeEventListener(event, callback);
            };
        }
    };

    domAdapter.getSelection = function() {
        return {};
    };

    readyCallbacks.fire();
};
