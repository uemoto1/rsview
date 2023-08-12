ace.define("ace/mode/rspaceparameters_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"], function(require, exports, module) {
    "use strict";
    var oop = require("../lib/oop");
    var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;
    var RspaceparametersHighlightRules = function() {
        var keywords = (
            '&nml_inp_prm_kukan'
            +'|ndisp|catmfn|nprocx|nprocy|nprocz|nprock|xmax|ymax|zmax|nxmax|nymax|nzmax|npxmax'
            +'|npymax|npzmax|nsym|neigmx|natom|num_atcell|num_ppcell|num_ppcell_d|nperi|npopshow'
            +'|numkx|numky|numkz|ksym|kband|skpx|skpy|skpz|nwkp|cexco|nspv'
            +'|epsvh|epssd|ratio_diis|eps_scf|ncgmin|ncgmax|ncgres'
            +'|nprecon_cg|nprecon_diis|nsdmax|nkscg|ndiismax|ncgscf|nretcg|nrrz'
            +'|nchange|eta|looplimit|nbrydn|etamag(1)|etamag(2)|tmstep|nmd_start|nmd_end'
            +'|ngdiis|sconst|biasx|biasy|biasz|tf|tfmin|tfmax|chrgd|npolcon|polconocc'
            +'|endjel|chrjel|fcut|npre|nevhist|northo|lveffout|nso'
            +'|socang|eps|eps_eig_diis|alambda_diis|alambda_min|alambda_max|nradmx'
            +'|nrprjmx|nprjmx|lsphel|nlmax|lrhomx|nfiltyp|gmaxps|psctoff|nqmx|psftrad|psctrat|psext'
            +'|filpp|rctpcc|veta|new_pwx|new_pwy|new_pwz|new_rsx|new_rsy|new_rsz|nint1dmax'
            +'|nf|nfdg|nfh|nmesh|npmesh|zs_pre|pol_pre'  
        );
        var keywordMapper = this.createKeywordMapper({
            "keyword": keywords,
        }, "identifier", true);
    
        this.$rules = {
            "start" : [ 
                {token: "comment", regex: /(#|!).*$/},
                {token: "keyword", regex : /^\s*\//},
                {token: "string", regex : /".*"/},
                {token: "string", regex : /'.*'/},
                {token: keywordMapper, regex : /\&?[a-zA-Z_$][a-zA-Z0-9_$]*/},
                {token : "constant.numeric", regex: /[+-]?\d+(\.\d*)?([eEdD][+-]?\d+)?\b/},
                {token : "constant.numeric", regex: /[+-]?\.\d+([eEdD][+-]?\d+)?\b/},
            ],
        };
    };
    oop.inherits(RspaceparametersHighlightRules, TextHighlightRules);

    exports.RspaceparametersHighlightRules = RspaceparametersHighlightRules;
    });
    
    ace.define("ace/mode/rspaceparameters",["require","exports","module","ace/lib/oop","ace/mode/text","ace/mode/rspaceparameters_highlight_rules","ace/range"], function(require, exports, module) {
    "use strict";
    
    var oop = require("../lib/oop");
    var TextMode = require("./text").Mode;
    var RspaceparametersHighlightRules = require("./rspaceparameters_highlight_rules").RspaceparametersHighlightRules;
    var Range = require("../range").Range;
    
    var Mode = function() {
        this.HighlightRules = RspaceparametersHighlightRules;
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
    
    
        this.$id = "ace/mode/rspaceparameters";
    }).call(Mode.prototype);
    
    exports.Mode = Mode;
    
    });                (function() {
                        window.require(["ace/mode/rspaceparameters"], function(m) {
                            if (typeof module == "object" && typeof exports == "object" && module) {
                                module.exports = m;
                            }
                        });
                    })();
                