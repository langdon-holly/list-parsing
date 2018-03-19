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
  { let toReturn = []
  ; while (list.type === 'cons') {toReturn.push(list.head); list = list.tail}
  ; return toReturn}

; function toArrayReverse(list)
  { return toArray(list).reverse()}

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

; const reverseConcat
  = (list0, list1) =>
    { while (!isNil(list0))
        list1 = cons(head(list0), list1), list0 = tail(list0)
    ; return list1}

; const reverse = list => reverseConcat(list, nil)

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
  = { cons
    , nil
    , isNil
    , head
    , tail
    , p
    , concat
    , toArray
    , toArrayReverse
    , reverseConcat
    , reverse}

