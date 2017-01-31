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

function recursiveContradiction
()
{throw new Error("recursive parser contradicts itself");}

// Stuff

var exports = module.exports;

function seq() {
  var args = arguments;

  if (args.length == 0) return mapParser(nothing, _.stubArray);
  if (args.length == 1) return mapParser(args[0],
                                         arrayOf);
  if (args.length == 2) {
    var contFirst = args[0].noMore || doomed(args[1])
                    ? fail
                    : {parseElem:
                         function (chr) {
                           return seq(args[0].parseElem(chr), args[1]);},
                       match: false,
                       result: undefined,
                       noMore: false,
                       futureSuccess: args[0].futureSuccess
                                      && (args[1].match
                                          || alwaysSuccessful(args[1]))};
    return args[0].match ? or(contFirst,
                              mapParser(args[1],
                                        function (pt) {
                                          return [args[0].result, pt];}))
                         : contFirst;}
  return mapParser(seq(args[0],
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
                         function (chr) {
                           return then(parser.parseElem(chr), fn);},
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

function character(chr0) {
  return {parseElem: function (chr1) {
            return chr0 === chr1 ? {parseElem: returnFail,
                                    match: true,
                                    result: chr0,
                                    noMore: true,
                                    futureSuccess: false}
                                 : fail},
          match: false,
          result: undefined,
          noMore: false,
          futureSuccess: false};}

function ciCharacter(chr0) {
  chr0 = chr0.toUpperCase();
  return {parseElem: function (chr1) {
            var chr2 = chr1.toUpperCase();
            return chr0 === chr2 ? {parseElem: returnFail,
                                    match: true,
                                    result: chr1,
                                    noMore: true,
                                    futureSuccess: false}
                                 : fail},
          match: false,
          result: undefined,
          noMore: false,
          futureSuccess: false};}

function string(str) {
  return mapParser(seq.apply(this, str.split('').map(character)), join);}
exports.string = string;

function ciString(str) {
  return mapParser(seq.apply(this, str.split('').map(ciCharacter)), join);}
exports.ciString = ciString;

var fail = {parseElem: returnFail,
            match: false,
            result: undefined,
            noMore: true,
            futureSuccess: false};
exports.fail = fail;

var anything = {parseElem: function(chr) {
                  return mapParser(anything,
                                   function (pt) {return chr + pt;});},
                match: true,
                result: '',
                noMore: false,
                futureSuccess: true};
exports.anything = anything

function many(parser) {
  return {parseElem: function(chr) {
            return many1(parser).parseElem(chr);},
          match: true,
          result: [],
          noMore: parser.noMore,
          futureSuccess: parser.futureSuccess};}
exports.many = many;

function manyCount(fn, start) {
  start = start || 0;

  return {parseElem: function(chr) {
            return many1Count(fn, start).parseElem(chr);},
          match: true,
          result: [],
          noMore: fn(start).noMore,
          futureSuccess: fn(start).futureSuccess};}
exports.manyCount = manyCount;

function many1(parser) {
  return mapParser
         ( seq(mapParser(and(not(nothing), parser), _.last), many(parser))
         , consArray);}
exports.many1 = many1;

function many1Count(fn, start) {
  start = start || 0;

  return mapParser
         ( seq
           ( mapParser(and(not(nothing), fn(start)), _.last)
           , manyCount(fn, start + 1))
         , consArray);}
exports.many1Count = many1Count;

function parse(parser, str, startIndex) {
  startIndex = startIndex || -1;

  if (doomed(parser)) return [false, Math.max(startIndex, 0)];
  if (str.length == 0)
    return [ parser.match
           , parser.match ? parser.result : undefined];
  return parse(parser.parseElem(str.charAt(0)),
               str.slice(1),
               startIndex + 1);}
exports.parse = parse;

function longestMatch(parser, str) {
  if (doomed(parser)) return [false, 0];

  var toReturn = [false, 0];

  if (parser.match) toReturn = [true, parser.result, 0];
  for (var index = 0; index < str.length && !doomed(parser); index++) {
    //console.log("parsing {" + str.charAt(index) + "}");
    parser = parser.parseElem(str.charAt(index));
    if (parser.match) toReturn = [true, parser.result, index + 1];
    else if (!toReturn[0]) toReturn[1] = index + 1;}
  return toReturn;}
exports.longestMatch = longestMatch;

function shortestMatch(parser, str) {
  if (doomed(parser)) return [false, 0];
  if (parser.match) return [true, parser.result, 0];

  for (var index = 0; index < str.length && !doomed(parser); index++) {
    parser = parser.parseElem(str.charAt(index));
    if (parser.match) return [true, parser.result, index + 1];}
  return [false, index + 1];}
exports.shortestMatch = shortestMatch;

function sepByCount(elemFn, sepFn, atLeast1) {
  if (!atLeast1) return or(mapParser(nothing, _.stubArray),
                           sepByCount(elemFn, sepFn, true));

  return mapParser(seq(elemFn(0),
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
    mapParser(nothing, returnNothing),
    mapParser(parser, just));}
exports.opt = opt;

function mapParser(parser, fn) {
  if (doomed(parser)) return fail;
  return {parseElem: function(chr) {
            return mapParser(parser.parseElem(chr), fn);},
          match: parser.match,
          result: parser.match ? fn(parser.result) : undefined,
          noMore: parser.noMore,
          futureSuccess: parser.futureSuccess};}
exports.mapParser = mapParser;

function maybeMap(parser, fn) {
  if (doomed(parser)) return fail;
  return {parseElem: function(chr) {
            return mapParser(parser.parseElem(chr), fn);},
          match: parser.match,
          result: parser.match ? fn(parser.result) : undefined,
          noMore: parser.noMore,
          futureSuccess: parser.futureSuccess};}
exports.maybeMap = maybeMap;

function assert(parser, fn) {
  if (doomed(parser)) return fail;
  var match = parser.match && fn(parser.result);
  return {parseElem: function(chr) {
            return mapParser(parser.parseElem(chr), fn);},
          match: match,
          result: match ? parser.result : undefined,
          noMore: parser.noMore,
          futureSuccess: parser.futureSuccess};}
exports.assert = assert;

function shortest(parser) {
  return {parseElem: function(chr) {
            return parser.match
                   ? fail
                   : shortest(parser.parseElem(chr));},
          match: parser.match,
          result: parser.result,
          noMore: parser.noMore || parser.match,
          futureSuccess: false};}
exports.shortest = shortest;

function before(parser0, parser1) {
  return mapParser(seq(parser0, parser1), _.last);}
exports.before = before;

function after(parser0, parser1) {
  return mapParser(seq(parser0, parser1), _.head);}
exports.after = after;

function around(parser0, parser1, parser2) {
  return before(parser0, after(parser1, parser2));}
exports.around = around;

function between(parser0, parser1) {
  if (arguments.length == 0) return mapParser(nothing, stubArray);
  if (arguments.length == 1)
    return mapParser(parser0, stubArray);
  if (arguments.length == 2)
    return mapParser(before(parser0, parser1), arrayOf);
  return mapParser(seq(between(parser0, parser1),
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
    return {parseElem: function(chr) {
              return or(parser0.parseElem(chr),
                        parser1.parseElem(chr));},
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

  if (args.length == 0) return mapParser(anything, _.stubArray);
  if (args.length == 1) return mapParser(parser0, arrayOf);
  if (args.length == 2) {
    if (doomed(parser0)
        || doomed(parser1)
        || !parser0.match && parser1.noMore
        || !parser1.match && parser0.noMore) return fail;
    return {parseElem: function(chr) {
              return and(parser0.parseElem(chr),
                         parser1.parseElem(chr));},
            match: parser0.match && parser1.match,
            result: [parser0.result, parser1.result],
            noMore: parser0.noMore || parser1.noMore,
            futureSuccess: parser0.futureSuccess && parser1.futureSuccess};}
  return mapParser(and(parser0,
                       and.apply(this,
                                 Array.from(args).slice(1, args.length))),
                   consArray);}
exports.and = and;

function strOfLength(len) {
  return len == 0 ? {parseElem: returnFail,
                     match: true,
                     result: '',
                     noMore: true,
                     futureSuccess: false}
                  : {parseElem: function(chr) {
                       return mapParser(strOfLength(len - 1),
                                        function (pt) {
                                          return chr + pt;});},
                     match: false,
                     result: undefined,
                     noMore: false,
                     futureSuccess: false};}
exports.strOfLength = strOfLength;

function not(parser) {
  return {parseElem: function(chr) {
            return mapParser(not(parser.parseElem(chr)),
                             function(pt) {return chr + pt;});},
          match: !parser.match,
          result: undefined,
          noMore: parser.futureSuccess,
          futureSuccess: parser.noMore}}
exports.not = not;

function charNot() {
  var args = arguments;
  return mapParser
         ( and.apply(this, [strOfLength(1)].concat(_.map(args, not)))
         , _.head);}
exports.charNot = charNot;

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
  return mapParser
         ( recursive.match && emptyCriteria
           ? seq(mapParser(opt(nonrecursive), maybeToArray), many(recursive))
           : seq(mapParser(nonrecursive, arrayOf), many(recursive))
         , _.flatten);}
exports.recurseLeft = recurseLeft;

function recurseRight(recursive, nonrecursive, emptyCriteria) {
  return mapParser
         ( recursive.match && emptyCriteria
           ? seq(many(recursive), mapParser(opt(nonrecursive), maybeToArray))
           : seq(many(recursive), mapParser(nonrecursive, arrayOf))
         , _.flatten);}
exports.recurseRight = recurseRight;

function recurse(inTermsOfThis, optimistic) {
  optimistic = optimistic || false;

  function makeThis(matches) {
    if (doomed(matches.parser)) return fail;

    function findCharIndex(chr) {
      var index = matches.characters.length;
      for (var i = 0; i < matches.characters.length; i++) {
        if (matches.characters[i].character === chr) {
          index = i;
          break;}}
      return index;}

    return { parseElem: function(chr) {
                          var index = findCharIndex(chr);
                          var newMatches = matches.characters[index].match;

                          // if chr has not been parsed yet
                          if (index == matches.characters.length) {
                            matches.characters.push(
                              { character: chr,
                                match: { parser: optimistic ? string('') : fail,
                                         characters: []}});
                            newMatches = matches.characters[index].match;
                            newMatches.parsers.parser
                              = matches.parsers
                                       .parser
                                       .parseElem(chr);
                            newMatches.parsers.parsed
                              = true;}

                          // if chr is in the middle of being parsed
                          if (!matches.characters[index].match.parsers.parsed) {
                            newMatches.parsers.defaultParser
                              = matches
                                .parsers
                                .defaultParser
                                .parseElem(chr);
                            newMatches.parsers.undefaultParser
                              = matches
                                .parsers
                                .undefaultParser
                                .parseElem(chr);
                            matches.characters[index].match.parsers.primaryParser
                              = 'default';}

                          return makeThis(matches.characters[index].match);},
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
                  characters: []};
  var This = makeThis(matches);
  var otherThis = inTermsOfThis(This);
  matches.parsers.parser = otherThis;

  return This;}
exports.recurse = recurse;

