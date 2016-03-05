### 0.4.1

- performance enhancements and fix for (as yet undocumented) add/update/inject callbacks

### 0.4.0

- major refactor of the code for clarity and cleanliness
- fix major performance issue by only making newly added keys observable, instead of grossly making ALL keys observable again. this takes effect when injecting the same (or slightly updated) object more than once to a store.

### 0.3.1

- bugfix: .injecting an object with an association being null did not overwrite the old value. now it will overwrite with null for singular association, or observable([]) for plural association.

### 0.3.0

- fix package.json: MobX is now a peerDependency

### 0.2.0

- fix the build to actually produce a `require`-able package

### 0.1.0

- initial release but didn't work.
