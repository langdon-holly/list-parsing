'use strict'

// Dependencies

; const
    util = require('util')

  , ll = require('./linked-list')

// Utility

; function throwRangeError(...args) {throw RangeError(...args)}
; function throwTypeError(...args) {throw TypeError(...args)}
; function constant(o) {return () => o}
; function isNat(n) {return Number.isInteger(n) && n >= 0}

// Stuff

; const
    length = list => list.length
  , isNil = list => length(list) == 0
  , isJust = list => length(list) == 1
  , isParent = list => !(length(list) < 2)
  , Switch
    = ({ifNil, ifJust, ifParent}) =>
        list =>
        { const len = length(list)
        ; return (len < 2 ? len == 0 ? ifNil : ifJust : ifParent)(list)}
  , begin = list => list.begin
  , end = list => list.end
  , unjust = list => list.val
  //, switchUnwrap
  //  = (ifNil, ifJust, ifParent) =>
  //      Switch
  //      ( list => ifNil()
  //      , list => ifJust(unjust(list))
  //      , list => ifJust(begin(list), end(list)))
  , addDeep
    = isBegin =>
        ( select =>
          function addItDeep(node, stack)
          { return (
              isJust(node)
              ? {node, stack}
              : addItDeep(select(node), ll.cons(node, stack)))})
        (isBegin ? begin : end)
  , nextState
    = isBegin =>
        ( (select, addItDeep) =>
            stack =>
              ll.isNil(stack)
              ? {done: true}
              : Object.assign
                ( {done: false}
                , addItDeep(select(ll.head(stack)), ll.tail(stack))))
        (isBegin ? end : begin, addDeep(isBegin))
  , iteratorDir
    = isForward =>
        ( (addItDeep, getNextState) =>
            function*(list)
            { if (!isNil(list))
              { let
                  done = false
                , {node, stack} = addItDeep(list, ll.nil)
              ; while (!done)
                { yield unjust(node)
                ; ({done, node, stack} = getNextState(stack))}}})
        (addDeep(isForward), nextState(isForward))
  , iterator = iteratorDir(true)
  , reverseIterator = iteratorDir(false)
  , unsafeIndex
    = list =>
        isJust(list)
        ? constant(unjust(list))
        : idx =>
            ( theBegin =>
              ( theBeginLength =>
                  idx < theBeginLength
                  ? unsafeIndex(theBegin)(idx)
                  : unsafeIndex(end(list))(idx - theBeginLength))
              (length(theBegin)))
            (begin(list))
  , index
    = list =>
      { const len = length(list)
      ; return (
          idx =>
            idx < len
            ? unsafeIndex(list)(idx)
            : throwRangeError
              ( "index is "
                + (idx - (length(list) - 1))
                + " too great: "
                + idx))}
  , New
    = ( () =>
        { const
            New
            = function DeepList(o)
              { return (
                  this instanceof DeepList
                  ? Object.assign(this, o)
                  : new DeepList(o))}
        ; New.prototype
          = new
              Proxy
              ( {[Symbol.iterator]() {return iterator(this)}}
              , { get
                  : (target, property, receiver) =>
                      target.hasOwnProperty(property)
                        ? target[property]
                        : typeof property === 'symbol'
                          ? undefined
                          : ( intProp =>
                                isNat(intProp)
                                ? index(receiver)(intProp)
                                : undefined)
                            (parseInt(property, 10))})
        ; return New})()
  
  , cons = (head, tail) => concat(just(head), tail)
  , append = (initial, last) => concat(initial, just(last))
  , just = val => New({length: 1, val})
  , concat
    = (begin, end) =>
      isNil(begin)
      ? end
      : isNil(end)
        ? begin
        : New({length: length(begin) + length(end), begin, end})
  , p
    = o =>
      o instanceof t
      ? o
      : ( () =>
            throwTypeError(util.format('Expected deep list, but got: %o', o)))
        ()
  , nil = New({length: 0})
  , t = {[Symbol.hasInstance]: o => o instanceof New}
  //, head
  //  = list => {while (isParent(list)) list = begin(list); return unjust(list)}
  //, last
  //  = list => {while (isParent(list)) list = end(list); return unjust(list)}
  , initialLastLinkHeadward
    = list =>
      { let {node: {val: last}, stack} = addDeep(false)(list, ll.nil), initial = nil
      ; stack = ll.reverse(stack)
      ; while (!ll.isNil(stack))
          initial = concat(initial, begin(ll.head(stack))), stack = ll.tail(stack)
      ; return {initial, last}}

  , headTailLinkHeadward
    = list =>
      { let {node: {val: head}, stack} = addDeep(true)(list, ll.nil), tail = nil
      ; while (!ll.isNil(stack))
          tail = concat(tail, end(ll.head(stack))), stack = ll.tail(stack)
      ; return {head, tail}}
  , toLinkedReverse
    = list =>
    { let ret = ll.nil
    ; for (const elem of list) ret = ll.cons(elem, ret)
    ; return ret}

; module.exports
  = { cons
    , append
    , nil
    , just
    , concat
    , isNil
    , isJust
    , isParent
    , begin
      : list =>
          isParent(list) ? begin(list) : throwTypeError("list is childless")
    , end
      : list => isParent(list) ? end(list) : throwTypeError("list is childless")
    , unjust
      : list => isJust(list) ? unjust(list) : throwTypeError("list is unjust")
    , t
    , p
    , length
    , index
      : list =>
          idx =>
            isNat(idx)
            ? index(list)(idx)
            : throwTypeError("index is unnatural: " + idx)
    , iterator
    , reverseIterator
    , headTailLinkHeadward
      : list =>
          isNil(list)
          ? throwTypeError("list is childless")
          : headTailLinkHeadward(list)
    , initialLastLinkHeadward
      : list =>
          isNil(list)
          ? throwTypeError("list is childless")
          : initialLastLinkHeadward(list)
    , toLinkedReverse}

//; for (const e of reverseIterator(cons(4, concat(just(3), just(5)))))
//    console.log(e)
//; console.log([...nil])
//; console.log(concat(just(4), just(5))[1])
//; p({a: 2})

