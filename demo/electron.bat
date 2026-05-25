md build
md build\tmp
md build\tmp\model
md build\tmp\texture
copy icon.ico              build\tmp
copy 15.html               build\tmp
copy common.js             build\tmp
copy loadObjMtl.js         build\tmp
copy texture_witch.js      build\tmp
copy texture_mesh.js       build\tmp
copy electron\index.js     build\tmp
copy electron\package.json build\tmp\package.electron.json
copy package.json          build\tmp\package.babylon.json
copy package-lock.json     build\tmp
copy model\*.*             build\tmp\model
copy texture\mesh.png      build\tmp\texture

set NODE_TLS_REJECT_UNAUTHORIZED=0

cd build\tmp
node ..\..\merge-package.js electron
call npm install
@echo on
cd ..
call electron-packager ./tmp babylon_demo --app-version=0.0.1 --electron-version=24.1.3 --platform=win32 --arch=x64 --icon=./tmp/icon.ico --overwrite
@echo on
cd ..

copy model\*.* build\babylon_demo-win32-x64\resources\app\model

pause
