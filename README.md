# Phantomic

- Pipes stdin to [PhantomJS](http://phantomjs.org)
- Writes script console output to stdout
- Writes script errors to stderr
- Exit code 0 if nothing threw, otherwise 1

## Install

```
npm install -g phantomic
```

## Usage

Phantomic does not include PhantomJS itself. Make sure the `phantomjs`
executable is in your `PATH`.

Pipe any script to phantomic:

```
phantomic < script.js
```

With Browserify:

```
browserify script.js | phantomic
```

If you are using phantomic from a Makefile with a local install, you will have
to include it in the PATH:

```
BIN = ./node_modules/.bin
PATH := $(BIN):$(PATH)

test:
  browserify test.js | phantomic
```

## API

You can use phantomic from your own node scripts like this:

```js
var phantomic = require('phantomic');

phantomic(process.stdin, function (code) {
  process.exit(code);
}).pipe(process.stdout);
```

## Run the test cases

```
make
```

## License

MIT
