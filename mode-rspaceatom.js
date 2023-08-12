ace.define("ace/mode/rspaceatom_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"], function(require, exports, module) {
    "use strict";
    
    var oop = require("../lib/oop");
    var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;
    
    var RspaceatomHighlightRules = function() {
        var keywords = (
            ''
        );
        // var keywordMapper = this.createKeywordMapper({
        //     "keyword": keywords,
        // }, "identifier", true);
    
        this.$rules = {
            "start" : [ 
                {token: "comment", regex: /!.*$/},
                {token: "comment", regex: /\d+a$/},
                // {token: "keyword", regex : /^\s*\//},
                {token: "string", regex : /".*"/},
                {token: "string", regex : /'.*'/},
                // {token: keywordMapper, regex : /\&?[a-zA-Z_$][a-zA-Z0-9_$]*/},
                {token : "constant.numeric", regex: /[+-]?\d+(\.\d*)?([eEdD][+-]?\d+)?\b/},
                {token : "constant.numeric", regex: /[+-]?\.\d+([eEdD][+-]?\d+)?\b/},
            ],
        };
    };
    
    oop.inherits(RspaceatomHighlightRules, TextHighlightRules);
    
    exports.RspaceatomHighlightRules = RspaceatomHighlightRules;
    });
    
    ace.define("ace/mode/rspaceatom",["require","exports","module","ace/lib/oop","ace/mode/text","ace/mode/rspaceatom_highlight_rules","ace/range"], function(require, exports, module) {
    "use strict";
    
    var oop = require("../lib/oop");
    var TextMode = require("./text").Mode;
    var RspaceatomHighlightRules = require("./rspaceatom_highlight_rules").RspaceatomHighlightRules;
    var Range = require("../range").Range;
    
    var Mode = function() {
        this.HighlightRules = RspaceatomHighlightRules;
        this.$behaviour = this.$defaultBehaviour;
    };
    oop.inherits(Mode, TextMode);
    
    (function() {
    
        this.lineCommentStart = "--";
    
        this.getNextLineIndent = function(state, line, tab) {
            var indent = this.$getIndent(line);
    
            var tokenizedLine = this.getTokenizer().getLineTokens(line, state);
            var tokens = tokenizedLine.tokens;
    
            if (tokens.length && tokens[tokens.length-1].type == "comment") {
                return indent;
            }
            if (state == "start") {
                var match = line.match(/^.*(begin|loop|then|is|do)\s*$/);
                if (match) {
                    indent += tab;
                }
            }
    
            return indent;
        };
    
        this.checkOutdent = function(state, line, input) {
            var complete_line = line + input;
            if (complete_line.match(/^\s*(begin|end)$/)) {
                return true;
            }
    
            return false;
        };
    
        this.autoOutdent = function(state, session, row) {
    
            var line = session.getLine(row);
            var prevLine = session.getLine(row - 1);
            var prevIndent = this.$getIndent(prevLine).length;
            var indent = this.$getIndent(line).length;
            if (indent <= prevIndent) {
                return;
            }
    
            session.outdentRows(new Range(row, 0, row + 2, 0));
        };
    
    
        this.$id = "ace/mode/rspaceatom";
    }).call(Mode.prototype);
    
    exports.Mode = Mode;
    
    });                (function() {
                        window.require(["ace/mode/rspaceatom"], function(m) {
                            if (typeof module == "object" && typeof exports == "object" && module) {
                                module.exports = m;
                            }
                        });
                    })();
                