#!/usr/bin/env bash

set -euo pipefail

# ----------------------------------------

# in theory this is not / should not be required
# since it is the verison of the client for the
# websocket version. at least building this
# out of paranoia. :-)
echo "++++++++++++++++++++ BUILDING CLIENT..."
(cd OLD/client/src && npm i)
echo "-------------------- DONE BUILDING CLIENT"

# ----------------------------------------

echo "++++++++++++++++++++ BUILDING SERVER..."
(cd OLD/server/src && npm i)
echo "-------------------- DONE BUILDING SERVER"

# ----------------------------------------

echo "++++++++++++++++++++ BUILDING ONERING..."
(npm i && npm run build)
echo "-------------------- DONE BUILDING ONERING"

# ----------------------------------------

echo ">>>>>>>>>>"
echo ">>>>>>>>>>"
echo ">>>>>>>>>> LOAD THIS FILE IN A BROWSER"
echo ">>>>>>>>>> ${PWD}/index.html"
echo ">>>>>>>>>>"
echo ">>>>>>>>>>"
