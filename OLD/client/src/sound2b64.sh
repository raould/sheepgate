#!/bin/bash

set -euo pipefail

if [ $# -ne 1 ]; then
    echo "required argument: path to .ogg" >&2
    exit 1
fi

if [ ! -f "$1" ]; then
    echo "required argument: path to valid .ogg file" >&2
    echo "no file found for '${1}'" >&2
    exit 1
fi

if [[ "$1" =~ ".*/client/src" ]]; then
    echo "i must be run in the client/src directory"  >&2
    exit 1
fi    

set -x
NAME_OGG=`basename $1`
NAME=`echo $NAME_OGG | sed 's/.ogg//'`
DST="${NAME_OGG}.b64.ts"
echo "export const ${NAME}_sfx_b64 =" > ./$DST
set +x
base64 $1 | awk '{ print "\""$0"\" +" }' | sed '$ s/ +/;/' >> ./$DST
