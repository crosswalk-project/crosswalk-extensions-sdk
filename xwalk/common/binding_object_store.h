// Copyright (c) 2015 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef XWALK_COMMON_BINDING_OBJECT_STORE_H_
#define XWALK_COMMON_BINDING_OBJECT_STORE_H_

#include <map>
#include <string>
#include "base/memory/scoped_ptr.h"
#include "base/stl_util.h"
#include "xwalk/common/xwalk_extension_function_handler.h"
#include "xwalk/common/binding_object.h"

namespace xwalk {
namespace common {

// This class acts likes a container of objects that have a counterpart in
// the JavaScript context. It handles the dispatching of messages to the
// destination object based on a unique identifier associated to every
// BindingObject. This class owns the BindingObjects it is managing.
class BindingObjectStore {
 public:
  explicit BindingObjectStore(XWalkExtensionFunctionHandler* handler);
  virtual ~BindingObjectStore();

  void AddBindingObject(const std::string& id, scoped_ptr<BindingObject> obj);
  bool HasObjectForTesting(const std::string& id) const;

 private:
  // This method is invoked every time a JavaScript Binding object is collected
  // by the garbage collector, so we can also destroy the native counterpart.
  void OnJSObjectCollected(scoped_ptr<XWalkExtensionFunctionInfo> info);
  void OnPostMessageToObject(scoped_ptr<XWalkExtensionFunctionInfo> info);

  typedef std::map<std::string, BindingObject*> BindingObjectMap;
  BindingObjectMap objects_;
  STLValueDeleter<BindingObjectMap> objects_deleter_;
};

}  // namespace common
}  // namespace xwalk

#endif  // XWALK_COMMON_BINDING_OBJECT_STORE_H_
