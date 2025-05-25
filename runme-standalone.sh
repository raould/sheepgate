#!/usr/bin/env bash

set -euo pipefail

# ----------------------------------------

echo "++++++++++++++++++++ BUILDING CLIENT..."
(cd OLD/client/src && npm i)
echo "-------------------- DONE BUILDING CLIENT"

# ----------------------------------------

echo "++++++++++++++++++++ BUILDING SERVER..."
(cd OLD/server/src && npm i)
echo "-------------------- DONE BUILDING SERVER"

# ----------------------------------------

echo "++++++++++++++++++++ BUILDING ONERING..."
(cd onering && npm i && npm run build)
echo "-------------------- DONE BUILDING ONERING"

# ----------------------------------------

echo ">>>>>>>>>>"
echo ">>>>>>>>>>"
echo ">>>>>>>>>> LOAD THIS FILE IN A BROWSER"
echo ">>>>>>>>>> ${PWD}/onering/index.html"
echo ">>>>>>>>>>"
echo ">>>>>>>>>>"
