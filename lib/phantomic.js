'use strict';

var through   = require('through');
var convert   = require('convert-source-map');
var sourceMap = require('source-map');
var spawn     = require('child_process').spawn;
var path      = require('path');


var cwd = process.cwd();
var RE = /http\:\/\/localhost\:[0-9]+\/js\/bundle\:([0-9]+)/;
var IGNORE_RE = /(node_modules\/browser\-pack\/_prelude\.js)|(node_modules\/mocha\/mocha\.js)/;


function pipe(stdin, phin, phout, stdout) {
  var js = '';
  stdin.on('data', function (chunk) {
    js += chunk;
  });
  stdin.on('end', function () {
    if (!js) {
      phin.end();
      return;
    }
    var map = convert.fromSource(js);
    if (map) {
      map = map.toObject();
      delete map.sourcesContent;
      var mapper = new sourceMap.SourceMapConsumer(map);
      js = convert.removeComments(js);
      var buf = '';
      phout.on('data', function (data) {
        if (data) {
          buf += data.toString();
          var p = buf.lastIndexOf('\n');
          if (p !== -1) {
            var str = mapStacktrace(mapper, buf, p);
            stdout.queue(str);
            buf = buf.substring(p + 1);
          }
        }
      });
      phout.on('end', function () {
        stdout.queue(null);
      });
    } else {
      phout.pipe(stdout);
    }

    phin.write(js);
    phin.end();
  });
}

function mapStacktrace(mapper, str, p) {
  return str
    .split('\n')
    .map(function(line) {
      var ignore = false;
      line = line.replace(RE, function (m, nr) {
        /*jslint unparam: true*/
        if (nr < 1) {
          return '?';
        }
        var mapped = mapper.originalPositionFor({
          line   : nr,
          column : 0
        });
        if (IGNORE_RE.exec(mapped.source)) {
          ignore = true;
        }
        var relativeSource = path.relative(cwd, mapped.source);
        var source = /^\.\./.exec(relativeSource) ?
          mapped.source :
          relativeSource;
        return source + ':' + mapped.line;
      });
      return ignore ? undefined : line;
    })
    .filter(function(line) { return line !== undefined; })
    .join('\n');
}

module.exports = function (input, cb) {
  var phantomjs = spawn('phantomjs', [__dirname + '/runner.js'], {
    env: {
      PATH: process.env.PATH,
      PHANTOMIC_SHIM_PATH: require.resolve('es5-shim/es5-shim')
    }
  });
  var output    = through();

  pipe(input, phantomjs.stdin, phantomjs.stdout, output);

  phantomjs.stderr.on('data', function (data) {
    output.queue(data);
  });

  phantomjs.on('exit', function (code) {
    output.queue(null);
    process.nextTick(function () {
      cb(code);
    });
  });

  return output;
};
