md build
md build\tmp
md build\tmp\mp3
md build\tmp\model
copy icon.ico           build\tmp
copy icon.png           build\tmp
copy 9.html             build\tmp
copy 6_vert.js          build\tmp
copy 6_frag.js          build\tmp
copy 9_vert.js          build\tmp
copy 9_frag.js          build\tmp
copy common.js          build\tmp
copy gameCommon.js      build\tmp
copy loadObjMtl.js      build\tmp
copy texture.js         build\tmp
copy nwjs\api.js        build\tmp
copy nwjs\app.json      build\tmp\app.json
copy nwjs\package.json  build\tmp\package.nwjs.json
copy package.json       build\tmp\package.babylon.json
copy package-lock.json  build\tmp
copy model\*.*          build\tmp\model

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
