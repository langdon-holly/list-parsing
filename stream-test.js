#!/usr/bin/env node
const { Writable, Transform } = require("stream"),
  fs = require("fs"),
  util = require("util");

const lp = require("./main.js");

const strStream2chrStream = () =>
  Transform({
    transform(str, enc, cb) {
      Array.from(str).forEach(chr => this.push(chr, enc));
      cb(null);
    },
    decodeStrings: false
  }).setEncoding("utf8");

process.stdin.setEncoding("utf8");

process.stdin.pipe(strStream2chrStream()).pipe(
  //console.log(
  Writable({
    write(chunk, encoding, callback) {
      console.log(util.inspect(chunk, { depth: null, colors: true }));
      callback(null);
    },
    final(callback) {
      console.log("EOF");
      callback(null);
    },
    decodeStrings: false
  })
);
console.log(
    lp.shortestMatch
    ( lp.seq([lp.elem("e"), lp.string("fd")])
    , Array.from("efd")));
lp.streamShortestMatch
( lp.seq([lp.elem("e"), lp.string("fd")])
, process.stdin.pipe(strStream2chrStream()))
.then(console.log);
