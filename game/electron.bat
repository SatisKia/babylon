md build
md build\tmp
md build\tmp\mp3
md build\tmp\model
copy 9.html                build\tmp
copy 6_vert.js             build\tmp
copy 6_frag.js             build\tmp
copy 9_vert.js             build\tmp
copy 9_frag.js             build\tmp
copy common.js             build\tmp
copy gameCommon.js         build\tmp
copy loadObjMtl.js         build\tmp
copy texture.js            build\tmp
copy electron\index.js     build\tmp
copy electron\package.json build\tmp\package.base.json
copy package.json          build\tmp\package.web.json
copy package-lock.json     build\tmp
copy model\*.*             build\tmp\model

cd build\tmp
rem Merge package.json and install web deps
powershell -NoProfile -ExecutionPolicy Bypass -Command "$base=Get-Content '.\package.base.json' -Raw | ConvertFrom-Json; $web=Get-Content '.\package.web.json' -Raw | ConvertFrom-Json; if($null -eq $base.dependencies){$base | Add-Member -Force NoteProperty dependencies @{} }; $base.dependencies=$web.dependencies; $base | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 '.\package.json'"
call npm install
cd ..\..

cd build
set NODE_TLS_REJECT_UNAUTHORIZED=0
call electron-packager ./tmp babylon_game --app-version=0.0.1 --electron-version=24.1.3 --platform=win32 --arch=x64 --overwrite
@echo on
cd ..

copy model\*.* build\babylon_game-win32-x64\resources\app\model

pause
