'use strict'

// Dependencies

; const util = require('util')

// Utility

; function throwTypeError(...args) {throw new TypeError(...args)}

// Stuff

; function concat(begin, end)
  { return (
      begin.type === 'cons' ? cons(begin.head, concat(begin.tail, end)) : end)}

; function toArray(list)
  {return list.type === 'nil' ? [] : [list.head].concat(toArray(list.tail))}

; function toArrayReverse(list)
  { return (
      list.type === 'nil' ? [] : toArrayReverse(list.tail).concat([list.head]))}

; const cons = (head, tail) => ({type: 'cons', head, tail})

; const nil = {type: 'nil'}

; const isNil = list => list.type === 'nil'

; const
    head
    = list =>
      isNil(list)
      ? throwTypeError("nil is headless")
      : list.head

; const
    tail
    = list =>
      isNil(list)
      ? throwTypeError("nil is tailless")
      : list.tail

; const
    p
    = o =>
    o.hasOwnProperty('type')
    &&
      ( o.type === 'cons'
      &&
        o.hasOwnProperty('head')
      &&
        o.hasOwnProperty('tail')
      || o.type === 'nil')
    ? o
    : ( () =>
        throwTypeError(util.format('Expected linked list, but got: %o', o)))
      ()

; module.exports
  = {cons, nil, isNil, head, tail, p, concat, toArray, toArrayReverse}

