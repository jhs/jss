// The jss API
//

var sys = require('sys')
  , events = require('events')
  ;

function Stream () {
  var self = this;
  events.EventEmitter.call(self);

  self.test = null;
  self.format = null;
  self.in = null;
  self.out = null;
  self.pre    = null;
  self.suf    = null;
  self.head   = null;
  self.tail   = null;
  self.silent = null;
  self.state = {};

  self.on('line', function on_line(line) {
    if(!self.test)
      throw new Error("No JS test defined");

    var obj;
    try      { obj = JSON.parse(line) }
    catch(e) { return; /* Nothing to do */ }

    self.emit('json', obj);
  })

  self.on('json', function on_json(obj) {
    var result = false;
    try      { result = self.test.apply(obj, [obj, self.state]) }
    catch(e) { return; }

    if( !! (result) )
      self.emit('match', obj, result);
  })

  var match_count = 0;
  self.on('match', function on_match(obj, result) {
    if(match_count === 0)
      self.out.write(self.head || '');

    match_count += 1;

    try {
      var output = self.format.apply(obj, [obj, result, self.state]);
      if(output) {
        if(self.pre)
          self.out.write(self.pre);

        self.out.write(output);

        if(self.suf)
          self.out.write(self.suf);

        self.out.write("\n");
      }
    } catch (e) {
      if(self.silent)
        return; /* Nothing to do */
      throw e;
    }
  })
}
sys.inherits(Stream, events.EventEmitter);

Stream.prototype.pump = function() {
  var self = this
    , ready_lines = []
    , unterminated = ""
    ;

  if(self.prefix)
    self.emit('line', self.prefix);

  self.in.setEncoding('utf8');
  self.in.on('data', function on_data(chunk) {
    chunk.split(/\r?\n/).forEach(function(line, a, lines) {
      if(a === 0) {
        line = unterminated + line;
        unterminated = "";
      }

      if(a + 1 === lines.length) {
        unterminated = line;
      } else {
        ready_lines.push(line.replace(/,$/, ""));
      }
    })

    var line;
    while(line = ready_lines.shift())
      self.emit('line', line);
  })

  self.in.on('end', function() {
    self.out.write(self.tail || '');
  })

  self.in.on('error', function(er) {
    console.log("!!!!!!!!!!!!!!" + er);
  })
}

exports.Stream = Stream;
