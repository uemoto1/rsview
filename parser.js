// Web RSPACE Viewer
//  Mitsuharu UEMOTO @ Kobe University
//  Copyright(c) 2019 All rights reserved.

function isReal(str) {
    return /^\s*[+-]?(\d+|\d*\.\d+)([eEdD][+-]?\d+)?$/.test(str)
}

function isInteger(str) {
    return /^\s*[+-]?\d+\s*$/.test(str);
}

function ffloat(str) {
    return parseFloat(str.replace(/D|d/, 'e'));
}

function parseNamelist(code) {
    line = code.split(/\r?\n/);
    var param = {};
    var errlog = [];
    var group = '';
    var name = '';
    var flag_group = false;
    for (i = 0; i < line.length; i++) {
        line_tmp = line[i]

        // Exclude comments:
        line_tmp = line_tmp.replace(/!.*$/, '');
        // Exclude indent and spaces:
        line_tmp = line_tmp.trim();
        // Skip empty line
        if (line_tmp.length == 0) continue;

        // Group begin
        r = /&(\w+)/.exec(line_tmp);
        if (r) {
            if (flag_group == true)
                errlog.push({'line': i, 'msg': 'Previous group is not closed!'});
            group = r[1].toLowerCase();
            flag_group = true;
            param[group] = {'line': i+1};
            continue
        }

        // Group end
        if (line_tmp == '/') {
            if (flag_group != true)
                errlog.push({'line': i, 'msg': 'Group is not opened!'});
            flag_group = false;
            continue;
        }

        if (flag_group) {
            // Parse 'var = 1' type assignment:
            r = /(\w+)\s*=\s*(\S+)/.exec(line_tmp);
            if (r) {
                name = r[1].toLowerCase();
                param[group][name] = {'line': i+1, 'val': r[2]};
                continue;
            }

            // Parse 'var(1) = 1' type assignment:
            r = /(\w+)\s*\(\s*(\d+)\s*\)\s*=\s*(\S+)/.exec(line_tmp);
            if (r) {
                name = r[1].toLowerCase();
                if (!(name in param[group]))
                    param[group][name] = {}
                index = parseInt(r[2]);
                param[group][name][index] = {'line': i+1, 'val': r[3]};
                continue;
            }

            // Parse 'var(1:3) = 1, 2, 3' type assignment:
            r = /(\w+)\(\s*(\d+)\s*:\s*(\d+)\s*\)\s*=\s*(.+)/.exec(line_tmp);
            if (r) {
                name = r[1].toLowerCase();
                if (!(name in param[group]))
                    param[group][name] = {};
                index_s = parseInt(r[2]);
                index_e = parseInt(r[3]);
                tmp = r[4].split(/\s*,\s*/);
                if (tmp.length != (index_e - index_s + 1)) {
                    errlog.push({'line': i, 'msg': 'Array length mismatch!'});
                    continue;
                }
                for (var j = 0; j <= index_e - index_s; j++)
                    param[group][name][index_s + j] = {'line': i+1, 'val': r[3]};
                continue;
            }
        }

        errlog.push({'line': i, 'msg': 'Syntax error!'});
    }
    return [param, errlog];
}


function parseAtom(code) {
    line = code.split(/\r?\n/);
    var atom = [];
    var errlog = [];
    for (i = 0; i < line.length; i++) {
        line_tmp = line[i]
        // Meglect bravais lattice section
        if (line_tmp.match(/Bravais/)) break
        // Exclude comments:
        line_tmp = line_tmp.replace(/!.*$/, '');
        // Exclude indent and spaces:
        line_tmp = line_tmp.trim();
        // Skip empty line:
        if (line_tmp.length == 0) continue;

        tmp = line_tmp.split(/\s+/);
        if (tmp.length >= 4)
            atom.push({'x': ffloat(tmp[0]), 'y': ffloat(tmp[1]), 'z': ffloat(tmp[2]), 'k': parseInt(tmp[3]), 'line': i+1});
        else
            errlog.push({'line': i+1, 'msg': 'Syntax error!'});
    }
    return [atom, errlog];
}













function checkParam(param, atom) {
    const hlim = 1.0;   // 刻み幅警告レベル
    const alim = 1.0;   // セルサイズ警告レベル
    
    var errlog = [];

    // Rule #1: existence of nml_inp_prm_kukan
    if (! ('nml_inp_prm_kukan' in param)) {
        errlog.push({'msg': '&nml_inp_prm_kukan is not defined!'});
    } else {

        for (key in param.nml_inp_prm_kukan) {
            if (key in tbl_vartype) {
                switch (tbl_vartype[key.toLowerCase()].type) {
                    case 'int':
                        if (! isInteger(param.nml_inp_prm_kukan[key].val))
                            errlog.push({'line': param.nml_inp_prm_kukan[key].line, 'msg': 'invalid integer!'});
                        break;
                    case 'real':
                        if (! isReal(param.nml_inp_prm_kukan[key].val))
                            errlog.push({'line': param.nml_inp_prm_kukan[key].line, 'msg': 'invalid real number!'});
                        break;
                    }
            } else {
                if (0 < param.nml_inp_prm_kukan[key].line)
                errlog.push({'line': param.nml_inp_prm_kukan[key].line, 'msg': 'unknown parameter!'});
            }
        }

        // Rule #2: existence and value of xmax
        if (! ('xmax' in param.nml_inp_prm_kukan)) {
            errlog.push({'msg': 'xmax is not defined!'})
        } else {
            var xmax = ffloat(param.nml_inp_prm_kukan.xmax.val)
            if (! (xmax > alim))
                errlog.push({'line': param.nml_inp_prm_kukan.xmax.line, 'msg': 'xmax is too small'});
        }
        // Rule #3: existence and value of ymax
        if (! ('ymax' in param.nml_inp_prm_kukan)) {
            errlog.push({'msg': 'ymax is not defined!'})
        } else {
            var ymax = ffloat(param.nml_inp_prm_kukan.ymax.val)
            if (! (ymax > alim))
                errlog.push({'line': param.nml_inp_prm_kukan.ymax.line, 'msg': 'ymax is too small'});
        }
        // Rule #4: existence and value of zmax
        if (! ('zmax' in param.nml_inp_prm_kukan)) {
            errlog.push({'msg': 'zmax is not defined!'})
        } else {
            var zmax = ffloat(param.nml_inp_prm_kukan.zmax.val)
            if (! (zmax > alim))
                errlog.push({'line': param.nml_inp_prm_kukan.zmax.line, 'msg': 'zmax is too small'});
        }
        // Rule #5: existence and value of nxmax
        if (! ('nxmax' in param.nml_inp_prm_kukan)) {
            errlog.push({'msg': 'nxmax is not defined!'})
        } else {
            var nxmax = parseInt(param.nml_inp_prm_kukan.nxmax.val)
            if (! (xmax / nxmax < hlim))
                errlog.push({'line': param.nml_inp_prm_kukan.nxmax.line, 'msg': 'nxmax is too small for typical calculation!'});
        }
        // Rule #6: existence and value of nxmax
        if (! ('nymax' in param.nml_inp_prm_kukan)) {
            errlog.push({'msg': 'nymax is not defined!'})
        } else {
            var nymax = parseInt(param.nml_inp_prm_kukan.nymax.val)
            if (! (ymax / nymax < hlim))
                errlog.push({'line': param.nml_inp_prm_kukan.nymax.line, 'msg': 'nymax is too small for typical calculation!'});
        }
        // Rule #7: existence and value of nxmax
        if (! ('nzmax' in param.nml_inp_prm_kukan)) {
            errlog.push({'msg': 'nzmax is not defined!'})
        } else {
            var nzmax = parseInt(param.nml_inp_prm_kukan.nzmax.val)
            if (! (zmax / nzmax < hlim))
                errlog.push({'line': param.nml_inp_prm_kukan.nzmax.line, 'msg': 'nzmax is too small for typical calculation!'});
        }
        // Rule #8: existence and value of natom
        if (! ('natom' in param.nml_inp_prm_kukan)) {
            errlog.push({'msg': 'natom is not defined!'})
        } else {
            var natom = parseInt(param.nml_inp_prm_kukan.natom.val)
            if (! (natom == atom.length)) {
                errlog.push({'line': param.nml_inp_prm_kukan.natom.line, 'msg': 'number mismatch between natom and atom.xyz!'});
            }
        }
    }
    return errlog;
}


function checkAtom(param, atom) {
    const dlim = 1.0; // 原子の近接警告
    var errlog = [];

    // Rule #9: distance of atomic position
    xmax = ffloat(param.nml_inp_prm_kukan.xmax.val);
    ymax = ffloat(param.nml_inp_prm_kukan.ymax.val);
    zmax = ffloat(param.nml_inp_prm_kukan.zmax.val);
    natom = parseInt(param.nml_inp_prm_kukan.natom.val);
    for (var i = 0; i < natom; i++) {
        for (var j = 0; j < i; j++) {
            for (var irx = -1; irx <= 1; irx++) {
                for (var iry = -1; iry <= 1; iry++) {
                    for (var irz = -1; irz <= 1; irz++) {
                        dx = atom[i].x - atom[j].x + irx * xmax * 2;
                        dy = atom[i].y - atom[j].y + iry * ymax * 2;
                        dz = atom[i].z - atom[j].z + irz * zmax * 2;
                        d = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        if (d < dlim) {
                            errlog.push({
                                'line': atom[i].line,
                                msg: 'almost same position with line ' + atom[j].line + " !"
                            });
                        }
                    }
                }
            }
        }
    }
    return errlog;
}







        





