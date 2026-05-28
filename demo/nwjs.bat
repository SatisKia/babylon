md build
md build\tmp
md build\tmp\model
md build\tmp\texture
copy icon.ico          build\tmp
copy icon.png          build\tmp
copy 15.html           build\tmp
copy common.js         build\tmp
copy loadObjMtl.js     build\tmp
copy texture_witch.js  build\tmp
copy texture_mesh.js   build\tmp
copy nwjs\api.js       build\tmp
copy nwjs\app.json     build\tmp
copy nwjs\package.json build\tmp\package.nwjs.json
copy package.json      build\tmp\package.web.json
copy package-lock.json build\tmp
copy model\*.*         build\tmp\model
copy texture\mesh.png  build\tmp\texture

set NODE_TLS_REJECT_UNAUTHORIZED=0

cd build\tmp
node ..\..\merge-package.js nwjs
call npm install --production
@echo on
cd ..
call nwbuild --glob=false tmp
@echo on
cd ..

pause
