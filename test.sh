#!/usr/bin/env bash

set -euo pipefail
export LC_ALL=C

actual=$(A=test/a.pdf B=test/b.pdf OUTDIR=test/out MASK=test/mask.png DPI=300 ./pdfdiff)

expected="Page 001, Addition: 7500, Deletion, 7500, Modification: 7500"

if [[ "$actual" != "$expected" ]]; then
    echo "Error:"
    echo "Actual: $actual"
    echo "Expected: $expected_output"
    exit 1
fi

echo "OK"
