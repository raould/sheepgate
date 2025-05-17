#!/usr/bin/env bash

set -euo pipefail

# ----------------------------------------

function node_warn() {
    echo "WARNING WARNING WARNING:"
    echo "Found some node processes."
    echo "If those are old sheepgate servers then manually kill them off."
}

if ps aux | grep node; then node_warn; fi
if command -v tasklist &> /dev/null; then
    if tasklist | grep node; then node_warn; fi
fi

# ----------------------------------------

echo "++++++++++++++++++++ BUILDING CLIENT..."
pushd OLD/client/src; npm i; npx tsc; popd
echo "-------------------- DONE BUILDING CLIENT"

# ----------------------------------------

echo "++++++++++++++++++++ BUILDING SERVER..."
pushd OLD/server/src; npm i; npx tsc; popd
echo "-------------------- DONE BUILDING SERVER"

# ----------------------------------------

echo ">>>>>>>>>>"
echo ">>>>>>>>>>"
echo ">>>>>>>>>> LOAD THIS FILE IN A BROWSER"
echo ">>>>>>>>>> ${PWD}/OLD/client/index.html"
echo ">>>>>>>>>>"
echo ">>>>>>>>>>"

# ----------------------------------------

sleep 1

echo "+++ spawning server..."
cd OLD/server/src; npm run hot
