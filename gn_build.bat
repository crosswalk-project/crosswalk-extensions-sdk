@echo off

set BUILDTYPE=Release
if /i "%1" EQU "/debug" set BUILDTYPE=Debug

REM Fix GN issue on Windows, crbug.com/460462
set DEPOT_TOOLS_WIN_TOOLCHAIN=0
set GYP_MSVS_VERSION=2013
set GYP_MSVS_OVERRIDE_PATH=C:\Program Files (x86)\Microsoft Visual Studio 12.0

gn gen out\%BUILDTYPE%_x64_gn & ninja -C out\%BUILDTYPE%_x64_gn :all_extensions
