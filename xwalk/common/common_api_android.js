// Copyright (c) 2015 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// internal won't be used anymore.
var internal = {};
internal.setupInternalExtension = function(extension_obj) {};
internal.postMessage = function(function_name, args, callback) {};
internal.removeCallback = function(id) {};

var Common = function() {
  var v8tools = requireNative('v8tools');
  var jsStubModule = requireNative('jsStub');
  jsStubModule.init(extension, v8tools);
  var jsStub = jsStubModule.jsStub;
  var rootHelper = jsStub.create(exports);

  function getUniqueId() {
    return 0;
  }

  var BindingObjectPrototype = function() {
    // Won't be used anymore.
    function postMessage(name, args, callback) {
    };

    function isEnumerable(method_name) {
      return name.indexOf('_') != 0;
    };

    function addMethod(name, has_callback) {
      Object.defineProperty(this, name, {
        value: function() {
          var args = Array.prototype.slice.call(arguments);
          jsStub.getHelper(this, rootHelper).invokeNative(name, args, false);
        },
        enumerable: isEnumerable(name),
      });
    };

    function invokeMethodWithPromise(self, name, args, wrapReturns) {
      return new Promise(function(resolve, reject) {
        var resolveWrapper = function(data) {
          if (wrapReturns) {
            resolve(wrapReturns(data));
          } else {
            resolve(data);
          }
        };
        args.unshift({'resolve': resolveWrapper, 'reject': reject});
        jsStub.getHelper(self, rootHelper).invokeNative(name, args, false);
      });
    };

    function addMethodWithPromise(name, wrapArgs, wrapReturns) {
      Object.defineProperty(this, name, {
        value: function() {
          var args = Array.prototype.slice.call(arguments);
          if (wrapArgs)
            args = wrapArgs(args);

          return invokeMethodWithPromise(this, name, args, wrapReturns);
        },
        enumerable: isEnumerable(name),
      });
    };

    function addMethodWithPromise2(name, wrapArgs, wrapReturns) {
      Object.defineProperty(this, name, {
        value: function() {
          var self = this;
          var args = Array.prototype.slice.call(arguments);
          if (wrapArgs) {
            return wrapArgs(args).then(function(resultData) {
              return invokeMethodWithPromise(self, name, resultData, wrapReturns);
            });
          }

          return invokeMethodWithPromise(self, name, args, wrapReturns);
        },
        enumerable: isEnumerable(name),
      });
    };

    function registerLifecycleTracker() {
      jsStub.getHelper(this, rootHelper).registerLifecycleTracker();
    }

    Object.defineProperties(this, {
      '_postMessage' : {
        value: postMessage,
      },
      '_addMethod' : {
        value: addMethod,
      },
      '_addMethodWithPromise' : {
        value: addMethodWithPromise,
      },
      '_addMethodWithPromise2': {
        value: addMethodWithPromise2,
      },
      '_registerLifecycleTracker' : {
        value: registerLifecycleTracker,
      },
    });
  };

  var BindingObject = function(objectId, cName) {
    if (rootHelper.getBindingObject(Number(objectId)) != undefined) {
      return;
    }

    // Request Java side to create BindingObject.
    objectId = Number(rootHelper.invokeNative('+' + cName, true));
    if (!objectId) throw 'Error to create instance for constructor: ' + cName;
    var objectHelper = jsStub.getHelper(this, rootHelper);
    objectHelper.objectId = objectId;
    objectHelper.constructorJsName = cName;
    objectHelper.registerLifecycleTracker();

    rootHelper.addBindingObject(objectId, this);

    Object.defineProperties(this, {
      '_id': {
        value: objectId,
      },
    });
  };

  // addEventListener, removeEventListener, dispatchEvent
  // are already exposed by jsStub.makeEventTarget(),
  // so no need to define them again in prototype,
  // just adapt addEvent to helper's addEvent.
  var EventTargetPrototype = function() {
    function addEvent(type, event) {
      jsStub.getHelper(this, rootHelper).addEvent(type);
    };

    Object.defineProperties(this, {
      '_addEvent' : {
        value: addEvent,
      },
    });
  };

  var EventTarget = function(object_id) {
    jsStub.makeEventTarget(this);
  };

  EventTargetPrototype.prototype = new BindingObjectPrototype();

  Object.defineProperties(this, {
    'getUniqueId': {
      value: getUniqueId,
      enumerable: true
    },
    'BindingObjectPrototype': {
      value: BindingObjectPrototype,
      enumerable: true
    },
    'BindingObject': {
      value: BindingObject,
      enumerable: true
    },
    'EventTargetPrototype': {
      value: EventTargetPrototype,
      enumerable: true
    },
    'EventTarget': {
      value: EventTarget,
      enumerable: true
    }
  });
};

var common = new Common();

