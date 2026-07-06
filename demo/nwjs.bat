md build
md build\tmp
md build\tmp\model
md build\tmp\texture
copy icon.ico              build\tmp
copy icon.png              build\tmp
copy 15.html               build\tmp
copy common.js             build\tmp
copy loadObjMtl.js         build\tmp
copy nwjs\src\api.js       build\tmp
copy nwjs\src\package.json build\tmp\package.app.json
copy nwjs\package.json     build\tmp\package.nwjs.json
copy package.json          build\tmp\package.web.json
copy package-lock.json     build\tmp
copy model\cat.*           build\tmp\model
copy model\ground.*        build\tmp\model
copy model\mesh.*          build\tmp\model
copy model\swan.*          build\tmp\model
copy model\witch.*         build\tmp\model
copy texture\kao.jpg       build\tmp\texture
copy texture\body.jpg      build\tmp\texture
copy texture\fire.jpg      build\tmp\texture
copy texture\mesh.png      build\tmp\texture

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
