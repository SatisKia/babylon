md build
md build\tmp
md build\tmp\model
copy 15.html           build\tmp
copy common.js         build\tmp
copy loadObjMtl.js     build\tmp
copy texture_witch.js  build\tmp
copy texture_mesh.js   build\tmp
copy nwjs\index.js     build\tmp
copy nwjs\package.json build\tmp\package.base.json
copy nwjs\app.json     build\tmp\app.json
copy package.json      build\tmp\package.web.json
copy package-lock.json build\tmp
copy model\*.*         build\tmp\model

set NODE_TLS_REJECT_UNAUTHORIZED=0

cd build\tmp
node ..\..\merge-package.js nwjs
call npm install --production
@echo on
cd ..
call nwbuild --version=0.79.1 --platform=win --arch=x64 --glob=false tmp
@echo on
cd ..

pause
