// Copyright (c) 2013 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef REALSENSE_COMMON_EVENT_TARGET_H_
#define REALSENSE_COMMON_EVENT_TARGET_H_

#include <map>
#include <string>
#include "realsense/common/binding_object.h"

namespace realsense {
namespace common {

// The EventTarget class is the native implementation of the W3C standard
// EventTarget (http://www.w3.org/TR/DOM-Level-3-Events/#interface-EventTarget).
// It has convenience methods and signals to make dispatching of events simple.
class EventTarget : public BindingObject {
 public:
  EventTarget();
  ~EventTarget() override;

 protected:
  // [Start|Stop]Event is called when a listener is added to the EventTarget or
  // removed respectively. This StartEvent is called only when the first
  // listener is added and StopEvent is called when the last listener is
  // removed.
  virtual void StartEvent(const std::string& type) {}
  virtual void StopEvent(const std::string& type) {}

  // DispatchEvent will send an event to the JavaScript counterpart of this
  // object and invoke its listeners. The message is only sent if there is at
  // least one listener, so it is safe to call this method without concerning
  // about performance issues.
  void DispatchEvent(const std::string& type);
  void DispatchEvent(const std::string& type, scoped_ptr<base::ListValue> data);

  bool IsEventActive(const std::string& type) const;

 private:
  void OnAddEventListener(scoped_ptr<XWalkExtensionFunctionInfo> info);
  void OnRemoveEventListener(scoped_ptr<XWalkExtensionFunctionInfo> info);

  typedef std::map<std::string,
      XWalkExtensionFunctionInfo::PostResultCallback> EventMap;

  EventMap events_;
};

}  // namespace common
}  // namespace realsense

#endif  // REALSENSE_COMMON_EVENT_TARGET_H_
