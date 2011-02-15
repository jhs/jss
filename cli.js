#!/usr/bin/env node
// The jss command-line interface.
//

var sys = require('sys')
  , jss = require('jss')
  ;

var usage = 'jss <test predicate> [result expression]';
var argv = require('optimist').usage(usage).argv
  , predicate = argv._[0]
  , expression = argv._[1]
  , test = new Function('obj', 'with (obj) { return !!(' + predicate + ') }')
  , format = function(obj) { return JSON.stringify(obj) }
  ;

if(!predicate) {
  console.log(usage);
  process.exit(1);
}

if(expression) {
  var getter = new Function('obj, tab, require, util', 'with (obj) { return (' + expression + ') }');

  function tab_separate() {
    return Array.prototype.slice.apply(arguments).join("\t");
  }

  format = function(obj) {
    var result = getter.apply(obj, [obj, tab_separate, require, require('util')]);
    if(false && typeof result === "object")
      result = JSON.stringify(result);
    return "" + result;
  }
}

var stream = new jss.Stream();
stream.test = test;
stream.format = format;
stream.in = process.openStdin();
stream.out = process.stdout;
stream.pump();
