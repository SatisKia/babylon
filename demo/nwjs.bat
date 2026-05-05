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
rem Merge package.json and install web deps
powershell -NoProfile -ExecutionPolicy Bypass -Command "$base=Get-Content '.\package.base.json' -Raw | ConvertFrom-Json; $app=Get-Content '.\app.json' -Raw | ConvertFrom-Json; $web=Get-Content '.\package.web.json' -Raw | ConvertFrom-Json; foreach($p in $app.PSObject.Properties){ $base | Add-Member -Force NoteProperty $p.Name $p.Value }; if($base.window -and $base.window.PSObject.Properties.Name -contains 'icon'){ $base.window.PSObject.Properties.Remove('icon') }; if($null -eq $base.dependencies){$base | Add-Member -Force NoteProperty dependencies @{} }; $base.dependencies=$web.dependencies; $base | Add-Member -Force NoteProperty nwbuild @{ mode='build'; glob=$false; version='0.79.1'; platform='win'; arch='x64'; app=@{ icon='icon.ico' } }; $json=$base | ConvertTo-Json -Depth 20; $out = Join-Path (Get-Location) 'package.json'; [System.IO.File]::WriteAllText($out, $json, (New-Object System.Text.UTF8Encoding($false)))"
call npm install --production
@echo on
cd ..
call nwbuild --version=0.79.1 --platform=win --arch=x64 --glob=false tmp
@echo on
cd ..

pause
