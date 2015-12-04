// Copyright (c) 2015 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "xwalk/common/xwalk_extension_function_handler.h"

#include "base/location.h"
#include "base/json/json_string_value_serializer.h"
#include "base/strings/string_number_conversions.h"

namespace xwalk {
namespace common {

namespace {

int AlignedWith4Bytes(int length) {
  return length + (4 - length % 4);
}

}  // namespece

XWalkExtensionFunctionInfo::XWalkExtensionFunctionInfo(
    const std::string& name,
    scoped_ptr<base::ListValue> arguments,
    const PostResultCallback& post_result_cb)
  : name_(name),
    arguments_(arguments.Pass()),
    post_result_cb_(post_result_cb) {}

XWalkExtensionFunctionInfo::~XWalkExtensionFunctionInfo() {}

XWalkExtensionFunctionHandler::XWalkExtensionFunctionHandler(
    Instance* instance)
  : instance_(instance),
    weak_factory_(this) {}

XWalkExtensionFunctionHandler::~XWalkExtensionFunctionHandler() {}

void XWalkExtensionFunctionHandler::HandleBinaryMessage(
    scoped_ptr<base::Value> msg) {
  const base::BinaryValue* binary_msg = nullptr;
  if (!msg->GetAsBinary(&binary_msg)) {
    LOG(WARNING) << "Invalid msg type.";
    return;
  }

  char* buffer = const_cast<char*>(binary_msg->GetBuffer());
  int* int_array = reinterpret_cast<int*>(buffer);
  int func_name_len = int_array[0];
  int aligned_func_name_len = AlignedWith4Bytes(func_name_len);

  int offset = sizeof(int);
  std::string func_name(buffer + offset, func_name_len);

  offset += aligned_func_name_len;
  int_array = reinterpret_cast<int*>(buffer + offset);
  int callback_id = int_array[0];
  int object_id_len = int_array[1];
  int aligned_object_id_len = AlignedWith4Bytes(object_id_len);

  offset += 2 * sizeof(int);
  std::string object_id(buffer + offset, object_id_len);

  offset += aligned_object_id_len;
  int_array = reinterpret_cast<int*>(buffer + offset);
  int method_name_len = int_array[0];
  int aligned_method_name_len = AlignedWith4Bytes(method_name_len);

  offset += sizeof(int);
  std::string method_name(buffer + offset, method_name_len);

  offset += aligned_method_name_len;
  char* method_args = buffer + offset;
  size_t size = binary_msg->GetSize() - offset;
  base::BinaryValue* args =
      base::BinaryValue::CreateWithCopiedBuffer(method_args, size);

  scoped_ptr<base::ListValue> arguments(new base::ListValue());
  arguments->Insert(0, new base::StringValue(object_id));
  arguments->Insert(1, new base::StringValue(method_name));
  arguments->Insert(2, args);
  scoped_ptr<XWalkExtensionFunctionInfo> info(
      new XWalkExtensionFunctionInfo(
          func_name,
          arguments.Pass(),
          base::Bind(&XWalkExtensionFunctionHandler::DispatchResult,
                     weak_factory_.GetWeakPtr(),
                     base::MessageLoopProxy::current(),
                     false,
                     std::to_string(callback_id))));

  if (!HandleFunction(info.Pass())) {
    DLOG(WARNING) << "Function not registered: " << func_name;
    return;
  }
}

void XWalkExtensionFunctionHandler::HandleMessage(scoped_ptr<base::Value> msg) {
  base::ListValue* args;
  if (!msg->GetAsList(&args) || args->GetSize() < 2) {
    // FIXME(tmpsantos): This warning could be better if the Context had a
    // pointer to the Extension. We could tell what extension sent the
    // invalid message.
    LOG(WARNING) << "Invalid number of arguments.";
    return;
  }

  // The first parameter stands for the function signature.
  std::string function_name;
  if (!args->GetString(0, &function_name)) {
    LOG(WARNING) << "The function name is not a string.";
    return;
  }

  // The second parameter stands for callback id, the remaining
  // ones are the function arguments.
  std::string callback_id;
  if (!args->GetString(1, &callback_id)) {
    LOG(WARNING) << "The callback id is not a string.";
    return;
  }

  // We reuse args to pass the extra arguments to the handler, so remove
  // function_name and callback_id from it.
  args->Remove(0, NULL);
  args->Remove(0, NULL);

  scoped_ptr<XWalkExtensionFunctionInfo> info(
      new XWalkExtensionFunctionInfo(
          function_name,
          make_scoped_ptr(static_cast<base::ListValue*>(msg.release())),
          base::Bind(&XWalkExtensionFunctionHandler::DispatchResult,
                     weak_factory_.GetWeakPtr(),
                     base::MessageLoopProxy::current(),
                     false,
                     callback_id)));

  if (!HandleFunction(info.Pass())) {
    DLOG(WARNING) << "Function not registered: " << function_name;
    return;
  }
}

void XWalkExtensionFunctionHandler::HandleSyncMessage(
    scoped_ptr<base::Value> msg) {
  base::ListValue* args;
  scoped_ptr<base::Value> result(new base::FundamentalValue(false));
  if (!msg->GetAsList(&args) || args->GetSize() < 2) {
    SendSyncMessageToInstance(result.Pass());
    return;
  }

  // The first parameter stands for the function name.
  std::string function_name;
  if (!args->GetString(0, &function_name)) {
    LOG(WARNING) << "The function name is not a string.";
    SendSyncMessageToInstance(result.Pass());
    return;
  }

  // We reuse args to pass the extra arguments to the handler, so remove
  // function_name from it.
  args->Remove(0, NULL);

  scoped_ptr<XWalkExtensionFunctionInfo> info(
      new XWalkExtensionFunctionInfo(
          function_name,
          make_scoped_ptr(static_cast<base::ListValue*>(msg.release())),
          base::Bind(&XWalkExtensionFunctionHandler::DispatchResult,
                     weak_factory_.GetWeakPtr(),
                     base::MessageLoopProxy::current(),
                     true,
                     "")));

  if (!HandleFunction(info.Pass())) {
    DLOG(WARNING) << "Function not registered: " << function_name;
    SendSyncMessageToInstance(result.Pass());
    return;
  }
}

bool XWalkExtensionFunctionHandler::HandleFunction(
    scoped_ptr<XWalkExtensionFunctionInfo> info) {
  FunctionHandlerMap::iterator iter = handlers_.find(info->name());
  if (iter == handlers_.end())
    return false;

  iter->second.Run(info.Pass());

  return true;
}

// static
void XWalkExtensionFunctionHandler::DispatchResult(
    const base::WeakPtr<XWalkExtensionFunctionHandler>& handler,
    scoped_refptr<base::MessageLoopProxy> client_task_runner,
    const bool isSyncMessage,
    const std::string& callback_id,
    scoped_ptr<base::Value> result) {
  DCHECK(result);

  if (client_task_runner != base::MessageLoopProxy::current()) {
    client_task_runner->PostTask(FROM_HERE,
        base::Bind(&XWalkExtensionFunctionHandler::DispatchResult,
                   handler,
                   client_task_runner,
                   isSyncMessage,
                   callback_id,
                   base::Passed(&result)));
    return;
  }

  if (isSyncMessage) {
    handler->SendSyncMessageToInstance(result.Pass());
    return;
  }

  if (callback_id.empty()) {
    DLOG(WARNING) << "Sending a reply with an empty callback id has no"
        "practical effect. This code can be optimized by not creating "
        "and not posting the result.";
    return;
  }

  base::ListValue* result_list(new base::ListValue());
  if (!result->GetAsList(&result_list)) {
    std::string error =
        "The result type is not a base::ListValue with [data, error]";
    result_list->Append(new base::StringValue(std::string()));
    result_list->Append(new base::StringValue(error));
  }
  // Prepend the callback id to the list, so the handlers
  // on the JavaScript side know which callback should be evoked.
  result_list->Insert(0, new base::StringValue(callback_id));

  if (handler)
    handler->PostMessageToInstance(result.Pass());
}

void XWalkExtensionFunctionHandler::PostMessageToInstance(
    scoped_ptr<base::Value> msg) {
  base::ListValue* args;
  if (msg->GetAsList(&args)) {
    base::BinaryValue* binary;
    if (args->GetBinary(1, &binary)) {
      std::string callback_id;
      if (args->GetString(0, &callback_id)) {
        int id;
        if (base::StringToInt(callback_id, &id)) {
          char* buffer = binary->GetBuffer();
          size_t size = binary->GetSize();
          memcpy(buffer, &id, sizeof(int));
          instance_->PostBinaryMessage(buffer, size);
        }
      }
    } else {
      std::string value;
      JSONStringValueSerializer serializer(&value);
      serializer.SerializeAndOmitBinaryValues(*msg);
      instance_->PostMessage(value.c_str());
    }
  }
}

void XWalkExtensionFunctionHandler::SendSyncMessageToInstance(
    scoped_ptr<base::Value> result) {
  std::string value;
  JSONStringValueSerializer serializer(&value);
  serializer.SerializeAndOmitBinaryValues(*result);
  instance_->SendSyncReply(value.c_str());
}

}  // namespace common
}  // namespace xwalk
