'use strict';

var assert, mockery, spooks, modulePath;

assert = require('chai').assert;
mockery = require('mockery');
spooks = require('spooks');

modulePath = '../src/streamify';

mockery.registerAllowable(modulePath);
mockery.registerAllowable('./events');

suite('streamify:', function () {
    var log, results;

    setup(function () {
        log = {};
        results = {
            eventify: [
                { on: spooks.fn({ name: 'on', log: log }) }
            ]
        };

        mockery.enable({ useCleanCache: true });
        mockery.registerMock('./eventify', spooks.fn({
            name: 'eventify',
            log: log,
            results: results.eventify
        }));
        mockery.registerMock('./rstream', spooks.ctor({
            name: 'JsonStream',
            log: log,
            archetype: { instance: { push: function () {} } }
        }));
    });

    teardown(function () {
        mockery.deregisterMock('./rstream');
        mockery.deregisterMock('./eventify');
        mockery.disable();

        log = results = undefined;
    });

    test('require does not throw', function () {
        assert.doesNotThrow(function () {
            require(modulePath);
        });
    });

    test('require returns function', function () {
        assert.isFunction(require(modulePath));
    });

    suite('require:', function () {
        var streamify;

        setup(function () {
            streamify = require(modulePath);
        });

        teardown(function () {
            streamify = undefined;
        });

        test('streamify expects two arguments', function () {
            assert.lengthOf(streamify, 2);
        });

        test('streamify does not throw', function () {
            assert.doesNotThrow(function () {
                streamify();
            });
        });

        test('streamify returns stream', function () {
            assert.strictEqual(streamify(), require('./rstream')());
        });

        test('JsonStream was not called', function () {
            assert.strictEqual(log.counts.JsonStream, 0);
        });

        test('eventify was not called', function () {
            assert.strictEqual(log.counts.eventify, 0);
        });

        test('EventEmitter.on was not called', function () {
            assert.strictEqual(log.counts.on, 0);
        });

        suite('streamify:', function () {
            var data, options, result;

            setup(function () {
                data = {};
                options = {};
                result = streamify(data, options);
            });

            teardown(function () {
                data = options = result = undefined;
            });

            test('JsonStream was called once', function () {
                assert.strictEqual(log.counts.JsonStream, 1);
                assert.isObject(log.these.JsonStream[0]);
            });

            test('JsonStream was called correctly', function () {
                assert.lengthOf(log.args.JsonStream[0], 1);
                assert.isFunction(log.args.JsonStream[0][0]);
            });

            test('eventify was called once', function () {
                assert.strictEqual(log.counts.eventify, 1);
                assert.isUndefined(log.these.eventify[0]);
            });

            test('eventify was called correctly', function () {
                assert.lengthOf(log.args.eventify[0], 2);
                assert.strictEqual(log.args.eventify[0][0], data);
                assert.lengthOf(Object.keys(log.args.eventify[0][0]), 0);
                assert.strictEqual(log.args.eventify[0][1], options);
                assert.lengthOf(Object.keys(log.args.eventify[0][1]), 0);
            });

            test('EventEmitter.on was called nine times', function () {
                assert.strictEqual(log.counts.on, 9);
                assert.strictEqual(log.these.on[0], results.eventify[0]);
                assert.strictEqual(log.these.on[1], results.eventify[0]);
                assert.strictEqual(log.these.on[2], results.eventify[0]);
                assert.strictEqual(log.these.on[3], results.eventify[0]);
                assert.strictEqual(log.these.on[4], results.eventify[0]);
                assert.strictEqual(log.these.on[5], results.eventify[0]);
                assert.strictEqual(log.these.on[6], results.eventify[0]);
                assert.strictEqual(log.these.on[7], results.eventify[0]);
                assert.strictEqual(log.these.on[8], results.eventify[0]);
            });

            test('EventEmitter.on was called correctly first time', function () {
                assert.lengthOf(log.args.on[0], 2);
                assert.strictEqual(log.args.on[0][0], 'arr');
                assert.isFunction(log.args.on[0][1]);
            });

            test('EventEmitter.on was called correctly second time', function () {
                assert.lengthOf(log.args.on[1], 2);
                assert.strictEqual(log.args.on[1][0], 'obj');
                assert.isFunction(log.args.on[1][1]);
                assert.notStrictEqual(log.args.on[1][1], log.args.on[0][1]);
            });

            test('EventEmitter.on was called correctly third time', function () {
                assert.lengthOf(log.args.on[2], 2);
                assert.strictEqual(log.args.on[2][0], 'pro');
                assert.isFunction(log.args.on[2][1]);
                assert.notStrictEqual(log.args.on[2][1], log.args.on[0][1]);
                assert.notStrictEqual(log.args.on[2][1], log.args.on[1][1]);
            });

            test('EventEmitter.on was called correctly fourth time', function () {
                assert.lengthOf(log.args.on[3], 2);
                assert.strictEqual(log.args.on[3][0], 'str');
                assert.isFunction(log.args.on[3][1]);
                assert.notStrictEqual(log.args.on[3][1], log.args.on[0][1]);
                assert.notStrictEqual(log.args.on[3][1], log.args.on[1][1]);
                assert.notStrictEqual(log.args.on[3][1], log.args.on[2][1]);
            });

            test('EventEmitter.on was called correctly fifth time', function () {
                assert.lengthOf(log.args.on[4], 2);
                assert.strictEqual(log.args.on[4][0], 'num');
                assert.isFunction(log.args.on[4][1]);
                assert.notStrictEqual(log.args.on[4][1], log.args.on[0][1]);
                assert.notStrictEqual(log.args.on[4][1], log.args.on[1][1]);
                assert.notStrictEqual(log.args.on[4][1], log.args.on[2][1]);
                assert.notStrictEqual(log.args.on[4][1], log.args.on[3][1]);
            });

            test('EventEmitter.on was called correctly sixth time', function () {
                assert.lengthOf(log.args.on[5], 2);
                assert.strictEqual(log.args.on[5][0], 'lit');
                assert.isFunction(log.args.on[5][1]);
                assert.strictEqual(log.args.on[5][1], log.args.on[4][1]);
            });

            test('EventEmitter.on was called correctly seventh time', function () {
                assert.lengthOf(log.args.on[6], 2);
                assert.strictEqual(log.args.on[6][0], 'end-arr');
                assert.isFunction(log.args.on[6][1]);
                assert.notStrictEqual(log.args.on[6][1], log.args.on[0][1]);
                assert.notStrictEqual(log.args.on[6][1], log.args.on[1][1]);
                assert.notStrictEqual(log.args.on[6][1], log.args.on[2][1]);
                assert.notStrictEqual(log.args.on[6][1], log.args.on[3][1]);
                assert.notStrictEqual(log.args.on[6][1], log.args.on[4][1]);
            });

            test('EventEmitter.on was called correctly eighth time', function () {
                assert.lengthOf(log.args.on[7], 2);
                assert.strictEqual(log.args.on[7][0], 'end-obj');
                assert.isFunction(log.args.on[7][1]);
                assert.notStrictEqual(log.args.on[7][1], log.args.on[0][1]);
                assert.notStrictEqual(log.args.on[7][1], log.args.on[1][1]);
                assert.notStrictEqual(log.args.on[7][1], log.args.on[2][1]);
                assert.notStrictEqual(log.args.on[7][1], log.args.on[3][1]);
                assert.notStrictEqual(log.args.on[7][1], log.args.on[4][1]);
                assert.notStrictEqual(log.args.on[7][1], log.args.on[6][1]);
            });

            test('EventEmitter.on was called correctly ninth time', function () {
                assert.lengthOf(log.args.on[8], 2);
                assert.strictEqual(log.args.on[8][0], 'end');
                assert.isFunction(log.args.on[8][1]);
                assert.notStrictEqual(log.args.on[8][1], log.args.on[0][1]);
                assert.notStrictEqual(log.args.on[8][1], log.args.on[1][1]);
                assert.notStrictEqual(log.args.on[8][1], log.args.on[2][1]);
                assert.notStrictEqual(log.args.on[8][1], log.args.on[3][1]);
                assert.notStrictEqual(log.args.on[8][1], log.args.on[4][1]);
                assert.notStrictEqual(log.args.on[8][1], log.args.on[6][1]);
                assert.notStrictEqual(log.args.on[8][1], log.args.on[7][1]);
            });

            suite('array event:', function () {
                setup(function () {
                    log.args.on[0][1]();
                });

                test('stream.push was not called', function () {
                    assert.strictEqual(log.counts.push, 0);
                });

                suite('read stream:', function () {
                    setup(function () {
                        log.args.JsonStream[0][0]();
                    });

                    test('stream.push was called once', function () {
                        assert.strictEqual(log.counts.push, 1);
                        assert.strictEqual(log.these.push[0], require('./rstream')());
                    });

                    test('stream.push was called correctly', function () {
                        assert.lengthOf(log.args.push[0], 2);
                        assert.strictEqual(log.args.push[0][0], '[');
                        assert.strictEqual(log.args.push[0][1], 'utf8');
                    });

                    suite('read stream:', function () {
                        setup(function () {
                            log.args.JsonStream[0][0]();
                        });

                        test('stream.push was called once', function () {
                            assert.strictEqual(log.counts.push, 2);
                        });

                        test('stream.push was called correctly', function () {
                            assert.strictEqual(log.args.push[1][0], '');
                        });

                        suite('read stream:', function () {
                            setup(function () {
                                log.args.JsonStream[0][0]();
                            });

                            test('stream.push was called once', function () {
                                assert.strictEqual(log.counts.push, 3);
                            });

                            test('stream.push was called correctly', function () {
                                assert.strictEqual(log.args.push[2][0], '');
                            });
                        });
                    });
                });

                suite('end event:', function () {
                    setup(function () {
                        log.args.on[8][1]();
                    });

                    test('stream.push was not called', function () {
                        assert.strictEqual(log.counts.push, 0);
                    });

                    suite('read stream:', function () {
                        setup(function () {
                            log.args.JsonStream[0][0]();
                        });

                        test('stream.push was called once', function () {
                            assert.strictEqual(log.counts.push, 1);
                        });

                        test('stream.push was called correctly', function () {
                            assert.strictEqual(log.args.push[0][0], '[');
                        });

                        suite('read stream:', function () {
                            setup(function () {
                                log.args.JsonStream[0][0]();
                            });

                            test('stream.push was called once', function () {
                                assert.strictEqual(log.counts.push, 2);
                            });

                            test('stream.push was called correctly', function () {
                                assert.isNull(log.args.push[1][0]);
                            });

                            suite('read stream:', function () {
                                setup(function () {
                                    log.args.JsonStream[0][0]();
                                });

                                test('stream.push was called once', function () {
                                    assert.strictEqual(log.counts.push, 3);
                                });

                                test('stream.push was called correctly', function () {
                                    assert.isNull(log.args.push[2][0]);
                                });
                            });
                        });
                    });
                });

                suite('string event:', function () {
                    setup(function () {
                        log.args.on[3][1]('foo');
                    });

                    test('stream.push was not called', function () {
                        assert.strictEqual(log.counts.push, 0);
                    });

                    suite('read stream:', function () {
                        setup(function () {
                            log.args.JsonStream[0][0]();
                        });

                        test('stream.push was called once', function () {
                            assert.strictEqual(log.counts.push, 1);
                        });

                        test('stream.push was called correctly', function () {
                            assert.strictEqual(log.args.push[0][0], '["foo"');
                        });
                    });

                    suite('string event:', function () {
                        setup(function () {
                            log.args.on[3][1]('bar');
                        });

                        test('stream.push was not called', function () {
                            assert.strictEqual(log.counts.push, 0);
                        });

                        suite('read stream:', function () {
                            setup(function () {
                                log.args.JsonStream[0][0]();
                            });

                            test('stream.push was called once', function () {
                                assert.strictEqual(log.counts.push, 1);
                            });

                            test('stream.push was called correctly', function () {
                                assert.strictEqual(log.args.push[0][0], '["foo","bar"');
                            });
                        });
                    });

                    suite('array event:', function () {
                        setup(function () {
                            log.args.on[0][1]();
                        });

                        test('stream.push was not called', function () {
                            assert.strictEqual(log.counts.push, 0);
                        });

                        suite('read stream:', function () {
                            setup(function () {
                                log.args.JsonStream[0][0]();
                            });

                            test('stream.push was called once', function () {
                                assert.strictEqual(log.counts.push, 1);
                            });

                            test('stream.push was called correctly', function () {
                                assert.strictEqual(log.args.push[0][0], '["foo",[');
                            });
                        });

                        suite('string event:', function () {
                            setup(function () {
                                log.args.on[3][1]('bar');
                            });

                            test('stream.push was not called', function () {
                                assert.strictEqual(log.counts.push, 0);
                            });

                            suite('read stream:', function () {
                                setup(function () {
                                    log.args.JsonStream[0][0]();
                                });

                                test('stream.push was called once', function () {
                                    assert.strictEqual(log.counts.push, 1);
                                });

                                test('stream.push was called correctly', function () {
                                    assert.strictEqual(log.args.push[0][0], '["foo",["bar"');
                                });
                            });

                            suite('string event:', function () {
                                setup(function () {
                                    log.args.on[3][1]('baz');
                                });

                                test('stream.push was not called', function () {
                                    assert.strictEqual(log.counts.push, 0);
                                });

                                suite('read stream:', function () {
                                    setup(function () {
                                        log.args.JsonStream[0][0]();
                                    });

                                    test('stream.push was called once', function () {
                                        assert.strictEqual(log.counts.push, 1);
                                    });

                                    test('stream.push was called correctly', function () {
                                        assert.strictEqual(log.args.push[0][0], '["foo",["bar","baz"');
                                    });
                                });
                            });

                            suite('endArray event:', function () {
                                setup(function () {
                                    log.args.on[6][1]();
                                });

                                suite('string event:', function () {
                                    setup(function () {
                                        log.args.on[3][1]('baz');
                                    });

                                    test('stream.push was not called', function () {
                                        assert.strictEqual(log.counts.push, 0);
                                    });

                                    suite('read stream:', function () {
                                        setup(function () {
                                            log.args.JsonStream[0][0]();
                                        });

                                        test('stream.push was called once', function () {
                                            assert.strictEqual(log.counts.push, 1);
                                        });

                                        test('stream.push was called correctly', function () {
                                            assert.strictEqual(log.args.push[0][0], '["foo",["bar"],"baz"');
                                        });
                                    });
                                });
                            });
                        });
                    });

                    suite('object event:', function () {
                        setup(function () {
                            log.args.on[1][1]();
                        });

                        test('stream.push was not called', function () {
                            assert.strictEqual(log.counts.push, 0);
                        });

                        suite('read stream:', function () {
                            setup(function () {
                                log.args.JsonStream[0][0]();
                            });

                            test('stream.push was called once', function () {
                                assert.strictEqual(log.counts.push, 1);
                            });

                            test('stream.push was called correctly', function () {
                                assert.strictEqual(log.args.push[0][0], '["foo",{');
                            });
                        });

                        suite('property event:', function () {
                            setup(function () {
                                log.args.on[2][1]('bar');
                            });

                            test('stream.push was not called', function () {
                                assert.strictEqual(log.counts.push, 0);
                            });

                            suite('read stream:', function () {
                                setup(function () {
                                    log.args.JsonStream[0][0]();
                                });

                                test('stream.push was called once', function () {
                                    assert.strictEqual(log.counts.push, 1);
                                });

                                test('stream.push was called correctly', function () {
                                    assert.strictEqual(log.args.push[0][0], '["foo",{"bar":');
                                });
                            });

                            suite('string event:', function () {
                                setup(function () {
                                    log.args.on[3][1]('baz');
                                });

                                test('stream.push was not called', function () {
                                    assert.strictEqual(log.counts.push, 0);
                                });

                                suite('read stream:', function () {
                                    setup(function () {
                                        log.args.JsonStream[0][0]();
                                    });

                                    test('stream.push was called once', function () {
                                        assert.strictEqual(log.counts.push, 1);
                                    });

                                    test('stream.push was called correctly', function () {
                                        assert.strictEqual(log.args.push[0][0], '["foo",{"bar":"baz"');
                                    });
                                });

                                suite('property event:', function () {
                                    setup(function () {
                                        log.args.on[2][1]('qux');
                                    });

                                    suite('string event:', function () {
                                        setup(function () {
                                            log.args.on[3][1]('wibble');
                                        });

                                        test('stream.push was not called', function () {
                                            assert.strictEqual(log.counts.push, 0);
                                        });

                                        suite('read stream:', function () {
                                            setup(function () {
                                                log.args.JsonStream[0][0]();
                                            });

                                            test('stream.push was called once', function () {
                                                assert.strictEqual(log.counts.push, 1);
                                            });

                                            test('stream.push was called correctly', function () {
                                                assert.strictEqual(log.args.push[0][0], '["foo",{"bar":"baz","qux":"wibble"');
                                            });
                                        });
                                    });
                                });

                                suite('endObject event:', function () {
                                    setup(function () {
                                        log.args.on[7][1]();
                                    });

                                    suite('string event:', function () {
                                        setup(function () {
                                            log.args.on[3][1]('wibble');
                                        });

                                        test('stream.push was not called', function () {
                                            assert.strictEqual(log.counts.push, 0);
                                        });

                                        suite('read stream:', function () {
                                            setup(function () {
                                                log.args.JsonStream[0][0]();
                                            });

                                            test('stream.push was called once', function () {
                                                assert.strictEqual(log.counts.push, 1);
                                            });

                                            test('stream.push was called correctly', function () {
                                                assert.strictEqual(log.args.push[0][0], '["foo",{"bar":"baz"},"wibble"');
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });

            suite('object event:', function () {
                setup(function () {
                    log.args.on[1][1]();
                });

                test('stream.push was not called', function () {
                    assert.strictEqual(log.counts.push, 0);
                });

                suite('read stream:', function () {
                    setup(function () {
                        log.args.JsonStream[0][0]();
                    });

                    test('stream.push was called once', function () {
                        assert.strictEqual(log.counts.push, 1);
                    });

                    test('stream.push was called correctly', function () {
                        assert.strictEqual(log.args.push[0][0], '{');
                    });
                });
            });
        });
    });
});

