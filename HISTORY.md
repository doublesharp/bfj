# History

## 3.1.1

* fix: document the dropped support for node 4 (6120c9e)

## 3.1.0

* chore: tweak the readme (040e9be)
* chore: swap out bespoke circular array for hoopy (0ed7986)
* feature: used fixed-length circular array in streamify (e773a94)
* fix: eliminate mockery allowed module warning (b1dc7db)
* chore: fix lint errors (abde4de)

## 3.0.0

* chore: delete left-over debugging code (b903a27)
* chore: run tests on node 7 (acbb808)
* chore: remove old linter config (62c18ce)
* chore: update dependencies (882c74c)
* chore: add an integration test that parses a request (029afdb)
* chore: fix the broken perf test (8ac0e03)
* chore: add a crude memory-profiling script (1ee6f36)
* breaking change: preallocate memory to avoid out-of-memory conditions (18da753)
* feature: implement unpipe (f8a41d2)

## 2.1.2

* Fix lint errors.

## 2.1.1

* Fix "unhandled rejection" warnings.

## 2.1.0

* Stop throwing errors from promise-returning methods.

## 2.0.0

* Honour `toJSON` on all objects.
* Drop support for Node.js 0.12, switch to ES6.
* Tidy the readme.

## 1.2.2

* Sanely escape strings when serialising (thanks [@rowanmanning](https://github.com/rowanmanning)).

## 1.2.1

* Sanely handle `undefined`, functions and symbols.

## 1.2.0

* Sanely handle circular references in the data when serialising.

## 1.1.0

* Pass `options` to `fs.createReadStream` inside `read`.
* Fix truncated output bug in `write`.

## 1.0.0

* Breaking changes:
  * Take `Readable` parameter in `walk`.
  * Return `EventEmitter` from `walk`.
  * Return `Promise` from `write`.
* Fix stream termination bug in `streamify`.
* Fix missing comma after empty objects and arrays in `streamify`.
* Improve tests.
* Add `reviver` option for `parse` and `read`.
* Add `space` option for `streamify`, `stringify` and `write`.
* Remove the `debug` option from all functions.

## 0.2.0

* Implement `eventify`.
* Implement `streamify`.
* Implement `stringify`.
* Implement `write`.

## 0.1.0

* Initial release.

