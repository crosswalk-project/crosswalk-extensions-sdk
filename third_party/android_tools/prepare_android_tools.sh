#!/bin/bash
# Copyright (c) 2015 Intel Corporation. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

ANDROID_NDK_VERSION=android-ndk-r10e
ANDROID_NDK_FILE=${ANDROID_NDK_VERSION}-linux-x86_64.bin
ANDROID_NDK_CHECKSUM=e28bdb459362685d5a59b8ba2ef9fff8
ANDROID_SDK_VERSION=22
ANDROID_SDK_BUILD_TOOLS_VERSION=22.0.0

prepare_ndk() {
  curl -LO http://dl.google.com/android/ndk/${ANDROID_NDK_FILE}
  chmod u+x ${ANDROID_NDK_FILE}
  ./${ANDROID_NDK_FILE} > /dev/null
  rm ${ANDROID_NDK_FILE}
  mv ${ANDROID_NDK_VERSION} ndk
}

checksum_ndk() {
  echo `find ndk -type f -exec md5sum {} + | awk '{print $1}' | sort | md5sum | awk '{print $1}'`
}

cd "$( dirname "${BASH_SOURCE[0]}" )"

echo "preparing ndk..."
if [ ! -d "ndk" ]; then
  prepare_ndk
elif [ $(checksum_ndk) != $ANDROID_NDK_CHECKSUM ]; then
  rm -rf ndk
  prepare_ndk
fi

echo "preparing sdk..."
if [ ! ${ANDROID_HOME} ]; then
  echo "Please set ANDROID_HOME to Android SDK root"
  return 1;
fi

if [ ! -d ${ANDROID_HOME}/platforms/android-${ANDROID_SDK_VERSION} ]; then
  echo y | android update sdk --all --no-ui --filter android-${ANDROID_SDK_VERSION}
fi

if [ ! -d ${ANDROID_HOME}/build-tools/${ANDROID_SDK_BUILD_TOOLS_VERSION} ]; then
  echo y | android update sdk --all --no-ui --filter build-tools-${ANDROID_SDK_BUILD_TOOLS_VERSION}
fi

if [ ! -d "sdk" ]; then
  ln -s ${ANDROID_HOME} sdk
fi

cd -

echo "done"
