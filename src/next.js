'use strict'

module.exports = createCopyFactory

function createCopyFactory() {
  const originalToProxy = new WeakMap()
  const proxyToShadows = new WeakMap()

  return createCopy
  
  function createCopy (target, debugLabel = '<root>') {
    // return original target if copy is not possible
    if (!shouldCopy(target)) return target
    // reuse existing copies
    if (originalToProxy.has(target)) {
      console.warn(`*** copy reused ${debugLabel}`)
      return originalToProxy.get(target)
    }
    // prepare a proxy
    const writes = new Map()
    const deletes = new Set()

    global.copyCount = global.copyCount || 0
    global.copyCount++
    console.warn(`+++ copy new #${global.copyCount} - ${debugLabel}`)

    // const readOnlyProps = Object.getOwnPropertyDescriptors(target).map(propIsReadOnly)
    //

    // we set the Proxy's target to a false target to avoid enforcing some invariants
    // e.g.: Proxy invariant #1
    // https://www.ecma-international.org/ecma-262/8.0/#sec-proxy-object-internal-methods-and-internal-slots-get-p-receiver
    // TypeError: 'get' on proxy: property 'prototype' is a read-only and non-configurable data property on the proxy target but the proxy did not return its actual value (expected '#<Original>' but got '[object Object]')
    const falseTarget = typeof target === 'function' ? function(){} : {}
    const proxyHandlers = {
      get (_, key) {
        const keyString = String(key)
        console.warn('$$$ get', debugLabel, keyString)
        // read from overrides
        if (writes.has(key)) {
          return writes.get(key).value
        }
        // read from proxy target
        const value = Reflect.get(target, key)
        return createCopy(value, `${debugLabel}.${keyString}`)
      },
      set (_, key, value, receiver) {
        console.warn('$$$ set', debugLabel, key, !!receiver)
        
        if (!receiver) console.warn('~~~~ no receiver')
        if (proxyToShadows.has(receiver)) {
          console.warn('~~~ receiver is proxy')
        } else {
          console.warn('~~~ receiver is NOT proxy')
          if (originalToProxy.has(receiver)) {
            console.warn('~~~ receiver has proxy')
          } else {
            console.warn('~~~ receiver does NOT have proxy')
          }
          return Reflect.set(target, key, value, receiver)
        }

        const receiverProxy = receiver
        const receiverWrites = proxyToShadows.get(receiverProxy).writes

        // if (receiver && !wrapper) console.warn('~~~~ no wrapper for receiver')

        // TODO respect setters
        receiverWrites.set(key, {
          value,
          writable: true,
          enumerable: true,
          configurable: true,
        })
        return value
      },
      getPrototypeOf (_) {
        console.warn('$$$ getPrototypeOf', debugLabel)
        const result = Reflect.getPrototypeOf(target)
        // this is fine actual, walks proto hierarchy
        // if (result && debugLabel.includes('prototype')) {
        //   const result = Reflect.getPrototypeOf(target)
        //   console.warn('double proto', target, result)
        //   throw new Error('double proto')
        // }
        return createCopy(result, `${debugLabel}.<prototype>`)
      },
      setPrototypeOf (_, newPrototype) {
        console.warn('$$$ setPrototypeOf', debugLabel)
        return Reflect.setPrototypeOf(target, newPrototype)
      },
      isExtensible (_) {
        console.warn('$$$ isExtensible', debugLabel)
        return Reflect.isExtensible(target)
      },
      preventExtensions (_) {
        console.warn('$$$ preventExtensions', debugLabel)
        return Reflect.preventExtensions(target)
      },
      getOwnPropertyDescriptor (_, key) {
        const keyString = String(key)
        console.warn('$$$ getOwnPropertyDescriptor', debugLabel, keyString)
        // check shadowed values
        if (deletes.has(key)) return undefined
        if (writes.has(key)) return writes.get(key)
        // look up on target and copy value
        const propDesc = Reflect.getOwnPropertyDescriptor(target, key)
        if (propDesc && 'value' in propDesc) {
          propDesc.value = createCopy(propDesc.value, `${debugLabel}.${keyString}`)
        }
        return propDesc
      },
      defineProperty (_, key, descriptor) {
        console.warn('$$$ defineProperty', debugLabel)
        // check if valid to define
        const targetPropDesc = proxyHandlers.getOwnPropertyDescriptor(_, key)
        if (targetPropDesc && !targetPropDesc.configurable) {
          // trigger error
          throw new TypeError(`Cannot redefine property: ${key}`)
        }
        //
        deletes.delete(key)
        writes.set(key, descriptor)
        return true
      },
      has (_, key) {
        const keyString = String(key)
        console.warn('$$$ has', debugLabel, keyString)
        if (writes.has(key)) {
          return true
        }
        if (deletes.has(key)) {
          return false
        }
        return Reflect.has(target, key)
      },
      deleteProperty (_, key) {
        const keyString = String(key)
        console.warn('$$$ deleteProperty', debugLabel, keyString)
        // ensure its not in our writes
        writes.delete(key)
        // if proxy target has value, shadow with a delete
        if (Reflect.has(target, key)) {
          deletes.set(key)
        }
      },
      ownKeys (_) {
        console.warn('$$$ ownKeys', debugLabel)
        // add targets keys
        const targetKeys = Reflect.ownKeys(target)
        const keys = new Set(targetKeys)
        // add additional keys
        for (let key of writes.keys()) keys.add(key)
        // remove deleted keys
        for (let key of deletes.keys()) keys.delete(key)
        // console.warn('$$$ ownKeys', Array.from(keys).length, keys)
        // tape's t.deepEqual needs this to be an array (?)
        return Array.from(keys.values())
      },
      apply (_, thisArg, argumentsList) {
        console.warn('$$$ apply', debugLabel)
        return Reflect.apply(target, thisArg, argumentsList)
      },
      construct (_, args, thisArg) {
        console.warn('$$$ construct', debugLabel, thisArg)
        const inst = Reflect.construct(target, args, thisArg)
        return inst
      },
    }
    const proxy = new Proxy(falseTarget, proxyHandlers)
    const shadows = { writes, deletes }
    // record proxy replacing target
    originalToProxy.set(target, proxy)
    proxyToShadows.set(proxy, shadows)
    // return proxy
    return proxy
  }
}

function shouldCopy (target) {
  if (target === null) return false
  switch (typeof target) {
    case 'object':
    case 'function':
      return true
    default:
      return false
  }
}

function propIsReadOnly (prop) {
  return !prop.configurable && !prop.writable
}