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
    try      { result = self.test.apply(obj, [obj]) }
    catch(e) { return; }

    if(result)
      self.emit('match', obj);
  })

  self.on('match', function on_match(obj) {
    try {
      var output = self.format.apply(obj, [obj]);
      if(output) {
        self.out.write(output);
        self.out.write("\n");
      }
    } catch (e) {
      return; /* Nothing to do */
    }
  })
}
sys.inherits(Stream, events.EventEmitter);

Stream.prototype.pump = function() {
  var self = this
    , ready_lines = []
    , unterminated = ""
    ;

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
}

exports.Stream = Stream;
