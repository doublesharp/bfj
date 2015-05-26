// HACK: This module exists because I couldn't make any proper CPU profiler
//       work. They all either failed to install, or failed to run after
//       installing.

/*globals require, module, process */

'use strict';

var check, context, timings, sums, nanosecondsPerSecond;

check = require('check-types');

timings = [];
context = [];
sums = {};
nanosecondsPerSecond = 1000000000;

module.exports = initialise;

function initialise (options) {
    if (!options.time) {
        begin = end = report = function () {};
    }

    return { begin: begin, end: end, report: report };
}

function begin (functionName) {
    var datum = {
        timing: process.hrtime(),
        functionName: functionName,
        children: []
    };

    //if (context.length === 0) {
    //    timings.push(datum);
    //} else {
    //    context[context.length - 1].children.push(datum);
    //}

    if (sums[functionName]) {
        sums[functionName].count += 1;
    } else {
        sums[functionName] = { count: 1, total: [ 0, 0 ] };
    }

    context.push(datum);
}

function end (functionName) {
    var datum, sum, nanoseconds;

    check.assert(context.length > 0);

    datum = context[context.length - 1];

    check.assert(datum.functionName === functionName);

    datum.timing = process.hrtime(datum.timing);
    sum = sums[functionName];
    nanoseconds = sum.total[1] + datum.timing[1];
    sum.total[0] += datum.timing[0] + Math.floor(nanoseconds / nanosecondsPerSecond);
    sum.total[1] = nanoseconds % nanosecondsPerSecond;

    context.pop();
}

function report () {
    check.assert(context.length === 0);

    return {
        timings: timings,
        sums: sums
    };
}

