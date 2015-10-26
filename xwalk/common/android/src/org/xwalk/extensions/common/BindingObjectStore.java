// Copyright (c) 2015 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.xwalk.extensions.common;

import android.util.Log;

import java.lang.Byte;
import java.lang.Integer;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.HashMap;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class BindingObjectStore {
    private String TAG = "BindingObjectStore";
    private Map<String, BindingObject> mBindingObjects;

    public BindingObjectStore(FunctionHandler handler) {
        mBindingObjects = new HashMap<String, BindingObject>();
        handler.register("JSObjectCollected", this);
        handler.register("postMessageToObject", this);
    }

    public boolean addBindingObject(String objectId, BindingObject obj) {
        if (mBindingObjects.containsKey(objectId)) {
            Log.w(TAG, "Existing binding object:\n" + objectId);
            return false;
        }

        mBindingObjects.put(objectId, obj);
        return true;
    }

    public BindingObject getBindingObject(String objectId) {
       return mBindingObjects.get(objectId);
    }

    public BindingObject removeBindingObject(String objectId) {
       BindingObject obj = mBindingObjects.remove(objectId);

       return obj;
    }

    public void onJSObjectCollected(FunctionInfo info) {
        removeBindingObject(info.getObjectId());
    }

    public void onPostMessageToObject(FunctionInfo info) {
        try {
            BindingObject obj = getBindingObject(info.getObjectId());

            FunctionInfo newInfo = new FunctionInfo(info);
            if (info.getArgs() != null) {
                JSONArray args = info.getArgs();
                String objectMethodName = args.getString(0);
                JSONArray objectMethodArgs = args.getJSONArray(1);
                newInfo.setFunctionName(objectMethodName);
                newInfo.setArgs(objectMethodArgs);
            } else {
                ByteBuffer args = info.getBinaryArgs();
                args.order(ByteOrder.LITTLE_ENDIAN);
                int byteOffset = args.position();
                int methodNameLen = args.getInt(byteOffset);
                byteOffset += Integer.SIZE / Byte.SIZE;
                int alignedMethodNameLen = methodNameLen + (4 - methodNameLen % 4);
                String objectMethodName = new String(args.array(), byteOffset, methodNameLen);
                byteOffset += alignedMethodNameLen;
                int len = args.array().length - byteOffset;
                ByteBuffer objectMethodArgs = ByteBuffer.wrap(args.array(), byteOffset, len);
                newInfo.setFunctionName(objectMethodName);
                newInfo.setBinaryArgs(objectMethodArgs);
            }
            if (obj != null)
                obj.handleFunction(newInfo);
        } catch (JSONException e) {
            Log.e(TAG, e.toString());
        } catch (IndexOutOfBoundsException e) {
            Log.e(TAG, e.toString());
        } catch (NullPointerException e) {
            Log.e(TAG, e.toString());
        }
    }

    public void onStart() {
        for (Map.Entry<String, BindingObject> entry : mBindingObjects.entrySet()) {
            BindingObject obj = entry.getValue();
            obj.onStart();
        }
    }

    public void onResume() {
        for (Map.Entry<String, BindingObject> entry : mBindingObjects.entrySet()) {
            BindingObject obj = entry.getValue();
            obj.onResume();
        }
    }

    public void onPause() {
        for (Map.Entry<String, BindingObject> entry : mBindingObjects.entrySet()) {
            BindingObject obj = entry.getValue();
            obj.onPause();
        }
    }

    public void onStop() {
        for (Map.Entry<String, BindingObject> entry : mBindingObjects.entrySet()) {
            BindingObject obj = entry.getValue();
            obj.onStop();
        }
    }

    public void onDestroy() {
        for (Map.Entry<String, BindingObject> entry : mBindingObjects.entrySet()) {
            BindingObject obj = entry.getValue();
            obj.onDestroy();
        }
    }
}
