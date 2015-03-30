/*globals require, module, Promise */

'use strict';

var EventEmitter, JsonStream, asyncModule, error, events, terminators, escapes;

// TODO: When testing consider gradually adding to available text

EventEmitter = require('events').EventEmitter;
JsonStream = require('./stream');
asyncModule = require('./async');
error = require('./error');
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

function begin (options) {
    var json, position, flags, scopes, handlers,
        emitter, stream, async, resume;

    json = '';
    position = {
        index: 0,
        current: {
            line: 1,
            column: 1
        },
        previous: {}
    };
    flags = {
        stream: {
            ended: false
        },
        walk: {
            begun: false,
            ended: false,
            waiting: false,
            string: false
        }
    };
    scopes = [];
    handlers = {
        arr: value,
        obj: property
    };

    emitter = new EventEmitter();
    stream = new JsonStream(proceed);
    async = asyncModule.initialise(options || {});

    stream.on('finish', endStream);

    return {
        emitter: emitter,
        stream: stream
    };

    function proceed (chunk) {
        console.log('proceed: chunk=' + chunk + ', json=' + json + ', waiting=' + flags.walk.waiting + ', resume=' + (resume ? resume.name : 'undefined'));

        if (!chunk || chunk.length === 0) {
            return;
        }

        json += chunk;

        if (!flags.walk.begun) {
            flags.walk.begun = true;
            return async.defer(value);
        }

        if (flags.walk.waiting) {
            flags.walk.waiting = false;

            if (resume) {
                async.defer(resume);
                resume = undefined;
            }
        }
    }

    function endStream () {
        flags.stream.ended = true;

        if (flags.walk.waiting || !flags.walk.begun) {
            endWalk();
        }
    }

    function endWalk () {
        console.log('endWalk: flags.stream.ended=' + flags.stream.ended + ', flags.walk.waiting=' + flags.walk.waiting);

        if (!flags.stream.ended) {
            flags.walk.waiting = true;
            return;
        }

        if (flags.walk.string) {
            fail('EOF', '"', 'current');
        }

        while (scopes.length > 0) {
            fail('EOF', terminators[scopes.pop()], 'current');
        }

        emitter.emit(events.end);
    }

    function value () {
        ignoreWhitespace()
            .then(next)
            .then(handleValue);
    }

    function handleValue (character) {
        console.log('handleValue: character=' + character);

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
                fail(character, 'value', 'previous');
                value();
        }
    }

    function ignoreWhitespace () {
        var resolve;

        console.log('ignoreWhitespace');

        async.defer(check);

        return new Promise(function (r) {
            resolve = r;
        });

        function check () {
            console.log('ignoreWhitespace::check');
            isEnd().then(checkEnd.bind(null, step));
        }

        function step () {
            console.log('ignoreWhitespace::step: isWhitespace=' + isWhitespace(character()));
            if (isWhitespace(character())) {
                return next().then(check);
            }

            resolve();
        }
    }

    function checkEnd (after, atEnd) {
        if (atEnd) {
            resume = after;
            return endWalk();
        }

        after();
    }

    function next () {
        var resolve;

        console.log('next');

        // TODO: discard old characters to save memory

        isEnd().then(checkEnd.bind(null, after));

        return new Promise(function (r) {
            resolve = r;
        });

        function after () {
            var result = character();

            console.log('next::after: result=' + result);

            position.index += 1;
            position.previous.line = position.current.line;
            position.previous.column = position.current.column;

            if (result === '\n') {
                position.current.line += 1;
                position.current.column = 1;
            } else {
                position.current.column += 1;
            }

            resolve(result);
        }
    }

    function isEnd () {
        var resolve;

        console.log('isEnd');

        async.defer(step);

        return new Promise(function (r) {
            resolve = r;
        });

        function step () {
            console.log('isEnd::step: flags.walk.waiting=' + flags.walk.waiting);

            if (!flags.walk.waiting) {
                return resolve(position.index === json.length);
            }

            async.delay(step);
        }
    }

    function fail (actual, expected, positionKey) {
        console.log('fail: actual=' + actual + ', expected=' + expected + ', positionKey=' + positionKey);

        emitter.emit(
            events.error,
            error.create(
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
        console.log('array');

        scope(events.array, value);
    }

    function scope (event, contentHandler) {
        console.log('scope: event=' + event + ', ' + contentHandler.name);

        emitter.emit(event);
        scopes.push(event);
        endScope(event).then(function (atScopeEnd) {
            console.log('scope::endScope: atScopeEnd=' + atScopeEnd + ', event=' + event);
            if (!atScopeEnd) {
                async.defer(contentHandler);
            }
        });
    }

    function endScope (scope) {
        console.log('endScope: scope=' + scope);

        var resolve;

        ignoreWhitespace().then(afterWhitespace);

        return new Promise(function (r) {
            resolve = r;
        });

        function afterWhitespace () {
            console.log('endScope::afterWhitespace');
            isEnd().then(afterEnd);
        }

        function afterEnd (atEnd) {
            console.log('endScope::afterEnd: atEnd=' + atEnd);
            if (atEnd) {
                return next().then(afterNext);
            }

            afterNext(character());
        }

        function afterNext (character) {
            console.log('endScope::afterNext: character=' + character + ', terminators[scope]=' + terminators[scope]);
            if (character !== terminators[scope]) {
                return resolve(false);
            }

            emitter.emit(events.endPrefix + scope);
            scopes.pop();

            next().then(function () {
                async.defer(endValue);
                resolve(true);
            });
        }
    }

    function object () {
        scope(events.object, property);
    }

    function property () {
        ignoreWhitespace()
            .then(next)
            .then(propertyName);
    }

    function propertyName (character) {
        checkCharacter(character, '"', 'previous');

        walkString(events.property)
            .then(ignoreWhitespace)
            .then(next)
            .then(propertyValue);
    }

    function propertyValue (character) {
        checkCharacter(character, ':', 'previous');
        async.defer(value);
    }

    function walkString (event) {
        var isQuoting, string, resolve;

        flags.walk.string = true;
        isQuoting = false;
        string = '';

        next().then(step);

        return new Promise(function (r) {
            resolve = r;
        });

        function step (character) {
            if (isQuoting) {
                isQuoting = false;

                return escape(character).then(function (escaped) {
                    string += escaped;
                    next().then(step);
                });
            }

            if (character === '\\') {
                isQuoting = true;
                return next().then(step);
            }

            if (character !== '"') {
                string += character;
                return next().then(step);
            }

            flags.walk.string = false;
            emitter.emit(event, string);
            resolve();
        }
    }

    function escape (character) {
        var promise, resolve;

        promise = new Promise(function (r) {
            resolve = r;
        });

        if (escapes[character]) {
            resolve(escapes[character]);
        } else if (character === 'u') {
            escapeHex().then(resolve);
        } else {
            fail(character, 'escape character', 'previous');
            resolve('\\' + character);
        }

        return promise;
    }

    function escapeHex () {
        var hexits, resolve;

        hexits = '';

        next().then(step.bind(null, 0));

        return new Promise(function (r) {
            resolve = r;
        });

        function step (index, character) {
            if (isHexit(character)) {
                hexits += character;
            }

            if (index < 3) {
                return next().then(step.bind(null, index + 1));
            }

            if (hexits.length === 4) {
                return resolve(String.fromCharCode(parseInt(hexits, 16)));
            }

            fail(character, 'hex digit', 'previous');

            resolve('\\u' + hexits + character);
        }
    }

    function checkCharacter (character, expected, positionKey) {
        if (character !== expected) {
            fail(character, expected, positionKey);
            return false;
        }

        return true;
    }

    function endValue () {
        ignoreWhitespace().then(function () {
            if (scopes.length === 0) {
                return isEnd().then(checkEnd);
            }

            checkScope();
        });

        function checkEnd (atEnd) {
            if (!atEnd) {
                fail(character(), 'EOF', 'current');
                return async.defer(value);
            }

            checkScope();
        }

        function checkScope () {
            var scope = scopes[scopes.length - 1];

            endScope(scope).then(function (atScopeEnd) {
                var handler;

                if (!atScopeEnd) {
                    handler = handlers[scope];

                    if (checkCharacter(character(), ',', 'current')) {
                        next().then(handler);
                    } else {
                        async.defer(handler);
                    }
                }
            });
        }
    }

    function string () {
        walkString(events.string).then(endValue);
    }

    function number (firstCharacter) {
        var digits = firstCharacter;

        walkDigits().then(addDigits.bind(null, checkDecimalPlace));

        function addDigits (step, result) {
            console.log('number::addDigits: step=' + step.name + ', result.digits=' + result.digits + ', result.atEnd=' + result.atEnd);

            digits += result.digits;

            if (result.atEnd) {
                return endNumber();
            }

            step();
        }

        function checkDecimalPlace () {
            console.log('number::checkDecimalPlace: character=' + character());

            if (character() === '.') {
                return next().then(function (character) {
                    digits += character;
                    walkDigits().then(addDigits.bind(null, checkExponent));
                });
            }

            checkExponent();
        }

        function checkExponent () {
            console.log('number::checkExponent: character=' + character());

            if (character() === 'e' || character() === 'E') {
                return next().then(function (character) {
                    digits += character;
                    awaitCharacter().then(checkSign);
                });
            }

            endNumber();
        }

        function checkSign (hasCharacter) {
            console.log('number::checkExponent: hasCharacter=' + hasCharacter + ', character=' + character());

            if (!hasCharacter) {
                return fail('EOF', 'exponent', 'current');
            }

            if (character() === '+' || character() === '-') {
                return next().then(function (character) {
                    digits += character;
                    readExponent();
                });
            }

            readExponent();
        }

        function readExponent () {
            console.log('number::readExponent');

            walkDigits().then(addDigits.bind(null, endNumber));
        }

        function endNumber () {
            console.log('number::endNumber');

            emitter.emit(events.number, parseFloat(digits));
            async.defer(endValue);
        }
    }

    function walkDigits () {
        var digits, resolve;

        digits = '';

        awaitCharacter().then(step);

        return new Promise(function (r) {
            resolve = r;
        });

        function step (hasCharacter) {
            console.log('walkDigits::step: hasCharacter=' + hasCharacter + ', character=' + character());

            if (hasCharacter && isDigit(character())) {
                return next().then(function (character) {
                    digits += character;
                    awaitCharacter().then(step);
                });
            }

            resolve({
                digits: digits,
                atEnd: !hasCharacter
            });
        }
    }

    function awaitCharacter () {
        var resolve;

        console.log('isEnd');

        async.defer(step);

        return new Promise(function (r) {
            resolve = r;
        });

        function step () {
            console.log('awaitCharacter::step: flags.walk.waiting=' + flags.walk.waiting);

            if (!flags.stream.ended && position.index === json.length) {
                endWalk();
                return async.delay(step);
            }

            resolve(position.index < json.length);

            if (position.index === json.length) {
                async.defer(endWalk);
            }
        }
    }

    function literalFalse () {
        literal([ 'a', 'l', 's', 'e' ], false);
    }

    function literal (expectedCharacters, value) {
        var actual, expected, invalid;

        isEnd().then(step);

        function step (atEnd) {
            if (invalid || atEnd || expectedCharacters.length === 0) {
                if (invalid) {
                    fail(actual, expected, 'previous');
                } else if (expectedCharacters.length > 0) {
                    fail('EOF', expectedCharacters.shift(), 'current');
                } else {
                    emitter.emit(events.literal, value);
                }

                return async.defer(endValue);
            }

            next().then(function (character) {
                actual = character;
                expected = expectedCharacters.shift();

                if (actual !== expected) {
                    invalid = true;
                }

                isEnd().then(step);
            });
        }
    }

    function literalNull () {
        literal([ 'u', 'l', 'l' ], null);
    }

    function literalTrue () {
        literal([ 'r', 'u', 'e' ], true);
    }
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
    return isDigit(character) ||
           isInRange(character, 'A', 'F') ||
           isInRange(character, 'a', 'f');
}

function isDigit (character) {
    return isInRange(character, '0', '9');
}

function isInRange (character, lower, upper) {
    var code = character.charCodeAt(0);

    return code >= lower.charCodeAt(0) && code <= upper.charCodeAt(0);
}

