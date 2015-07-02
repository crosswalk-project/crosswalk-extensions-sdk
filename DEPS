vars = {
  'chromium_git': 'https://chromium.googlesource.com',
}

use_relative_paths = True

deps = {
  'buildtools':
  Var('chromium_git') + '/chromium/buildtools.git' + '@' + '3b302fef93f7cc58d9b8168466905237484b2772',

  'testing/gmock':
  Var('chromium_git') + '/external/googlemock.git' + '@' + '29763965ab52f24565299976b936d1265cb6a271',

  'testing/gtest':
  Var('chromium_git') + '/external/googletest.git' + '@' + 'be1868139ffe0ccd0e8e3b37292b84c821d9c8ad',

  'third_party/icu':
  Var('chromium_git') + '/chromium/deps/icu.git' + '@' +'e4c31439828d356525b71ef81a6d61ea50d7d673',

  'tools/gyp':
  Var('chromium_git') + '/external/gyp.git' + '@' + '2889664b9fa88cce175c5c7cdf207d28420a7412',
}

hooks = [
  # Pull GN binaries.
  {
    'name': 'gn_win',
    'pattern': '.',
    'action': [ 'download_from_google_storage',
                '--no_resume',
                '--platform=win32',
                '--no_auth',
                '--bucket', 'chromium-gn',
                '-s', 'src/buildtools/win/gn.exe.sha1',
    ],
  },
  {
    'name': 'gn_linux64',
    'pattern': '.',
    'action': [ 'download_from_google_storage',
                '--no_resume',
                '--platform=linux*',
                '--no_auth',
                '--bucket', 'chromium-gn',
                '-s', 'src/buildtools/linux64/gn.sha1',
    ],
  },
  # TODO: Switch to GN later.
  {
    "name": "gyp_all",
    "pattern": ".",
    "action": ["python", "src/gyp_all"],
  }
]
