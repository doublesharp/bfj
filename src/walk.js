/*globals require, module, setImmediate */

'use strict';

var util, Writable, EventEmitter, check, errors, events, terminators, escapes;

// TODO: Make `isEnd` async (consider promises, don't forget usage)
// TODO: Update calls to `isEnd` to await result
// TODO: Consider when to test `walking` and `finished` (currently in `end`)
// TODO: Consider how `end` should behave in the unfinished case (currently throws)
// NOTE: Exceptions swallowed by `defer`

util = require('util');
Writable = require('stream').Writable;
EventEmitter = require('events').EventEmitter;
check = require('check-types');
errors = require('./errors');
events = require('./events');

terminators = {
    obj: '}',
    arr: ']'
};

escapes = {
    '"': '"',
    '\\': '\\',
    '/': '/',
    'b': '\b',
    'f': '\f',
    'n': '\n',
    'r': '\r',
    't': '\t'
};

module.exports = begin;

function begin () {
    var json, emitter, stream,
        position, scopes, handlers,
        walking, insideString, finished;

    json = '';
    emitter = new EventEmitter();
    stream = new JsonStream(proceed);

    position = {
        index: 0,
        current: {
            line: 1,
            column: 1
        },
        previous: {}
    };
    scopes = [];
    handlers = {
        arr: value,
        obj: property
    };

    stream.on('finish', finish);

    return {
        emitter: emitter,
        stream: stream
    };

    function proceed (chunk) {
        json += chunk;

        if (!walking) {
            walking = true;
            defer(value);
        }
    }

    function finish () {
        finished = true;
    }

    function value () {
        var character;

        ignoreWhitespace();

        character = next();

        switch (character) {
            case '[':
                return array();
            case '{':
                return object();
            case '"':
                return string();
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
            case '-':
            case '.':
                return number(character);
            case 'f':
                return literalFalse();
            case 'n':
                return literalNull();
            case 't':
                return literalTrue();
            default:
                error(character, 'value', 'previous');
                value();
        }
    }

    function ignoreWhitespace () {
        while (isWhitespace(character())) {
            next();
        }
    }

    function next () {
        var result;

        if (isEnd()) {
            end();
        }

        result = character();

        position.index += 1;
        position.previous.line = position.current.line;
        position.previous.column = position.current.column;

        if (result === '\n') {
            position.current.line += 1;
            position.current.column = 1;
        } else {
            position.current.column += 1;
        }

        return result;
    }

    function isEnd (callback) {
        if (walking) {
            return position.index === json.length;
        }

        defer(isEnd.bind(null, callback));
    }

    function end () {
        if (!finished) {
            walking = false;
            return;
        }

        if (insideString) {
            error('EOF', '"', 'current');
        }

        while (scopes.length > 0) {
            error('EOF', terminators[scopes.pop()], 'current');
        }

        emitter.emit(events.end);

        throw events.end;
    }

    function error (actual, expected, positionKey) {
        emitter.emit(
            events.error,
            errors.create(
                actual,
                expected,
                position[positionKey].line,
                position[positionKey].column
            )
        );
    }

    function character () {
        return json[position.index];
    }

    function array () {
        scope(events.array, value);
    }

    function scope (event, contentHandler) {
        emitter.emit(event);
        scopes.push(event);
        if (!endScope(event)) {
            defer(contentHandler);
        }
    }

    function object () {
        scope(events.object, property);
    }

    function property () {
        ignoreWhitespace();
        checkCharacter(next(), '"');

        walkString(events.property);

        ignoreWhitespace();
        checkCharacter(next(), ':');

        defer(value);
    }

    function walkString (event) {
        var quoting, string;

        insideString = true;
        quoting = false;
        string = '';

        while (quoting || character() !== '"') {
            if (quoting) {
                quoting = false;
                string += escape(next());
            } else if (character() === '\\') {
                quoting = true;
                next();
            } else {
                string += next();
            }
        }

        insideString = false;

        emitter.emit(event, string);
    }

    function escape (character) {
        if (escapes[character]) {
            return escapes[character];
        }

        if (character === 'u') {
            return escapeHex();
        }

        error(character, 'escape character', 'previous');

        return '\\' + character;
    }

    function escapeHex () {
        var hexits, i, character;

        hexits = '';

        for (i = 0; i < 4; i += 1) {
            character = next();
            if (isHexit(character)) {
                hexits += character;
            }
        }

        if (hexits.length === 4) {
            return String.fromCharCode(parseInt(hexits, 16));
        }

        error(character, 'hex digit', 'previous');

        return '\\u' + hexits + character;
    }

    function checkCharacter (character, expected) {
        if (character !== expected) {
            return error(character, expected, 'previous');
        }
    }

    function endScope (scope) {
        if (character() === terminators[scope]) {
            emitter.emit(events.endPrefix + scope);
            scopes.pop();
            next();
            defer(endValue);
            return true;
        }

        return false;
    }

    function endValue () {
        var scope;

        ignoreWhitespace();

        if (scopes.length === 0 && !isEnd()) {
            error(character(), 'EOF', 'current');
            return defer(value);
        }

        scope = scopes[scopes.length - 1];

        if (!endScope(scope)) {
            checkCharacter(next(), ',');
            defer(handlers[scope]);
        }
    }

    function string () {
        walkString(events.string);
        next();
        defer(endValue);
    }

    function number (firstCharacter) {
        var digits = firstCharacter + walkDigits();

        if (character() === '.') {
            digits += next() + walkDigits();
        }

        if (character() === 'e' || character() === 'E') {
            digits += next();

            if (character() === '+' || character() === '-') {
                digits += next();
            }

            digits += walkDigits();
        }

        emitter.emit(events.number, parseFloat(digits));
        defer(endValue);
    }

    function walkDigits () {
        var digits = '';

        while (!isEnd() && isDigit(character())) {
            digits += next();
        }

        return digits;
    }

    function literalFalse () {
        literal([ 'a', 'l', 's', 'e' ], false);
    }

    function literal (expectedCharacters, value) {
        var actual, expected, invalid;

        while (expectedCharacters.length > 0 && !isEnd()) {
            actual = next();
            expected = expectedCharacters.shift();

            if (actual !== expected) {
                invalid = true;
                break;
            }
        }

        if (invalid) {
            error(actual, expected, 'previous');
        } else if (expectedCharacters.length > 0) {
            error('EOF', expectedCharacters.shift(), 'current');
        } else {
            emitter.emit(events.literal, value);
        }

        defer(endValue);
    }

    function literalNull () {
        literal([ 'u', 'l', 'l' ], null);
    }

    function literalTrue () {
        literal([ 'r', 'u', 'e' ], true);
    }
}

function JsonStream (write, options) {
    if (!(this instanceof JsonStream)) {
        return new JsonStream();
    }

    this._write = function (chunk, encoding, callback) {
        write(chunk.toString());
    };

    return Writable.call(this);
}

util.inherits(JsonStream, Writable);

function defer (fn) {
    setImmediate(function () {
        try {
            fn();
        } catch (error) {
            /*jshint noempty:false */
        }
    });
}

function isWhitespace (character) {
    switch (character) {
        case ' ':
        case '\t':
        case '\r':
        case '\n':
            return true;
    }

    return false;
}

function isHexit (character) {
    return isDigit(character) || isInRange(character, 'a', 'f');
}

function isDigit (character) {
    return isInRange(character, '0', '9');
}

function isInRange (character, lower, upper) {
    var code = character.charCodeAt(0);

    return code >= lower.charCodeAt(0) && code <= upper.charCodeAt(0);
}
