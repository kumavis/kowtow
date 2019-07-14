# kowtow

"bow before the power of proxies"

A shadow-on-write view on a reference tree.

This is intended to be a secure wrapper around a javascript reference tree (a tree of objects and functions). The consumer of the view should not be able to modify the original except through side effects of calling functions/getters/setters on the original object.

### status

WIP, not audited, don't use.

### usage

Basic usage
```js
const createCopy = require('kowtow')()

const orig = { a: 123 }
const copy = createCopy(orig)

copy.b = 456

orig // { a: 123 }
copy // { a: 123, b: 456 }

orig.c = 789

orig // { a: 123, c: 789 }
copy // { a: 123, b: 456, c: 789 }
```

Advanced usage. Each call to `createCopyFactory` is a space that de-dupes copies
```js
const createCopyFactory = require('kowtow')

const createCopyA = createCopyFactory()

const orig = {}
orig.self = orig
const copy = createCopyA(orig)

orig === copy // false

orig.self === orig // true
copy.self === copy // true

createCopyA(orig) === createCopyA(orig) // true
createCopyA(orig) === copy // true
createCopyA(copy) === copy // true

const createCopyB = createCopyFactory()

createCopyA(orig) === createCopyB(orig) // false
createCopyB(orig) === copy // false
createCopyB(copy) === copy // false
```

Works with fancy objects like classes
```js
const createCopy = require('kowtow')()

// base class
class A {
  abc () { return 123 }
  xyz () { return 456 }
}
// copy of base class with proxied prototype
const B = createCopy(A)
B.prototype.abc = function () { return this.xyz() }
// child class
class C extends B {
  xyz () { return 789 }
}

const a = new A()
const b = new B()
const c = new C()

a.abc() // 123
b.abc() // 456
c.abc() // 789
```

See tests for more examples

### analysis of existing modules


- [`es-membrane`](https://github.com/ajvincent/es-membrane) ooo neat, lets investigate
  - handles the case where a wrapped object is passed in to a wrapped function, by unwrapping it (not sure this is a common case)
  - supports revocation (not needed for our usecase?)
  - Does not support shadowing (local-only writes)
- [`muta`](https://github.com/mappum/muta), doesnt support classes
- [`immer`](https://github.com/immerjs/immer), doesnt allow late modifications of original