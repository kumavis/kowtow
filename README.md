# kowtow

A shadow-on-write view on a reference tree.

This is intended to be a secure wrapper around a javascript reference tree (a tree of objects and functions). The consumer of the view should not be able to modify the original except through side effects of calling functions/getters/setters on the original object.

### status

WIP, not audited, don't use.

### analysis of existing modules


- [`es-membrane`](https://github.com/ajvincent/es-membrane) ooo neat, lets investigate
  - handles the case where a wrapped object is passed in to a wrapped function, by unwrapping it (not sure this is a common case)
  - supports revocation (not needed for our usecase?)
  - Does not support shadowing (local-only writes)
- [`muta`](https://github.com/mappum/muta), doesnt support classes
- [`immer`](https://github.com/immerjs/immer), doesnt allow late modifications of original