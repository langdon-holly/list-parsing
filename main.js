'use strict';

// Dependencies

var _ = require('lodash');

// Polyfill

// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from
// Production steps of ECMA-262, Edition 6, 22.1.2.1
// Reference: https://people.mozilla.org/~jorendorff/es6-draft.html#sec-array.from
if (!Array.from) {
  Array.from = (function () {
    var toStr = Object.prototype.toString;
    var isCallable = function (fn) {
      return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
    };
    var toInteger = function (value) {
      var number = Number(value);
      if (isNaN(number)) { return 0; }
      if (number === 0 || !isFinite(number)) { return number; }
      return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
    };
    var maxSafeInteger = Math.pow(2, 53) - 1;
    var toLength = function (value) {
      var len = toInteger(value);
      return Math.min(Math.max(len, 0), maxSafeInteger);
    };

    // The length property of the from method is 1.
    return function from(arrayLike/*, mapFn, thisArg */) {
      // 1. Let C be the this value.
      var C = this;

      // 2. Let items be ToObject(arrayLike).
      var items = Object(arrayLike);

      // 3. ReturnIfAbrupt(items).
      if (arrayLike == null) {
        throw new TypeError("Array.from requires an array-like object - not null or undefined");
      }

      // 4. If mapfn is undefined, then let mapping be false.
      var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
      var T;
      if (typeof mapFn !== 'undefined') {
        // 5. else
        // 5. a If IsCallable(mapfn) is false, throw a TypeError exception.
        if (!isCallable(mapFn)) {
          throw new TypeError('Array.from: when provided, the second argument must be a function');
        }

        // 5. b. If thisArg was supplied, let T be thisArg; else let T be undefined.
        if (arguments.length > 2) {
          T = arguments[2];
        }
      }

      // 10. Let lenValue be Get(items, "length").
      // 11. Let len be ToLength(lenValue).
      var len = toLength(items.length);

      // 13. If IsConstructor(C) is true, then
      // 13. a. Let A be the result of calling the [[Construct]] internal method of C with an argument list containing the single item len.
      // 14. a. Else, Let A be ArrayCreate(len).
      var A = isCallable(C) ? Object(new C(len)) : new Array(len);

      // 16. Let k be 0.
      var k = 0;
      // 17. Repeat, while k < len… (also steps a - h)
      var kValue;
      while (k < len) {
        kValue = items[k];
        if (mapFn) {
          A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
        } else {
          A[k] = kValue;
        }
        k += 1;
      }
      // 18. Let putStatus be Put(A, "length", len, true).
      A.length = len;
      // 20. Return A.
      return A;
    };
  }());
}

// Helpers

function arrayOf(elem) {return [elem];}

function consArray
(firstAndRest)
{return [firstAndRest[0]].concat(firstAndRest[1]);}

function returnFail() {return fail;}

function join(arr) {return arr.join('');}

function returnNothing() {return [false];}

function just(val) {return [true, val];}

function notDoomed(parser) {return !doomed(parser);}

function maybeToArray(maybe) {return maybe[0] ? [maybe[1]] : [];}

function recursiveContradiction ()
{throw new Error("recursive parser contradicts itself");}

// Stuff

var exports = module.exports;

function seq() {
  var args = arguments;

  if (args.length == 0) return map(nothing, _.stubArray);
  if (args.length == 1) return map(args[0],
                                   arrayOf);
  if (args.length == 2) {
    var contFirst = args[0].noMore || doomed(args[1])
                    ? fail
                    : {parseElem:
                         function (elem) {
                           return seq(args[0].parseElem(elem), args[1]);},
                       match: false,
                       result: undefined,
                       noMore: false,
                       futureSuccess: args[0].futureSuccess
                                      && (args[1].match
                                          || alwaysSuccessful(args[1]))};
    return args[0].match ? or(contFirst,
                              map(args[1],
                                  function (pt) {
                                    return [args[0].result, pt];}))
                         : contFirst;}
  return map(seq(args[0],
                 seq.apply(this,
                           Array.from(args).slice(1, args.length))),
             consArray);}
exports.seq = seq;

function then(parser, fn) {
  var args = arguments;

  if (args.length == 0) throw new Error("then needs at least 1 argument");
  if (args.length == 1) return parser;
  if (args.length == 2) {
    var contFirst = parser.noMore
                    ? fail
                    : {parseElem:
                         function (elem) {
                           return then(parser.parseElem(elem), fn);},
                       match: false,
                       result: undefined,
                       noMore: false,
                       futureSuccess: false};
    return parser.match ? or(contFirst,
                             fn(parser.result))
                        : contFirst;}
  return then(then.apply(this,
                         Array.from(args).slice(-1)),
              args[args.length - 1]);}
exports.then = then;

function element(elem0) {
  return {parseElem: function (elem1) {
            return elem0 === elem1 ? {parseElem: returnFail,
                                      match: true,
                                      result: elem0,
                                      noMore: true,
                                      futureSuccess: false}
                                   : fail},
          match: false,
          result: undefined,
          noMore: false,
          futureSuccess: false};}
exports.elem = element;

function ciCharacter(chr0) {
  chr0 = chr0.toUpperCase();
  return {parseElem: function (elem) {
            if (!_.isString(elem)) return fail;
            var chr1 = elem.toUpperCase();
            return chr0 === chr1 ? {parseElem: returnFail,
                                    match: true,
                                    result: elem,
                                    noMore: true,
                                    futureSuccess: false}
                                 : fail},
          match: false,
          result: undefined,
          noMore: false,
          futureSuccess: false};}

function string(str) {
  return map(seq.apply(this, _.toArray(str).map(element)), join);}
exports.string = string;

function ciString(str) {
  return map(seq.apply(this, _.toArray(str).map(ciCharacter)), join);}
exports.ciString = ciString;

var fail = {parseElem: returnFail,
            match: false,
            result: undefined,
            noMore: true,
            futureSuccess: false};
exports.fail = fail;

function succeedWith (result)
{ var toReturn = { match: true,
                   result: result,
                   noMore: false,
                   futureSuccess: true};
  toReturn.parseElem = _.constant(toReturn);
  return toReturn;}
                   
exports.succeedWith = succeedWith;

var anything = {parseElem: function(elem) {
                  return map(anything,
                             function (pt) {return [elem].concat(pt);});},
                match: true,
                result: [],
                noMore: false,
                futureSuccess: true};
exports.anything = anything;

function many(parser) {
  return {parseElem: function(elem) {
            return many1(parser).parseElem(elem);},
          match: true,
          result: [],
          noMore: parser.noMore,
          futureSuccess: parser.futureSuccess};}
exports.many = many;

function manyCount(fn, start) {
  start = start || 0;

  return {parseElem: function(elem) {
            return many1Count(fn, start).parseElem(elem);},
          match: true,
          result: [],
          noMore: fn(start).noMore,
          futureSuccess: fn(start).futureSuccess};}
exports.manyCount = manyCount;

function many1(parser) {
  return map
         ( seq(map(and(not(nothing), parser), _.last), many(parser))
         , consArray);}
exports.many1 = many1;

function many1Count(fn, start) {
  start = start || 0;

  return map
         ( seq
           ( map(and(not(nothing), fn(start)), _.last)
           , manyCount(fn, start + 1))
         , consArray);}
exports.many1Count = many1Count;

function parse(parser, arr, startIndex) {
  startIndex = startIndex || 0;
  arr = _.toArray(arr);

  if (doomed(parser)) return [false, startIndex];
  if (arr.length == 0)
    return [ parser.match
           , parser.match ? parser.result : -1];
  return parse(parser.parseElem(arr[0]),
               arr.slice(1),
               startIndex + 1);}
exports.parse = parse;

function longestMatch(parser, arr) {
  arr = _.toArray(arr);

  var toReturn = [false, -1];
  for (var index = 0; index < arr.length; index++) {
    if (doomed(parser)) return toReturn[0] ? toReturn : [false, index];
    if (parser.match) toReturn = [true, parser.result, index];

    parser = parser.parseElem(arr[index]);}

  if (doomed(parser)) return toReturn[0] ? toReturn : [false, arr.length];
  if (parser.match) toReturn = [true, parser.result, arr.length];

  return toReturn;}
exports.longestMatch = longestMatch;

function shortestMatch(parser, arr) {
  arr = _.toArray(arr);

  for (var index = 0; index < arr.length; index++) {
    if (parser.match) return [true, parser.result, index];
    if (doomed(parser)) return [false, index];

    parser = parser.parseElem(arr[index]);}

  if (parser.match) return [true, parser.result, arr.length];
  if (doomed(parser)) return [false, arr.length];

  return [false, -1];}
exports.shortestMatch = shortestMatch;

function sepByCount(elemFn, sepFn, atLeast1) {
  if (!atLeast1) return or(map(nothing, _.stubArray),
                           sepByCount(elemFn, sepFn, true));

  return map(seq(elemFn(0),
                 manyCount(function(index) {
                             return before(sepFn(index), elemFn(index));},
                           1)),
                   consArray);}
exports.sepByCount = sepByCount;

function sepBy(element, separator) {
  return sepByCount(_.constant(element),
                    _.constant(separator));}
exports.sepBy = sepBy;

function sepBy1(element, separator) {
  return sepByCount(_.constant(element),
                    _.constant(separator),
                    true);}
exports.sepBy1 = sepBy1;

function opt(parser) {
  return or(
    map(nothing, returnNothing),
    map(parser, just));}
exports.opt = opt;

function map(parser, fn) {
  if (doomed(parser)) return fail;
  return {parseElem: function(elem) {
            return map(parser.parseElem(elem), fn);},
          match: parser.match,
          result: parser.match ? fn(parser.result) : undefined,
          noMore: parser.noMore,
          futureSuccess: parser.futureSuccess};}
exports.map = map;

function failYields(parser, result) {
  if (doomed(parser)) return succeedWith(result);
  return {parseElem: function(elem) {
            return failYields(parser.parseElem(elem), result);},
          match: true,
          result: parser.match ? parser.result : result,
          noMore: false,
          futureSuccess: true};}
exports.failYields = failYields;

function assert(parser, fn) {
  if (doomed(parser)) return fail;
  var match = parser.match && fn(parser.result);
  return {parseElem: function(elem) {
            return assert(parser.parseElem(elem), fn);},
          match: match,
          result: match ? parser.result : undefined,
          noMore: parser.noMore,
          futureSuccess: false};}
exports.assert = assert;

function shortest(parser) {
  return {parseElem: function(elem) {
            return parser.match
                   ? fail
                   : shortest(parser.parseElem(elem));},
          match: parser.match,
          result: parser.result,
          noMore: parser.noMore || parser.match,
          futureSuccess: false};}
exports.shortest = shortest;

function before(parser0, parser1) {
  return map(seq(parser0, parser1), _.last);}
exports.before = before;

function after(parser0, parser1) {
  return map(seq(parser0, parser1), _.head);}
exports.after = after;

function around(parser0, parser1, parser2) {
  return before(parser0, after(parser1, parser2));}
exports.around = around;

function between(parser0, parser1) {
  if (arguments.length == 0) return map(nothing, stubArray);
  if (arguments.length == 1)
    return map(parser0, stubArray);
  if (arguments.length == 2)
    return map(before(parser0, parser1), arrayOf);
  return map(seq(between(parser0, parser1),
                 between.apply(this,
                               Array.prototype.slice.call(arguments, 2))),
                   _.flatten);}
exports.between = between;

function or() {
  var args = _.filter(arguments, notDoomed),
      parser0 = args[0],
      parser1 = args[1];

  if (args.length == 0) return fail;
  if (args.length == 1) return parser0;
  if (args.length == 2)
    return {parseElem: function(elem) {
              return or(parser0.parseElem(elem),
                        parser1.parseElem(elem));},
            match: parser0.match || parser1.match,
            result: parser0.match ? parser0.result : parser1.result,
            noMore: parser0.noMore && parser1.noMore,
            futureSuccess: parser0.futureSuccess || parser1.futureSuccess};
  return or(args[0],
            or.apply(this,
                     Array.from(args).slice(1, args.length)));}
exports.or = or;

function and(parser0, parser1) {
  var args = arguments;

  if (args.length == 0) return map(anything, _.stubArray);
  if (args.length == 1) return map(parser0, arrayOf);
  if (args.length == 2) {
    if (doomed(parser0)
        || doomed(parser1)
        || !parser0.match && parser1.noMore
        || !parser1.match && parser0.noMore) return fail;
    return {parseElem: function(elem) {
              return and(parser0.parseElem(elem),
                         parser1.parseElem(elem));},
            match: parser0.match && parser1.match,
            result: [parser0.result, parser1.result],
            noMore: parser0.noMore || parser1.noMore,
            futureSuccess: parser0.futureSuccess && parser1.futureSuccess};}
  return map(and(parser0,
                 and.apply(this,
                           Array.from(args).slice(1, args.length))),
             consArray);}
exports.and = and;

function lengthIs(len) {
  if (!_.isFinite(len) || len < 0 || len % 1 != 0)
    throw new TypeError('Argument to lengthIs must be nonnegative integer');
  return len == 0 ? {parseElem: returnFail,
                     match: true,
                     result: [],
                     noMore: true,
                     futureSuccess: false}
                  : {parseElem: function(elem) {
                       return map(lengthIs(len - 1),
                                  function (pt) {
                                    return [elem].concat(pt);});},
                     match: false,
                     result: undefined,
                     noMore: false,
                     futureSuccess: false};}
exports.lengthIs = lengthIs;

function not(parser) {
  return {parseElem: function(elem) {
            return map(not(parser.parseElem(elem)),
                       function(pt) {return [elem].concat(pt);});},
          match: !parser.match,
          result: parser.match ? undefined : [],
          noMore: parser.futureSuccess,
          futureSuccess: parser.noMore}}
exports.not = not;

function elemNot() {
  var args = arguments;
  return map
         ( and.apply(this, [lengthIs(1)].concat(_.map(args, not)))
         , _.flow(_.head, _.head));}
exports.elemNot = elemNot;

var nothing = {parseElem: returnFail,
               match: true,
               result: undefined,
               noMore: true,
               futureSuccess: false};
exports.nothing = nothing;

var hSpaceChar = or(string('\t'),
                    string(' '),
                    string('\u00A0'),
                    string('\u1680'),
                    string('\u2000'),
                    string('\u2001'),
                    string('\u2002'),
                    string('\u2003'),
                    string('\u2004'),
                    string('\u2005'),
                    string('\u2006'),
                    string('\u2007'),
                    string('\u2008'),
                    string('\u2009'),
                    string('\u200A'),
                    string('\u202F'),
                    string('\u205F'),
                    string('\u3000'));
exports.hSpaceChar = hSpaceChar;

var hSpace = many1(hSpaceChar);
exports.hSpace = hSpace;

var vSpaceChar = or(string('\u000A'),
                    string('\u000B'),
                    string('\f'),
                    string('\r'),
                    string('\u0085'),
                    string('\u2028'),
                    string('\u2029'));
exports.vSpaceChar = vSpaceChar;

var vSpace = many1(vSpaceChar);
exports.vSpace = vSpace;

var wsChar = or(hSpaceChar, vSpaceChar);
exports.wsChar = wsChar;

var ws = many1(wsChar);
exports.ws = ws;

function doomed(parser) {
  return !parser.match && parser.noMore;}
exports.doomed = doomed;

function alwaysSuccessful(parser) {
  return parser.match && parser.futureSuccess;}
exports.alwaysSuccessful = alwaysSuccessful;

function recurseLeft(recursive, nonrecursive, emptyCriteria) {
  return map
         ( recursive.match && emptyCriteria
           ? seq(map(opt(nonrecursive), maybeToArray), many(recursive))
           : seq(map(nonrecursive, arrayOf), many(recursive))
         , _.flatten);}
exports.recurseLeft = recurseLeft;

function recurseRight(recursive, nonrecursive, emptyCriteria) {
  return map
         ( recursive.match && emptyCriteria
           ? seq(many(recursive), map(opt(nonrecursive), maybeToArray))
           : seq(many(recursive), map(nonrecursive, arrayOf))
         , _.flatten);}
exports.recurseRight = recurseRight;

function recurse(inTermsOfThis, optimistic) {
  optimistic = optimistic || false;

  function makeThis(matches) {
    if (doomed(matches.parser)) return fail;

    function findElemIndex(elem) {
      var index = matches.elems.length;
      for (var i = 0; i < matches.elems.length; i++) {
        if (matches.elems[i].elem === elem) {
          index = i;
          break;}}
      return index;}

    return { parseElem: function(elem) {
                          var index = findElemIndex(elem);
                          var newMatches = matches.elems[index].match;

                          // if elem has not been parsed yet
                          if (index == matches.elems.length) {
                            matches.elems.push(
                              { elem: elem,
                                match: { parser: optimistic ? string('') : fail,
                                         elems: []}});
                            newMatches = matches.elems[index].match;
                            newMatches.parsers.parser
                              = matches.parsers
                                       .parser
                                       .parseElem(elem);
                            newMatches.parsers.parsed
                              = true;}

                          // if elem is in the middle of being parsed
                          if (!matches.elems[index].match.parsers.parsed) {
                            newMatches.parsers.defaultParser
                              = matches
                                .parsers
                                .defaultParser
                                .parseElem(elem);
                            newMatches.parsers.undefaultParser
                              = matches
                                .parsers
                                .undefaultParser
                                .parseElem(elem);
                            matches.elems[index].match.parsers.primaryParser
                              = 'default';}

                          return makeThis(matches.elems[index].match);},
             match:
               matches.parsers.primaryParser === 'parser'
               ? matches.parsers.parser.match
               : matches.parsers.parsed
                 ? matches.parsers.parser.match
                   === matches.parsers.defaultParser.match
                   ? matches.parsers.parser.match
                   : recursiveContradiction()
                 : matches.parsers.defaultParser.match,
             result:
               function(){
                 return matches.parsers.primaryParser === 'parser'
                        ? matches.parsers.parser.result
                        : matches.parsers.parsed
                          ? matches.parsers.parser.match
                            === matches.parsers.defaultParser.match
                            ? matches.parsers.parser.result
                            : recursiveContradiction()
                          : matches.parsers.defaultParser.result},
             noMore: false,
             futureSuccess: false};}

  var defaultEmpty = inTermsOfThis(optimistic ? anything : fail);
  var undefaultEmpty = inTermsOfThis(optimistic ? fail : anything);
  var matches = { parser: defaultEmpty,
                  elems: []};
  var This = makeThis(matches);
  var otherThis = inTermsOfThis(This);
  matches.parsers.parser = otherThis;

  return This;}
exports.recurse = recurse;

