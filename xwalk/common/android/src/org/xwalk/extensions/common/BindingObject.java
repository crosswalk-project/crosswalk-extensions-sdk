// Copyright (c) 2015 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package org.xwalk.extensions.common;

import android.util.Log;

public class BindingObject {
    private String TAG = "BindingObject";
    protected FunctionHandler mHandler;

    public BindingObject() {
        mHandler = new FunctionHandler();
    }

    public void handleFunction(FunctionInfo info) {
        mHandler.handleFunction(info);
    }

    public void onStart() {}
    public void onResume() {}
    public void onPause() {}
    public void onStop() {}
    public void onDestroy() {}
}
