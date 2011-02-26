#!/usr/bin/env node
// The jss command-line interface.
//

var sys = require('sys')
  , jss = require('jss')
  , util = require('util')
  ;

var usage = 'jss <test predicate> [result expression]';
var argv = require('optimist').boolean(['bulk_docs', 'bulk-docs'])
                              .boolean(['object'])
                              .argv
  , predicate = argv._[0]
  , expression = argv._[1]
  ;

var test = new Function('$, $s', 'with ($) { return (' + predicate + ') }');
var format = function(obj) { return JSON.stringify(obj) };

if(argv.version) {
  console.log('jss v' + jss.version);
  process.exit(0);
}

if(!predicate) {
  console.log(usage);
  process.exit(1);
}

if(expression) {
  var getter = new Function('obj, $, $s, tab, kv, require, util', 'with (obj) { return (' + expression + ') }');

  function tab_separate() {
    return Array.prototype.slice.apply(arguments).join("\t");
  }

  function keyval_line(key, val) {
    if(typeof key !== 'string')
      throw new Error("Bad key for keyval: " + key);

    return JSON.stringify(key) + ":" + JSON.stringify(val);
  }

  format = function(obj, test_result, stream_state) {
    var result = getter.apply(obj, [obj, test_result, stream_state, tab_separate, keyval_line, require, util]);
    if(typeof result === "object")
      result = JSON.stringify(result);
    return "" + result;
  }
}

var stream = new jss.Stream();
stream.test = test;
stream.format = format;
stream.in = process.openStdin();
stream.out = process.stdout;

if(argv.state) {
  function json_from_file(filename) {
    var data = require('fs').readFileSync(filename).toString('utf8');
    return JSON.parse(data);
  }

  var state_init = new Function('require, util, load', 'return (' + argv.state + ')');
  stream.state = state_init(require, util, json_from_file);
}

if(argv.bulk_docs || argv['bulk-docs']) {
  argv.head = '{"docs":\n';
  argv.tail = ']}';

  stream.pre = function() {
    stream.pre = function() { return ", " };
    return "[ ";
  }
} else if(argv.object) {
  argv.tail = '}';

  stream.pre = function() {
    stream.pre = function() { return ", " };
    return '{ ';
  }
}

; ['pre', 'suf', 'head', 'tail'].forEach(function(arg) {
  if(argv[arg])
    stream[arg] = argv[arg];
})

stream.pump();
