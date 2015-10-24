// Copyright (c) 2015 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.xwalk.extensions.common;

import android.util.Log;

import java.lang.Character;
import java.lang.reflect.Method;
import java.lang.reflect.InvocationTargetException;
import java.util.HashMap;
import java.util.Map;

public class FunctionHandler {
    private String TAG = "FunctionHandler";
    private Map<String, Object> mHandlers;

    public FunctionHandler() {
        mHandlers = new HashMap<String, Object>();
    }

    public void handleFunction(FunctionInfo info) {
        Method method;
        String functionName = info.getFunctionName();
        Object obj = mHandlers.get(functionName);
        if (obj == null) {
            Log.w(TAG, "Cannot find handler for method " + functionName);
            return;
        }
        try {
            String methodName =
                    "on" + Character.toUpperCase(functionName.charAt(0)) + functionName.substring(1);
            method = obj.getClass().getMethod(methodName, FunctionInfo.class);
            method.invoke(obj, info);
        } catch (SecurityException e) {
            Log.e(TAG, e.toString());
        } catch (NoSuchMethodException e) {
            Log.e(TAG, e.toString());
        } catch (IllegalArgumentException e) {
            Log.e(TAG, e.toString());
        } catch (IllegalAccessException e) {
            Log.e(TAG, e.toString());
        } catch (InvocationTargetException e) {
            Log.e(TAG, e.toString());
        }
    }

    public void register(String functionName, Object obj) {
        if (mHandlers.containsKey(functionName)) {
            Log.w(TAG, "Existing handler for " + functionName);
            return;
        }

        mHandlers.put(functionName, obj);
        return;
    }
}
