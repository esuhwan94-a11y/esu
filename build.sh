#!/bin/sh
# second-brain.html(본문)을 단독으로 열 수 있는 index.html로 감쌉니다.
{ printf '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n'; cat second-brain.html; printf '</body>\n</html>\n'; } > index.html
