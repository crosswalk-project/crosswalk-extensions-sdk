// Copyright (c) 2015 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.xwalk.extensions.common;

import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import org.xwalk.app.runtime.extension.XWalkExtensionClient;

public class FunctionInfo {
    private String TAG = "FunctionInfo";
    private XWalkExtensionClient mExtension;
    private int mInstanceId;
    private String mFunctionName;
    private String mCallbackId;
    private String mObjectId;
    private JSONArray mArgs;

    public FunctionInfo(FunctionInfo info) {
        this.mExtension = info.mExtension;
        this.mInstanceId = info.mInstanceId;
        this.mFunctionName = info.mFunctionName;
        this.mCallbackId = info.mCallbackId;
        this.mObjectId = info.mObjectId;
        this.mArgs = info.mArgs;
    }

    public FunctionInfo(
            XWalkExtensionClient extension, int instanceId, String message) {
        mExtension = extension;
        mInstanceId = instanceId;

        try {
            mArgs = new JSONArray(message);

            mFunctionName = mArgs.getString(0);
            mCallbackId = mArgs.getString(1);
            mObjectId = mArgs.getString(2);

            mArgs.remove(0);
            mArgs.remove(0);
            mArgs.remove(0);
        } catch (JSONException e) {
            Log.e(TAG, e.toString());
        }
    }

    public String getFunctionName() { return mFunctionName; }
    public void setFunctionName(String functionName) { mFunctionName = functionName; }

    public JSONArray getArgs() { return mArgs; }
    public void setArgs(JSONArray args) { mArgs = args; }

    public String getObjectId() { return mObjectId; }
    public void setObjectId(String objectId) { mObjectId = objectId; }

    public String getCallbackId() { return mCallbackId; }
    public void setCallbackId(String callbackId) { mCallbackId = callbackId; }

    public void postResult(JSONArray args) {
        try {
            JSONArray result = new JSONArray();
            result.put(0, mCallbackId);
            for (int i = 0; i < args.length(); i++) {
                result.put(i + 1, args.get(i));
            }
            Log.w(TAG, "postResult: " + result.toString());
            mExtension.postMessage(mInstanceId, result.toString());
        } catch (JSONException e) {
            Log.e(TAG, e.toString());
        }
    }

    public void postResult(byte[] buffer) {
        mExtension.postBinaryMessage(mInstanceId, buffer);
    }
}
