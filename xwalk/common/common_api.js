// Copyright (c) 2015 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var callback_listeners = {};
var callback_id = 0;
var extension_object;
var internal = {};
const byteLengthOfInt32 = 4;

function wrapCallback(args, callback) {
  if (callback) {
    var id = (callback_id++).toString();
    callback_listeners[id] = callback;
    args.unshift(id);
  } else {
    // The function name and the callback ID are prepended before
    // the arguments. If there is no callback, an empty string is
    // should be used. This will be sorted out by the InternalInstance
    // message handler.
    args.unshift('');
  }

  return id;
}

internal.setupInternalExtension = function(extension_obj) {
  if (extension_object != null)
    return;

  extension_object = extension_obj;

  extension_object.setMessageListener(function(msg) {
    if (msg instanceof ArrayBuffer) {
      var int32_array = new Int32Array(msg, 0 , 1);
      var id = int32_array[0];
      var listener = callback_listeners[id];

      if (listener !== undefined) {
        if (!listener.apply(null, [msg]))
          delete callback_listeners[id];
      }
    } else {
      var args = JSON.parse(msg);
      var id = args.shift();
      var listener = callback_listeners[id];

      if (listener !== undefined) {
        if (!listener.apply(null, args))
          delete callback_listeners[id];
      }
    }
  });
};

internal.sendSyncMessage = function(function_name, args) {
  args.unshift(function_name);
  var msg = JSON.stringify(args);

  var result = extension_object.internal.sendSyncMessage(msg);
  return JSON.parse(result);
};

internal.postMessage = function(function_name, args, callback) {
  var id = wrapCallback(args, callback);
  args.unshift(function_name);
  var msg = JSON.stringify(args);
  extension_object.postMessage(msg);

  return id;
};

function alignedWith4Bytes(number) {
  return number + (4 - number % 4);
}

internal.postBinaryMessage = function(functionName, args, callback) {
  var id = wrapCallback(args, callback);

  var callbackID = parseInt(args[0]);
  var objectId = args[1];
  var methodName = args[2];
  var methodArgs = args[3];
  var allignFuncNameLen = alignedWith4Bytes(functionName.length);
  var allignMethodNameLen = alignedWith4Bytes(methodName.length);
  var allignObjectId = alignedWith4Bytes(objectId.length);

  // Final ArrayBuffer includes funcNameLen(int32),funcName(string), callbackID(int32),
  // objectIdLen(int32), objectId(string), methodNameLen(int32), methodName(string),
  // methodArgs(ArrayBuffer)
  var byteLen = byteLengthOfInt32 + allignFuncNameLen + 2 * byteLengthOfInt32 +
      allignObjectId + byteLengthOfInt32 + allignMethodNameLen + methodArgs.byteLength;
  var arrayBuffer = new ArrayBuffer(byteLen);
  var offset = 0;
  var view = new Int32Array(arrayBuffer, offset, 1);
  view[0] = functionName.length;

  offset += byteLengthOfInt32;
  view = new Uint8Array(arrayBuffer, offset, functionName.length);
  for (var i = 0; i < functionName.length; i++) {
    view[i] = functionName.charCodeAt(i);
  }

  offset += allignFuncNameLen;
  view = new Int32Array(arrayBuffer, offset, 2);
  view[0] = callbackID;
  view[1] = objectId.length;

  offset += 2 * byteLengthOfInt32;
  view = new Uint8Array(arrayBuffer, offset, objectId.length);
  for (var i = 0; i < objectId.length; i++) {
    view[i] = objectId.charCodeAt(i);
  }

  offset += allignObjectId;
  view = new Int32Array(arrayBuffer, offset, 1);
  view[0] = methodName.length;

  offset += byteLengthOfInt32;
  view = new Uint8Array(arrayBuffer, offset, methodName.length);
  for (var i = 0; i < methodName.length; i++) {
    view[i] = methodName.charCodeAt(i);
  }

  offset += allignMethodNameLen;
  view = new Uint8Array(arrayBuffer, offset);
  view.set(new Uint8Array(methodArgs), 0);

  extension_object.postMessage(arrayBuffer);
  return id;
};

internal.removeCallback = function(id) {
  if (!id in callback_listeners)
    return;

  delete callback_listeners[id];
};

var Common = function() {
  var v8tools = requireNative('v8tools');
  internal.setupInternalExtension(extension);

  var unique_id = 0;

  function getUniqueId() {
    return (unique_id++).toString();
  }

  // The BindingObject is responsible for bridging between the JavaScript
  // implementation and the native code. It keeps a unique ID for each
  // instance of a given object that is used by the BindingObjectStore to
  // deliver messages.
  //
  // It also keeps track of when the instance gets collected by the Garbage
  // Collector, informing the native side that the native implementation can also
  // be freed.
  //
  // Creating a BindingObject with a predefined object ID in the constructor can
  // be used for having one or more JavaScript objects communicating with a native
  // object of the same ID, but only the original BindingObject that generated the
  // ID will have its lifecycle bound to the native object.
  //
  // _postMessage(function_name, arguments, callback):
  //     This method sends a message to the native counterpart of this
  //     object. It has the same signature of the Internal Extensions
  //     |postMessage| but wraps the unique identifier as the first argument
  //     automatically.
  //
  // _addMethod(name, has_callback):
  //     Convenience function for adding methods to an object that have a
  //     correspondent on the native side. Methods names that start with "_" are
  //     define as not enumerable by default. Set |has_callback| to true if the
  //     method expects a callback as the last parameter.
  //
  // _addMethodWithPromise(name, promise, wrapArgs?, wrapReturns?):
  //     Convenience function for adding methods that return a Promise. The reply
  //     from the native side is expected to have two parameters: |data| and |error|.
  //     The optional wrapArgs, if supplied, will be used to custom the arguments,
  //     if not supplied, the original arguments will be used.
  //     The optional wrapReturns, if supplied, will be used to custom |data| value,
  //     if not supplied, the original |data| value will be used.
  //
  // _addBinaryMethodWithPromise(name, promise, wrapArgs, wrapReturns?):
  //     The diff with _addMethodWithPromise is that this method will post
  //     binary message to native side. It requires that the method arguments must
  //     be customed to an ArrayBuffer by wrapArgs.
  //     Convenience function for adding methods that return a Promise. The reply
  //     from the native side is expected to have two parameters: |data| and |error|.
  //     wrapArgs will be used to custom the arguments to an ArrayBuffer,
  //     The optional wrapReturns, if supplied, will be used to custom |data| value,
  //     if not supplied, the original |data| value will be used.
  //
  // _addMethodWithPromise2(name, promise, wrapArgs?, wrapReturns?):
  //     The diff with _addMethodWithPromise is that _addMethodWithPromise2's wrapArgs
  //     will return a Promise type, in which usually have async event to process.
  //     And _addMethodWithPromise's wrapArgs will return an array type value
  //     which is a sync function.
  //     Convenience function for adding methods that return a Promise. The reply
  //     from the native side is expected to have two parameters: |data| and |error|.
  //     The optional wrapArgs which will return a Promise,
  //     if supplied, will be used to custom the arguments,
  //     if not supplied, the original arguments will be used.
  //     The optional wrapReturns, if supplied, will be used to custom |data| value,
  //     if not supplied, the original |data| value will be used.
  //
  // _addBinaryMethodWithPromise2(name, promise, wrapArgs, wrapReturns?):
  //     The diff with _addMethodWithPromise2 is that this method will post
  //     binary message to native side. It requires that the method arguments must
  //     be customed to an ArrayBuffer by wrapArgs.
  //     Convenience function for adding methods that return a Promise. The reply
  //     from the native side is expected to have two parameters: |data| and |error|.
  //     wrapArgs will be used to custom the arguments to an ArrayBuffer,
  //     The optional wrapReturns, if supplied, will be used to custom |data| value,
  //     if not supplied, the original |data| value will be used.
  //

  var BindingObjectPrototype = function() {
    function postMessage(name, args, callback) {
      return internal.postMessage('postMessageToObject',
          [this._id, name, args], callback);
    };

    function postBinaryMessage(name, arrayBuffer, callback) {
      if (!(arrayBuffer instanceof ArrayBuffer)) {
        return callback(null, 'The argument is not an ArrayBuffer');
      }
      return internal.postBinaryMessage('postMessageToObject',
          [this._id, name, arrayBuffer], callback);
    };

    function isEnumerable(method_name) {
      return name.indexOf('_') != 0;
    };

    function addMethod(name, has_callback) {
      Object.defineProperty(this, name, {
        value: function() {
          var args = Array.prototype.slice.call(arguments);

          var callback;
          if (has_callback)
            callback = args.pop();

          this._postMessage(name, args, callback);
        },
        enumerable: isEnumerable(name),
      });
    };

    function sendMsg(self, name, args, wrapReturns, wrapErrorResult) {
      return new Promise(function(resolve, reject) {
        self._postMessage(name, args, function(data, error) {
          if (error) {
            if (wrapErrorResult) {
              reject(wrapErrorResult(error));
            } else {
              reject(error);
            }
          } else {
            if (wrapReturns) {
              resolve(wrapReturns(data));
            } else {
              resolve(data);
            }
          }
        });
      });
    };

    function sendBinaryMsg(self, name, arrayBuffer, wrapReturns, wrapErrorResult) {
      return new Promise(function(resolve, reject) {
        self._postBinaryMessage(name, arrayBuffer, function(data, error) {
          if (error) {
            if (wrapErrorResult) {
              reject(wrapErrorResult(error));
            } else {
              reject(error);
            }
          } else {
            if (wrapReturns) {
              resolve(wrapReturns(data));
            } else {
              resolve(data);
            }
          }
        });
      });
    };

    function addMethodWithPromise(name, wrapArgs, wrapReturns, wrapErrorResult) {
      Object.defineProperty(this, name, {
        value: function() {
          var args = Array.prototype.slice.call(arguments);
          if (wrapArgs) {
            args = wrapArgs(args);
            if (!args) {
              return new Promise(function(resolve, reject) {
                reject('Package the parameters failed. Invalid parameters');
              });
            }
          }
          return sendMsg(this, name, args, wrapReturns, wrapErrorResult);
        },
        enumerable: isEnumerable(name),
      });
    };

    function addBinaryMethodWithPromise(name, wrapArgs, wrapReturns, wrapErrorResult) {
      Object.defineProperty(this, name, {
        value: function() {
          var args = Array.prototype.slice.call(arguments);
          var arrayBuffer = wrapArgs(args);
          if (!arrayBuffer) {
            return new Promise(function(resolve, reject) {
              reject('Package the parameters failed. Invalid parameters');
            });
          }
          return sendBinaryMsg(this, name, arrayBuffer, wrapReturns, wrapErrorResult);
        },
        enumerable: isEnumerable(name),
      });
    };

    function addMethodWithPromise2(name, wrapArgs, wrapReturns, wrapErrorResult) {
      Object.defineProperty(this, name, {
        value: function() {
          var self = this;
          var args = Array.prototype.slice.call(arguments);
          if (wrapArgs) {
            return wrapArgs(args).then(function(resultData) {
              if (!resultData)
                return new Promise(function(resolve, reject) {
                  reject('Package the parameters failed. Invalid parameters');
                });
              return sendMsg(self, name, resultData, wrapReturns, wrapErrorResult);
            });
          }
          return sendMsg(self, name, args, wrapReturns);
        },
        enumerable: isEnumerable(name),
      });
    };

    function addBinaryMethodWithPromise2(name, wrapArgs, wrapReturns, wrapErrorResult) {
      Object.defineProperty(this, name, {
        value: function() {
          var self = this;
          var args = Array.prototype.slice.call(arguments);
          return wrapArgs(args).then(function(arrayBuffer) {
            if (!arrayBuffer)
              return new Promise(function(resolve, reject) {
                reject('Package the parameters failed. Invalid parameters');
              });
            return sendBinaryMsg(self, name, arrayBuffer, wrapReturns, wrapErrorResult);
          });
        },
        enumerable: isEnumerable(name),
      });
    };

    function registerLifecycleTracker() {
      Object.defineProperty(this, '_tracker', {
        value: v8tools.lifecycleTracker(),
      });

      var object_id = this._id;
      this._tracker.destructor = function() {
        internal.postMessage('JSObjectCollected', [object_id]);
      };
    }

    Object.defineProperties(this, {
      '_postMessage' : {
        value: postMessage,
      },
      '_postBinaryMessage': {
        value: postBinaryMessage,
      },
      '_addMethod' : {
        value: addMethod,
      },
      '_addMethodWithPromise' : {
        value: addMethodWithPromise,
      },
      '_addBinaryMethodWithPromise': {
        value: addBinaryMethodWithPromise,
      },
      '_addMethodWithPromise2': {
        value: addMethodWithPromise2,
      },
      '_addBinaryMethodWithPromise2': {
        value: addBinaryMethodWithPromise2,
      },
      '_registerLifecycleTracker' : {
        value: registerLifecycleTracker,
      },
    });
  };

  var BindingObject = function(object_id) {
    Object.defineProperties(this, {
      '_id': {
        value: object_id,
      },
    });
  };

  // This class implements the W3C EventTarget interface and also offers
  // convenience methods for declaring events. The native implementation class is
  // expected to inherit from xwalk::common::EventTarget.
  //
  // The following interface will be always publicly available for every object
  // using this prototype and they behave just like the specified:
  //
  // addEventListener(type, listener)
  // removeEventListener(type, listener)
  // dispatchEvent(event)
  //
  // The following method is available for internal usage only:
  //
  // _addEvent(event_name, EventSynthesizer?):
  //     Convenience function for declaring the events available for the
  //     EventTarget. It will also declare a functional on[type] EventHandler.
  //     The optional EventSynthesizer, if supplied, will be used for create
  //     the event, if not supplied, a default MessageEvent is created (the data
  //     is simply associated to event.data).
  //
  // Important considerations:
  //    - Objects with message listeners attached are never going to be collected
  //      by the garbage collector (which is fine and expected).
  //    - That said, an object listening for its own events is going to leak. It
  //      can be solved by creating a proxy object (see TCPSocket).
  //
  var EventTargetPrototype = function() {
    var DefaultEvent = function(type, data) {
      this.type = type;

      if (data)
        this.data = data;
    };

    function addEvent(type, event) {
      Object.defineProperty(this, '_on' + type, {
        writable: true,
      });

      Object.defineProperty(this, 'on' + type, {
        get: function() {
          return this['_on' + type];
        },
        set: function(listener) {
          var old_listener = this['_on' + type];
          if (old_listener === listener)
            return;

          if (old_listener)
            this.removeEventListener(type, old_listener);

          this['_on' + type] = listener;
          this.addEventListener(type, listener);
        },
        enumerable: true,
      });

      if (event)
        this._event_synthesizers[type] = event;
      else
        this._event_synthesizers[type] = DefaultEvent;
    };

    function dispatchEvent(event) {
      if (!event.type)
        return;
      if (!(event.type in this._event_listeners))
        return;

      var listeners = this._event_listeners[event.type];
      for (var i in listeners)
        listeners[i](event);
    };

    function dispatchEventFromExtension(type, data) {
      var listeners = this._event_listeners[type];

      for (var i in listeners)
        listeners[i](new this._event_synthesizers[type](type, data));
    };

    // We need a reference to the calling object because
    // this function is called by the renderer process with
    // "this" equals to the global object.
    function makeCallbackListener(obj, type) {
      return function(data) {
        obj._dispatchEventFromExtension(type, data);
        return true;
      };
    };

    function addEventListener(type, listener) {
      if (!(listener instanceof Function))
        return;

      if (!(('on' + type) in this))
        return;

      if (type in this._event_listeners) {
        var listeners = this._event_listeners[type];
        if (listeners.indexOf(listener) == -1)
          listeners.push(listener);
      } else {
        this._event_listeners[type] = [listener];
        var id = this._postMessage('addEventListener',
            [type], makeCallbackListener(this, type));
        this._callback_listeners_id[type] = id;
      }
    };

    function removeEventListener(type, listener) {
      if (!(listener instanceof Function))
        return;

      if (!(type in this._event_listeners))
        return;

      var listeners = this._event_listeners[type];
      var index = listeners.indexOf(listener);
      if (index == -1)
        return;

      if (listeners.length == 1) {
        internal.removeCallback(this._callback_listeners_id[type]);
        delete this._event_listeners[type];
        delete this._callback_listeners_id[type];
        this._postMessage('removeEventListener', [type]);
      } else {
        listeners.splice(index, 1);
      }
    };

    Object.defineProperties(this, {
      '_addEvent' : {
        value: addEvent,
      },
      '_dispatchEventFromExtension' : {
        value: dispatchEventFromExtension,
      },
      'addEventListener' : {
        value: addEventListener,
        enumerable: true,
      },
      'removeEventListener' : {
        value: removeEventListener,
        enumerable: true,
      },
      'dispatchEvent' : {
        value: dispatchEvent,
        enumerable: true,
      },
    });
  };

  var EventTarget = function(object_id) {
    Object.defineProperties(this, {
      '_event_listeners': {
        value: {},
      },
      '_callback_listeners_id': {
        value: {},
      },
      '_event_synthesizers': {
        value: {},
      },
    });
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
