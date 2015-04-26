/*globals require, module, setImmediate, Promise, Map, Symbol, console */

'use strict';

var EventEmitter, error, events;

EventEmitter = require('events').EventEmitter;
error = require('./error');
events = require('./events');

if (typeof Array.from !== 'function') {
    Array.from = require('./arrayfrom');
}

module.exports = eventify;

/**
 * Public function `eventify`.
 *
 * Asynchronously traverses a data structure (depth-first) and returns an
 * EventEmitter instance, emitting events as it encounters data. Sanely
 * handles promises, dates, maps and other iterables.
 *
 * @param data:        The data structure to traverse.
 *
 * @option apply:      Dictionary of {function name:argument array} pairs.
 *                     When functions are encountered in the data, this
 *                     object is checked for keys that match the function
 *                     name. If a match exists, the function is applied
 *                     using the associated argument array and an event is
 *                     emitted for the result. If no match exists or this
 *                     option is not specified, the function is ignored.
 *
 * @option promises:   'resolve' or 'ignore', default is 'resolve'.
 *
 * @option poll:       Promise resolution polling period in milliseconds,
 *                     default is 1000.
 *
 * @option dates:      'toJSON' or 'ignore', default is 'toJSON'.
 *
 * @option maps:       'object', or 'ignore', default is 'object'.
 *
 * @option iterables:  'array', or 'ignore', default is 'array'.
 *
 * @option debug:      Log debug messages to the console.
 **/
function eventify (data, options) {
    var coercions, emitter;

    coercions = {};
    emitter = new EventEmitter();

    normaliseOptions();
    setImmediate(begin);

    return emitter;

    function normaliseOptions () {
        options = options || {};
        options.apply = options.apply || {};
        options.poll = options.poll || 1000;

        normaliseOption('promises');
        normaliseOption('dates');
        normaliseOption('maps');
        normaliseOption('iterables');

        if (!options.debug) {
            debug = function () {};
        }
    }

    function normaliseOption (key) {
        if (options[key] !== 'ignore') {
            coercions[key] = true;
        }
    }

    function begin () {
        debug('begin');

        proceed(data).then(after);

        function after () {
            debug('begin::after: emitting end');
            emitter.emit(events.end);
        }
    }

    function proceed (datum) {
        var type;

        debug('proceed:', datum);

        return coerce(datum).then(after);

        function after (coerced) {
            debug('proceed::after:', coerced);

            if (coerced === undefined) {
                return;
            }

            if (coerced === false || coerced === true || coerced === null) {
                return literal(coerced);
            }

            type = typeof coerced;

            if (type === 'string' || type === 'number') {
                return value(coerced, type);
            }

            if (Array.isArray(coerced)) {
                return array(coerced);
            }

            return object(coerced);
        }
    }

    function coerce (datum) {
        if (datum instanceof Promise) {
            return coerceThing(datum, 'promises', coercePromise);
        }

        if (datum instanceof Date) {
            return coerceThing(datum, 'dates', coerceDate);
        }

        if (datum instanceof Map) {
            return coerceThing(datum, 'maps', coerceMap);
        }

        if (
            datum &&
            typeof datum !== 'string' &&
            typeof datum[Symbol.iterator] === 'function'
        ) {
            return coerceThing(datum, 'iterables', coerceIterable);
        }

        return Promise.resolve(datum);
    }

    function coerceThing (datum, thing, fn) {
        if (coercions[thing]) {
            return fn(datum);
        }

        debug('coerceThing(%s): resolving to undefined', thing);

        return Promise.resolve();
    }

    function coercePromise (promise) {
        return promise.then(function (result) {
            debug('coercePromise: resolved to %s', result);
            return result;
        }).catch(function () {
            debug('coercePromise: rejected');
            return;
        });
    }

    function coerceDate (date) {
        return Promise.resolve(date.toJSON());
    }

    function coerceMap (map) {
        var result = {};

        // TODO: coerce recursively

        map.forEach(function (value, key) {
            result[key] = value;
        });

        return Promise.resolve(result);
    }

    function coerceIterable (iterable) {
        // TODO: coerce recursively

        return Promise.resolve(Array.from(iterable));
    }

    function literal (datum) {
        value(datum, 'literal');
    }

    function value (datum, type) {
        debug('value: emitting %s `%s`', type, datum);
        emitter.emit(events[type], datum);
    }

    function array (datum) {
        return collection(datum, 'array', proceed);
    }

    function collection (c, type, action) {
        var resolve;

        debug('proceed: emitting %s[%d]', type, c.length);
        emitter.emit(events[type]);

        setImmediate(item.bind(null, 0));

        return new Promise(function (r) {
            resolve = r;
        });

        function item (index) {
            if (index >= c.length) {
                debug('proceed::item: emitting end-%s[%d]', type, c.length);
                emitter.emit(events.endPrefix + events[type]);

                return resolve();
            }

            action(c[index]).then(item.bind(null, index + 1));
        }
    }

    function object (datum) {
        return collection(Object.keys(datum), 'object', function (key) {
            debug('proceed: emitting property `%s`', key);
            emitter.emit(events.property, key);

            return proceed(datum[key]);
        });
    }

    function debug () {
        console.log.apply(console, arguments);
    }
}

