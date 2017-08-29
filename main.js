'use strict'

// Debug mode

; const debug = false

// Dependencies

; const
    util = require('util')

  , _ = require('lodash')

  , ll = _.assign({}, require('./linked-list'))
  , dl = _.assign({}, require('./deep-list'))

; if (!debug) {dl.p = ll.p = _.identity}

// Utility

; const
    log = (...args) => (debug ? console.log(...args) : undefined, _.last(args))
  , throwTypeError = (...args) => {throw TypeError(...args)}
  , mab // maybe
    = { nothing: {is: false}
      , just: val => ({is: true, val: val})
      , is: maybe => maybe.is
      , _val: maybe => maybe.val
      , def: (maybe, def) => mab.is(maybe) ? mab._val(maybe) : def
      , map
        : (maybe, fn) => mab.is(maybe) ? mab.just(fn(mab._val(maybe))) : maybe
      , mapDef: (maybe, def, fn) => mab.def(mab.map(maybe, fn), def)
      , toArr: maybe => mab.mapDef(maybe, [], arrayOf)}
  , recursiveContradiction
    = () => {throw new Error("recursive parser contradicts itself")}
  , arrayOf = elem => [elem]
  , llOf = elem => ll.cons(elem, ll.nil)
  , consArray = firstAndRest => [firstAndRest[0]].concat(firstAndRest[1])
  , join = arr => arr.join('')
  , expectedButGot
    = (...args) =>
        throwTypeError(util.format("Expected %s, but got: %o", ...args))
  //, parserp
  //  = o =>
  //      debug
  //      ? ( o.hasOwnProperty('parseElem')
  //        &&
  //          _.isFunction(o.parseElem)
  //        &&
  //          o.hasOwnProperty('match')
  //        &&
  //          _.isBoolean(o.match)
  //        &&
  //          o.hasOwnProperty('result')
  //        &&
  //          o.hasOwnProperty('noMore')
  //        &&
  //          _.isBoolean(o.noMore)
  //        &&
  //          o.hasOwnProperty('futureSuccess')
  //        &&
  //          _.isBoolean(o.futureSuccess)
  //        &&
  //          o.hasOwnProperty('stack'))
  //        ? (dl.p(o.stack), o)
  //        : expectedButGot("stacked parser", o)
  //      : o
  , fnp = o => debug && !_.isFunction(o) ? expectedButGot("function", o) : o

// Stuff

; exports = module.exports
; exports.nil = dl.nil

; const parserp = _.identity //TODO: parser type

; const nilStacked = parser => ({stack: dl.nil, parser})
; exports.nilStacked = nilStacked

; const returnFail = () => fail

; const fail
  = nilStacked
    ( { parseElem: returnFail
      , match: false
      , result: undefined
      , noMore: true
      , futureSuccess: false})
; exports.fail = fail

; function llSeq(args)
  { return (
      args.length == 0
      ? map(nothing, _.stubArray)
      : _.reduce
        ( _.tail(args)
        , function llSeq2(parser0, parser1)
          { return (
              ( contFirst =>
                  match(parser0)
                  ? or
                    ( [ contFirst
                      , map(parser1, pt => ll.cons(pt, result(parser0)))])
                  : contFirst)
              ( noMore(parser0) || doomed(parser1)
                ? fail
                : nilStacked
                  ( { parseElem
                      : elem => llSeq2(parseElem(parser0, elem), parser1)
                    , match: false
                    , result: undefined
                    , noMore: false
                    , futureSuccess
                      : futureSuccess(parser0) && match(parser1)})))}
        , map(args[0], llOf)))}

; function seq(args) {return map(llSeq(args), ll.toArrayReverse)}
; exports.seq = seq

; function then2Prev(parser, fn)
  { const contFirst
    = noMore(parser)
      ? fail
      : nilStacked
        ( { parseElem
            : elem => then2Prev(parseElem(parser, elem), fn)
          , match: false
          , result: undefined
          , noMore: false
          , futureSuccess: false})
  ; return match(parser) ? or([contFirst, fn(result(parser))]) : contFirst}

; function then(parser, fns) {return _.reduce(fns, then2Prev, parser)}
; exports.then = then

; function element(elem0)
  { return (
      nilStacked
      ( { parseElem
          : elem1 =>
              elem0 === elem1
              ? nilStacked
                ( { parseElem: returnFail
                  , match: true
                  , result: elem0
                  , noMore: true
                  , futureSuccess: false})
              : fail
        , match: false
        , result: undefined
        , noMore: false
        , futureSuccess: false}))}
; exports.elem = element

; function ciCharacter(chr0)
  { chr0 = chr0.toUpperCase()
  ; return (
      nilStacked
      ( { parseElem
          : elem =>
            _.isString(elem) && chr0 === elem.toUpperCase()
            ? nilStacked
              ( { parseElem: returnFail
                , match: true
                , result: elem
                , noMore: true
                , futureSuccess: false})
            : fail
        , match: false
        , result: undefined
        , noMore: false
        , futureSuccess: false}))}

; function string(str)
  {return map(seq(_.toArray(str).map(element)), join)}
; exports.string = string

; function ciString(str)
  {return map(seq(_.toArray(str).map(ciCharacter)), join)}
; exports.ciString = ciString

; function succeedWith(result)
  { const toReturn
    = nilStacked
      ( { match: true
        , result: result
        , noMore: false
        , futureSuccess: true})
  ; toReturn.parser.parseElem = _.constant(toReturn)
  ; return toReturn}

; exports.succeedWith = succeedWith

; const anything
  = nilStacked
    ( { parseElem: elem => map(anything, [].concat.bind([elem]))
      , match: true
      , result: []
      , noMore: false
      , futureSuccess: true})
; exports.anything = anything

; function many(parser) {return map(llMany(parser), ll.toArray)}
; exports.many = many

; function llMany(parser)
  { parserp(parser)
  ; return (
      nilStacked
      ( { parseElem: elem => parseElem(llMany1(parser), elem)
        , match: true
        , result: ll.nil
        , noMore: noMore(parser)
        , futureSuccess: futureSuccess(parser)}))}

; function manyCount(fn, start)
  { start = start || 0

  ; const parser = fn(start)
  ; return (
      nilStacked
      ( { parseElem: elem => parseElem(many1Count(fn, start), elem)
        , match: true
        , result: []
        , noMore: noMore(parser)
        , futureSuccess: futureSuccess(parser)}))}
; exports.manyCount = manyCount

; function many1(parser) {return map(llMany1(parser), ll.toArray)}
; exports.many1 = many1

; function llMany1(parser)
  { return (
      map
      ( seq([and([not(nothing), parser]), llMany(parser)])
      , pt => ll.cons(pt[0][1], pt[1])))}

; function many1Count(fn, start)
  { start = start || 0

  ; return (
      map
      ( seq
        ( [ map(and([not(nothing), fn(start)]), _.last)
          , manyCount(fn, start + 1)])
      , consArray))}
; exports.many1Count = many1Count

; function parse(parser, arr, startIndex)
  { startIndex = startIndex || 0
  ; arr = _.toArray(arr)

  ; if (doomed(parser))
      return {status: 'doomed', index: startIndex, parser}
  ; if (arr.length == 0)
      return (
        match(parser)
        ? {status: 'match', result: result(parser)}
        : {status: 'eof', parser})
  ; return parse(parseElem(parser, arr[0]), _.tail(arr), startIndex + 1)}
; exports.parse = parse

; function longestMatch(parser, arr)
  { arr = _.toArray(arr)

  ; let toReturn = {status: 'eof', parser}
  ; for (let index = 0; index < arr.length; index++)
    { if (doomed(parser))
        return (
          toReturn.status === 'match'
          ? toReturn
          : {status: 'doomed', index, parser})
    ; if (match(parser))
        toReturn = {status: 'match', index, result: result(parser)}

    ; parser = parseElem(parser, arr[index])}

  ; if (doomed(parser))
      return (
        toReturn.status === 'match'
        ? toReturn
        : {status: 'doomed', index: arr.length, parser})
  ; if (match(parser))
      toReturn = {status: 'match', index: arr.length, result: result(parser)}

  ; return toReturn}
;  exports.longestMatch = longestMatch

; function shortestMatch(parser, arr)
  { arr = _.toArray(arr)

  ; for (let index = 0; index < arr.length; index++)
    { if (match(parser))
        return {status: 'match', index, result: result(parser)}
    ; if (doomed(parser))
        return {status: 'doomed', index, parser}

    ; if (debug) ;//console.log(arr[index])
    ; parser = parseElem(parser, arr[index])}

  ; if (match(parser))
      return {status: 'match', index: arr.length, result: result(parser)}
  ; if (doomed(parser))
      return {status: 'doomed', index: arr.length, parser}

  ; return {status: 'eof', parser}}
; exports.shortestMatch = shortestMatch

; function sepByCount(elemFn, sepFn, atLeast1)
  { if (!atLeast1)
      return or([map(nothing, _.stubArray), sepByCount(elemFn, sepFn, true)])

  ; return (
      map
      ( seq
        ( [ elemFn(0)
          , manyCount(index => before(sepFn(index - 1), elemFn(index)), 1)])
      , consArray))}
; exports.sepByCount = sepByCount

; function sepBy(element, separator)
  {return sepByCount(_.constant(element), _.constant(separator))}
; exports.sepBy = sepBy

; function sepBy1(element, separator)
  {return sepByCount(_.constant(element), _.constant(separator), true)}
; exports.sepBy1 = sepBy1

; function opt(parser)
  {return or([map(nothing, _.constant(mab.nothing)), map(parser, mab.just)])}
; exports.opt = opt

; function map(parser, fn)
  { return (
      parserp
      ( { parser: parser.parser
        , stack: dl.cons({type: 'map', fn}, parser.stack)}))}
; exports.map = map

//; function failYields(parser, result)
//  { return (
//      doomed(parser)
//      ? succeedWith(result)
//      : nilStacked
//        ( { parseElem
//              : elem => failYields(parseElem(parser, elem), result)
//            , match: true
//            , result: match(parser) ? result(parser) : result
//            , noMore: false
//            , futureSuccess: true}))}
//; exports.failYields = failYields

//; function assert(parser, fn)
//  { if (doomed(parser)) return fail
//  ; var match = parser.match && fn(parser.result)
//  ; return (
//      { parseElem: function(elem) {return assert(parser.parseElem(elem), fn)}
//      , match: match
//      , result: match ? parser.result : undefined
//      , noMore: parser.noMore
//      , futureSuccess: false
//      , stack: nil})}
//; exports.assert = assert

; function name(parser, aName)
  { return (
      parserp
      ( { parser: parser.parser
        , stack: dl.cons({type: 'name', name: aName}, parser.stack)}))}
; exports.name = name

//; function stacked(parser)
//  {return (
//     function(stack)
//     {return (
//        _.assign
//        ( {}
//        , parser
//        , {stack: concat(parser.stack, stack)}))})}
//; exports.stacked = stacked

//; function traced(parser, trace)
//  {return (
//     _.assign
//     ( {}
//     , parser
//     , { parseElem
//         : function(elem)
//           {return (
//              traced
//              ( parser.parseElem(elem)
//              , _.assign
//                ([], trace, [_.assign({}, {index: trace[0].index + 1})])))}
//       , trace: trace.concat(parser.trace)}))}
//; exports.traced = traced

//; function unName(parser)
//  {return (
//     _.assign
//     ( {}
//     , parser
//     , { parseElem: function(elem) {return name(parser.parseElem(elem), aName)}}))}
//; exports.unName = unName

; function shortest(parser)
  { return (
      _.defaultsDeep
      ( { parser
          : { parseElem
              : elem =>
                  match(parser) ? fail : shortest(parseElem(parser, elem))
            , noMore: noMore(parser) || match(parser)
            , futureSuccess: false}}
      , parser))}
; exports.shortest = shortest

; function before(parser0, parser1)
  { return map(seq([parser0, parser1]), _.last)}
; exports.before = before

; function after(parser0, parser1)
  { return map(seq([parser0, parser1]), _.head)}
; exports.after = after

; function around(parser0, parser1, parser2)
  { return before(parser0, after(parser1, parser2))}
; exports.around = around

; function between(parsers)
  { if (parsers.length % 2 == 1)
      return after(between(_.initial(parsers)), _.last(parsers))
  ; return (
      seq
      ( _.map(_.chunk(parsers, 2)
      , ([parser0, parser1]) => before(parser0, parser1))))}
; exports.between = between

; function or(parsers)
  { const args = _.filter(parsers, notDoomed)

  ; return (
      args.length == 0
      ? fail
      : _.reduceRight
        ( args
        , function or2(parser1, parser0)
          { return (
              nilStacked
              ( { parseElem
                  : elem =>
                    or2(parseElem(parser1, elem), parseElem(parser0, elem))
                , match: match(parser0) || match(parser1)
                , result
                  : match(parser0)
                  ? result(parser0)
                  : match(parser1) ? result(parser1) : undefined
                , noMore: noMore(parser0) && noMore(parser1)
                , futureSuccess
                  : futureSuccess(parser0) || futureSuccess(parser1)}))}))}
; exports.or = or

; function and(parsers)
  { return (
      parsers.length == 0
      ? map(anything, _.stubArray)
      : _.reduceRight
        ( _.initial(parsers)
        , (parser1, parser0) =>
          doomed(parser0)
          ||
            doomed(parser1)
          ||
            !match(parser0) && noMore(parser1)
          ||
            !match(parser1) && noMore(parser0)
          ? fail
          : map
            ( nilStacked
              ( { parseElem
                  : elem =>
                    and
                    ( [ parseElem(parser0, elem)
                      , parseElem(parser1, elem)])
                , match: match(parser0) && match(parser1)
                , result
                  : match(parser0) && match(parser1)
                    ? [result(parser0), result(parser1)]
                    : undefined
                , noMore: noMore(parser0) || noMore(parser1)
                , futureSuccess
                  : futureSuccess(parser0)
                    && futureSuccess(parser1)})
            , consArray)
        , map(_.last(parsers), arrayOf)))}
; exports.and = and

; function lengthIs(len)
  { if (!_.isFinite(len) || len < 0 || len % 1 != 0)
      throwTypeError('Argument to lengthIs must be nonnegative integer')
  ; return (
      nilStacked
      ( len == 0
        ? { parseElem: returnFail
          , match: true
          , result: []
          , noMore: true
          , futureSuccess: false}
        : { parseElem: elem => map(lengthIs(len - 1), [].concat.bind([elem]))
          , match: false
          , result: undefined
          , noMore: false
          , futureSuccess: false}))}
; exports.lengthIs = lengthIs

; function not(parser)
  { return (
      nilStacked
      ( { parseElem
          : elem => map(not(parseElem(parser, elem)), [].concat.bind([elem]))
        , match: !match(parser)
        , result: match(parser) ? undefined : []
        , noMore: futureSuccess(parser)
        , futureSuccess: noMore(parser)}))}
; exports.not = not

; const oneElem = map(lengthIs(1), _.head)
; exports.oneElem = oneElem

; function elemNot(parsers)
  {return map(and([oneElem].concat(_.map(parsers, not))), _.head)}
; exports.elemNot = elemNot

; const nothing
  = nilStacked
    ( { parseElem: returnFail
      , match: true
      , result: undefined
      , noMore: true
      , futureSuccess: false})
; exports.nothing = nothing

; const hSpaceChar
  = or
    ( [ string('\t')
      , string(' ')
      , string('\u00A0')
      , string('\u1680')
      , string('\u2000')
      , string('\u2001')
      , string('\u2002')
      , string('\u2003')
      , string('\u2004')
      , string('\u2005')
      , string('\u2006')
      , string('\u2007')
      , string('\u2008')
      , string('\u2009')
      , string('\u200A')
      , string('\u202F')
      , string('\u205F')
      , string('\u3000')])
; exports.hSpaceChar = hSpaceChar

; const hSpace = many1(hSpaceChar)
; exports.hSpace = hSpace

; const vSpaceChar
  = or
    ( [ string('\u000A')
      , string('\u000B')
      , string('\f')
      , string('\r')
      , string('\u0085')
      , string('\u2028')
      , string('\u2029')])
; exports.vSpaceChar = vSpaceChar

; const vSpace = many1(vSpaceChar)
; exports.vSpace = vSpace

; const wsChar = or([hSpaceChar, vSpaceChar])
; exports.wsChar = wsChar

; const ws = many1(wsChar)
; exports.ws = ws

; function result(parser)
  { if (debug) console.log(util.inspect(parser.parser, false, null))
  ; return (
      log
      ( "result:"
      , _.flow
        ( ...
            _.flatMap
            ( log([...dl.reverseIterator(parser.stack)])
            , entry => entry.type === 'map' ? [entry.fn] : []))
        (parser.parser.result)))}
; exports.result = result

; function parseElem(parser, elem)
  { const parsed = parser.parser.parseElem(elem)
  ; return (
      {stack: dl.concat(parser.stack, parsed.stack), parser: parsed.parser})}
; exports.parseElem = parseElem

; function match(parser) {return parserp(parser).parser.match}
; exports.match = match

; function noMore(parser) {return parserp(parser).parser.noMore}
; exports.noMore = noMore

; function futureSuccess(parser)
  {return parserp(parser).parser.futureSuccess}
; exports.futureSuccess = futureSuccess

; function doomed(parser)
  {return !match(parser) && noMore(parser)}
; exports.doomed = doomed

; function notDoomed(parser) {return !doomed(parser)}

; function alwaysSuccessful(parser)
  {return match(parser) && futureSuccess(parser)}
; exports.alwaysSuccessful = alwaysSuccessful

; function recurseLeft(recursive, nonrecursive, emptyCriteria)
  { return map
           ( match(recursive(dl.nil)) && emptyCriteria
             ? seq([map(opt(nonrecursive), mab.toArr), many(recursive)])
             : seq([map(nonrecursive, arrayOf), many(recursive)])
           , _.flatten)}
; exports.recurseLeft = recurseLeft

; function recurseRight(recursive, nonrecursive, emptyCriteria)
  { return map
           ( match(recursive(dl.nil)) && emptyCriteria
             ? seq([many(recursive), map(opt(nonrecursive), mab.toArr)])
             : seq([many(recursive), map(nonrecursive, arrayOf)])
           , _.flatten)}
; exports.recurseRight = recurseRight

//; function recurse(inTermsOfThis, optimistic)
//  { optimistic = optimistic || false
//
//  ; function makeThis(matches)
//    { if (doomed(matches.parser)) return fail
//
//    ; function findElemIndex(elem)
//      { var index = matches.elems.length
//      ; for (var i = 0; i < matches.elems.length; i++)
//        { if (matches.elems[i].elem === elem)
//          { index = i
//          ; break}}
//      ; return index}
//
//    ; return (
//        { parseElem
//          : function(elem)
//            { var index = findElemIndex(elem)
//            ; var newMatches = matches.elems[index].match
//
//              // if elem has not been parsed yet
//            ; if (index == matches.elems.length)
//              { matches.elems.push
//                ( { elem: elem
//                  , match: {parser: optimistic ? string('') : fail, elems: []}})
//              ; newMatches = matches.elems[index].match
//              ; newMatches.parsers.parser
//                = matches.parsers.parser.parseElem(elem)
//              ; newMatches.parsers.parsed = true}
//
//              // if elem is in the middle of being parsed
//            ; if (!matches.elems[index].match.parsers.parsed)
//              { newMatches.parsers.defaultParser
//                = matches.parsers.defaultParser.parseElem(elem)
//              ; newMatches.parsers.undefaultParser
//                = matches.parsers.undefaultParser.parseElem(elem)
//              ; matches.elems[index].match.parsers.primaryParser = 'default'}
//
//            ; return makeThis(matches.elems[index].match)}
//        , match
//          : matches.parsers.primaryParser === 'parser'
//            ? matches.parsers.parser.match
//            : matches.parsers.parsed
//              ? matches.parsers.parser.match
//                === matches.parsers.defaultParser.match
//                ? matches.parsers.parser.match
//                : recursiveContradiction()
//              : matches.parsers.defaultParser.match
//        , result
//          : function()
//            { return (
//                matches.parsers.primaryParser === 'parser'
//                ? matches.parsers.parser.result
//                : matches.parsers.parsed
//                  ? matches.parsers.parser.match
//                    === matches.parsers.defaultParser.match
//                    ? matches.parsers.parser.result
//                    : recursiveContradiction()
//                  : matches.parsers.defaultParser.result)}
//        , noMore: false
//        , futureSuccess: false
//        , stack: nil})}
//
//  ; var defaultEmpty = inTermsOfThis(optimistic ? anything : fail)
//  ; var undefaultEmpty = inTermsOfThis(optimistic ? fail : anything)
//  ; var matches = {parser: defaultEmpty, elems: []}
//  ; var This = makeThis(matches)
//  ; var otherThis = inTermsOfThis(This)
//  ; matches.parsers.parser = otherThis
//
//  ; return This}
//; exports.recurse = recurse
