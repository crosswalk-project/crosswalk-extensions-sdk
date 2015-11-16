# Copyright (c) 2010 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
{
  'targets': [
    {
      'target_name': 'android_java',
      'type' : 'none',
      'variables': {
        'jar_path': '<(android_sdk)/android.jar',
        'exclude_from_apk': 1,
      },
      'includes': ['../../build/java_prebuilt.gypi'],
    },
    {
      'target_name': 'android_gcm',
      'type' : 'none',
      'variables': {
        'jar_path': '<(android_sdk_root)/extras/google/gcm/gcm-client/dist/gcm.jar',
      },
      'includes': ['../../build/java_prebuilt.gypi'],
    },
    {
      'target_name': 'uiautomator_jar',
      'type': 'none',
      'variables': {
        'jar_path': '<(android_sdk)/uiautomator.jar',
        # uiautomator is provided by the framework.
        'neverlink': 1,
      },
      'includes': ['../../build/java_prebuilt.gypi'],
    },
    {
      # This jar contains the Android support v13 library from the revision 18
      # of the Android Support library.
      'target_name': 'android_support_v13_javalib',
      'type' : 'none',
      'variables': {
        'jar_path': '<(android_sdk_root)/extras/android/support/v13/android-support-v13.jar',
      },
      'includes': ['../../build/java_prebuilt.gypi'],
    },
    {
      # This jar contains the Android support v7 appcompat library from the
      # revision 18 of the Android Support library. This library doesn't
      # contain the resources needed for the library to work.
      # TODO(avayvod): Add the resources directly once crbug.com/274697 is
      # fixed.
      'target_name': 'android_support_v7_appcompat_javalib_no_res',
      'type' : 'none',
      'variables': {
        'jar_path': '<(android_sdk_root)/extras/android/support/v7/appcompat/libs/android-support-v7-appcompat.jar',
      },
      'includes': ['../../build/java_prebuilt.gypi'],
    },
    {
      # This jar contains the Android support v7 mediarouter library from the
      # revision 18 of the Android Support library. This library doesn't
      # contain the resources needed for the library to work.
      # TODO(avayvod): Add the resources directly once crbug.com/274697 is
      # fixed.
      'target_name': 'android_support_v7_mediarouter_javalib_no_res',
      'type' : 'none',
      'variables': {
        'jar_path': '<(android_sdk_root)/extras/android/support/v7/mediarouter/libs/android-support-v7-mediarouter.jar',
      },
      'includes': ['../../build/java_prebuilt.gypi'],
    },
    {
      # This jar contains the Google Play services library without the
      # resources needed for the library to work.
      'target_name': 'google_play_services_default_javalib_no_res',
      'type': 'none',
      'variables': {
        'jar_path': '<(android_sdk_root)/extras/google/google_play_services/libproject/google-play-services_lib/libs/google-play-services.jar',
        # TODO(aberent): Remove this after some appropriate period of time.
        '__check_that_google_play_services_is_installed':
          '<!(test -e <(jar_path) -o -z "                                                            \
                                                                                                     \
              google-play-services.jar not found. Please re-run build/install-build-deps-android.sh. \
              See https://groups.google.com/a/chromium.org/forum/#!topic/chromium-dev/bN0CgZTm3t8    \
                                                                                                     \
          ")',
      },
      'dependencies': [
        'android_support_v13_javalib'
      ],
      'includes': ['../../build/java_prebuilt.gypi'],
    },
    {
      # This target contains the Android support v7 appcompat library with the
      # resources needed.
      'target_name': 'android_support_v7_appcompat_javalib',
      'type': 'none',
      'variables': {
        'java_in_dir': '<(android_sdk_root)/extras/android/support/v7/appcompat',
        'R_package': ['android.support.v7.appcompat'],
        'R_package_relpath': ['android/support/v7/appcompat'],
        'has_java_resources': 1,
        'res_v14_verify_only': 1,
      },
      'dependencies': [
        'android_support_v7_appcompat_javalib_no_res',
      ],
      'includes': [ '../../build/java.gypi' ]
    },
    {
      # This target contains the Android support v7 mediarouter library with the
      # resources needed.
      'target_name': 'android_support_v7_mediarouter_javalib',
      'type': 'none',
      'variables': {
        'java_in_dir': '<(android_sdk_root)/extras/android/support/v7/mediarouter',
        'R_package': ['android.support.v7.mediarouter'],
        'R_package_relpath': ['android/support/v7/mediarouter'],
        'has_java_resources': 1,
        'res_v14_verify_only': 1,
      },
      'dependencies': [
        'android_support_v7_mediarouter_javalib_no_res',
        'android_support_v7_appcompat_javalib',
      ],
      'includes': [ '../../build/java.gypi' ]
    },
    {
      # This jar contains the Android support v7 recyclerview library from the
      # revision 21 of the Android Support library. This library doesn't
      # contain the resources needed for the library to work.
      'target_name': 'android_support_v7_recyclerview_javalib',
      'type' : 'none',
      'variables': {
        'jar_path': '<(android_sdk_root)/extras/android/support/v7/recyclerview/libs/android-support-v7-recyclerview.jar',
      },
      'dependencies': [
      ],
      'includes': ['../../build/java_prebuilt.gypi'],
    },
    {
      # This target contains the Google Play services library with the
      # resources needed. It will fail to build unless you have a local
      # version of the Google Play services library (as installed by
      # install_build_deps_android.sh).
      # This target should never be used directly, since a build may need
      # to use a conflicting version of Google Play Services. Targets depending
      # on Google Play Services should depend on google_play_services_javalib to allow
      # this.
      'target_name': 'google_play_services_default_javalib',
      'type': 'none',
      'variables': {
        'java_in_dir': '<(android_sdk_root)/extras/google/google_play_services/libproject/google-play-services_lib',
        'R_package': ['com.google.android.gms'],
        'R_package_relpath': ['com/google/android/gms'],
        'has_java_resources': 1,
        'res_v14_verify_only': 1,
      },
      'dependencies': [
        'google_play_services_default_javalib_no_res',
      ],
      'includes': ['../../build/java.gypi'],
    },
    {
      # This target wraps the Google Play Services library, allowing the use of alternative versions of it as
      # needed. An alternative version can be selected by setting google_play_services_library_target to
      # a target that provides the alternative version.
      'target_name': 'google_play_services_javalib',
      'type': 'none',
      'dependencies': [
        '<(google_play_services_library_target)',
      ],
    },
  ],
  'variables': {'google_play_services_library_target%': 'google_play_services_default_javalib'},
}
