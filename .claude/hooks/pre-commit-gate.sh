#!/bin/bash
set -e

echo "Linting..." >&2
npm run lint || { echo "Lint failed" >&2; exit 2; }

echo "Testing..." >&2
npm test || { echo "Tests failed" >&2; exit 2; }

exit 0
