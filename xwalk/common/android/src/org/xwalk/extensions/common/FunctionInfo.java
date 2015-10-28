// Copyright (c) 2015 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.xwalk.extensions.common;

import android.util.Log;

import java.lang.Byte;
import java.lang.Integer;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

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
    private ByteBuffer mBinaryArgs;

    private int  AlignedWith4Bytes(int length) {
        return length + (4 - length % 4);
    }

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

    public FunctionInfo(
            XWalkExtensionClient extension, int instanceId, byte[] message) {
        mExtension = extension;
        mInstanceId = instanceId;
        try {
            mArgs = null;
            ByteBuffer buf = ByteBuffer.wrap(message);
            if (buf.order() != ByteOrder.LITTLE_ENDIAN) {
                buf.order(ByteOrder.LITTLE_ENDIAN);
            }

            int byteOffset = buf.position();
            int byteCountOfInt = Integer.SIZE / Byte.SIZE;
            int funcNameLen = buf.getInt(byteOffset);
            int alignedFuncNameLen = AlignedWith4Bytes(funcNameLen);
            byteOffset += byteCountOfInt;
            mFunctionName = new String(message, byteOffset, funcNameLen);
            byteOffset += alignedFuncNameLen;
            mCallbackId = Integer.toString(buf.getInt(byteOffset));
            byteOffset += byteCountOfInt;
            int objectIdLen = buf.getInt(byteOffset);
            int alignedObjectIdLen = AlignedWith4Bytes(objectIdLen);
            byteOffset += byteCountOfInt;
            mObjectId = new String(message, byteOffset, objectIdLen);
            byteOffset += alignedObjectIdLen;
            int len = message.length - byteOffset;
            mBinaryArgs = ByteBuffer.wrap(message, byteOffset, len);
        } catch (IndexOutOfBoundsException e) {
            Log.e(TAG, e.toString());
        } catch (NullPointerException e) {
            Log.e(TAG, e.toString());
        }
    }

    public String getFunctionName() { return mFunctionName; }
    public void setFunctionName(String functionName) { mFunctionName = functionName; }

    public JSONArray getArgs() { return mArgs; }
    public void setArgs(JSONArray args) { mArgs = args; }

    public ByteBuffer getBinaryArgs() { return mBinaryArgs; }
    public void setBinaryArgs(ByteBuffer args) { mBinaryArgs = args; }

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
