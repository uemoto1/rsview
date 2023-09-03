
function fortran_float(x, d=true, ndigit=6, nlen=12) {
    var tmp = x.toFixed(ndigit) + (d ? "d0": "")
    nlen = Math.max(nlen, tmp.length);
    var nspace = Math.max(nlen - tmp.length, 0);
    return " ".repeat(nspace) + tmp;
}

function load_mol(code, grid=0.5, vacuum=10.0) {
    const tbl = {
        'H': [1, 1837.18],'He': [2, 7296.30],'Li': [3, 12647.20],'Be': [4, 16428.20],
        'B': [5, 19698.13],'C': [6, 21892.16],'N': [7, 25532.16],'O': [8, 29164.45],
        'F': [9, 34631.97],'Ne': [10, 36785.34],'Na': [11, 41907.79],'Mg': [12, 44303.48],
        'Al': [13, 49184.34],'Si': [14, 51194.00],'P': [15, 56461.71],'S': [16, 58439.98],
        'Cl': [17, 64614.11],'Ar': [18, 72820.75],'K': [19, 71271.84],'Ca': [20, 73057.72],
        'Sc': [21, 81949.61],'Ti': [22, 87256.20],'V': [23, 92860.67],'Cr': [24, 94783.09],
        'Mn': [25, 100145.93],'Fe': [26, 101799.21],'Co': [27, 107428.64],'Ni': [28, 106991.52],
        'Cu': [29, 115837.27],'Zn': [30, 119180.45],'Ga': [31, 127097.25],'Ge': [32, 132396.39],
        'As': [33, 136573.71],'Se': [34, 143955.33],'Br': [35, 145650.61],'Kr': [36, 152754.41],
        'Rb': [37, 155798.27],'Sr': [38, 159721.49],'Y': [39, 162065.43],'Zr': [40, 166291.18],
        'Nb': [41, 169357.95],'Mo': [42, 174906.15],'Tc': [43, 178643.07],'Ru': [44, 184239.34],
        'Rh': [45, 187585.25],'Pd': [46, 193991.79],'Ag': [47, 196631.70],'Cd': [48, 204918.19],
        'In': [49, 209300.41],'Sn': [50, 216395.09],'Sb': [51, 221954.90],'Te': [52, 232600.57],
        'I': [53, 231332.70],'Xe': [54, 239332.50],'Cs': [55, 242271.82],'Ba': [56, 250331.81],
        'La': [57, 253209.18],'Ce': [58, 255415.84],'Pr': [59, 256858.95],'Nd': [60, 262937.08],
        'Pm': [61, 264318.83],'Sm': [62, 274089.51],'Eu': [63, 277013.43],'Gd': [64, 286649.21],
        'Tb': [65, 289703.19],'Dy': [66, 296219.38],'Ho': [67, 300649.60],'Er': [68, 304894.51],
        'Tm': [69, 307948.24],'Yb': [70, 315458.14],'Lu': [71, 318944.97],'Hf': [72, 325367.37],
        'Ta': [73, 329847.81],'W': [74, 335119.82],'Re': [75, 339434.60],'Os': [76, 346768.08],
        'Ir': [77, 350390.16],'Pt': [78, 355616.38],'Au': [79, 359048.09],'Hg': [80, 365656.85],
        'Tl': [81, 372565.59],'Pb': [82, 377702.49],'Bi': [83, 380947.96],'Po': [84, 380983.69],
        'At': [85, 382806.58],'Rn': [86, 404681.24]
    }

    var parameters_inp = `&nml_inp_prm_kukan
    nprocx = 1 ! # of processes (x)
    nprocy = 1 ! # of processes (y)
    nprocz = 1 ! # of processes (z)
    nprock = 1 ! # of processes (k)
    xmax = %XMAX% ! length of supercell (x in bohr, total length is 2*xmax)
    ymax = %YMAX% ! length of supercell (y in bohr, total length is 2*ymax)
    zmax = %ZMAX% ! length of supercell (z in bohr, total length is 2*zmax)
    nxmax = %NXMAX% ! # of grid points (x, total number is 2*nxmax)
    nymax = %NYMAX% ! # of grid points (y, total number is 2*nymax)
    nzmax = %NZMAX% ! # of grid points (z, total number is 2*nzmax)
    neigmx = %NEIGMX% ! # of states per k point
    natom = %NATOM% ! # of atoms
    nperi = 0 ! switchs for periodic boundary conditions (0; isolated, 3; periodic)
    cexco = 'vwn' ! type of exchange correlation functional vwn,pz,pbe,pw91
    nspv = 2 ! spin (1; degenerate, 2; free_collinear, 4; free_noncollinear)
    eps_scf = 1.0d-6 ! criteria of the convergency for SCF
    looplimit = 1000 ! max. # of its. for SCF
/
`

    line = code.split(/\r?\n/);
    title = line[0].trim();
    program = line[1].trim();
    comment = line[2].trim();
    tmp = line[3].trim().split(/\s+/);
    natom = parseInt(tmp[0])
    var x = [];
    var y = [];
    var z = [];
    var e = [];
    for (var i=0; i<natom; i++) {
        var tmp = line[i+4].trim().split(/\s+/);
        x.push(parseFloat(tmp[0]) / 0.52917721);
        y.push(parseFloat(tmp[1]) / 0.52917721);
        z.push(parseFloat(tmp[2]) / 0.52917721);
        e.push(tmp[3]);
    }
    var xshift = (Math.max(...x) + Math.min(...x)) * 0.5;
    var yshift = (Math.max(...y) + Math.min(...y)) * 0.5;
    var zshift = (Math.max(...z) + Math.min(...z)) * 0.5;
    var xmax = Math.max(...x) - xshift + vacuum;
    var ymax = Math.max(...y) - yshift + vacuum;
    var zmax = Math.max(...z) - zshift + vacuum;
    var nxmax = Math.round(xmax / grid)
    var nymax = Math.round(ymax / grid)
    var nzmax = Math.round(zmax / grid)
    xmax = grid * nxmax
    ymax = grid * nymax
    zmax = grid * nzmax
    var atom_xyz = "! [x], [y], [z], [atom number], switch [x], [y], [z], [weight], switches [soc], [pp], [na]\n";
    for (var i=0; i<natom; i++) {
        var iz = tbl[e[i]][0]
        var mass = tbl[e[i]][1]
        atom_xyz += fortran_float(x[i]-xshift, false) 
            + ' ' + fortran_float(y[i]-yshift, false) 
            + ' ' + fortran_float(z[i]-zshift, false)
            + '  ' + iz + '  1 1 1  ' 
            + fortran_float(mass, false, 2)
            + '  11  ' + (i+1) + "a" + "\n";
    }
    parameters_inp = parameters_inp.replace(/%XMAX%/, fortran_float(xmax))
    parameters_inp = parameters_inp.replace(/%YMAX%/, fortran_float(ymax))
    parameters_inp = parameters_inp.replace(/%ZMAX%/, fortran_float(zmax))
    parameters_inp = parameters_inp.replace(/%NXMAX%/, nxmax)
    parameters_inp = parameters_inp.replace(/%NYMAX%/, nymax)
    parameters_inp = parameters_inp.replace(/%NZMAX%/, nzmax)
    parameters_inp = parameters_inp.replace(/%NATOM%/, natom)
    parameters_inp = parameters_inp.replace(/%NEIGMX%/, (natom*9))
    return [parameters_inp, atom_xyz]
}



function load_poscar(code, grid=0.5, nkx=1, nky=1, nkz=1) {
    const bohr_ang = 0.52917721;
    const tbl = {
        'H': [1, 1837.18],'He': [2, 7296.30],'Li': [3, 12647.20],'Be': [4, 16428.20],
        'B': [5, 19698.13],'C': [6, 21892.16],'N': [7, 25532.16],'O': [8, 29164.45],
        'F': [9, 34631.97],'Ne': [10, 36785.34],'Na': [11, 41907.79],'Mg': [12, 44303.48],
        'Al': [13, 49184.34],'Si': [14, 51194.00],'P': [15, 56461.71],'S': [16, 58439.98],
        'Cl': [17, 64614.11],'Ar': [18, 72820.75],'K': [19, 71271.84],'Ca': [20, 73057.72],
        'Sc': [21, 81949.61],'Ti': [22, 87256.20],'V': [23, 92860.67],'Cr': [24, 94783.09],
        'Mn': [25, 100145.93],'Fe': [26, 101799.21],'Co': [27, 107428.64],'Ni': [28, 106991.52],
        'Cu': [29, 115837.27],'Zn': [30, 119180.45],'Ga': [31, 127097.25],'Ge': [32, 132396.39],
        'As': [33, 136573.71],'Se': [34, 143955.33],'Br': [35, 145650.61],'Kr': [36, 152754.41],
        'Rb': [37, 155798.27],'Sr': [38, 159721.49],'Y': [39, 162065.43],'Zr': [40, 166291.18],
        'Nb': [41, 169357.95],'Mo': [42, 174906.15],'Tc': [43, 178643.07],'Ru': [44, 184239.34],
        'Rh': [45, 187585.25],'Pd': [46, 193991.79],'Ag': [47, 196631.70],'Cd': [48, 204918.19],
        'In': [49, 209300.41],'Sn': [50, 216395.09],'Sb': [51, 221954.90],'Te': [52, 232600.57],
        'I': [53, 231332.70],'Xe': [54, 239332.50],'Cs': [55, 242271.82],'Ba': [56, 250331.81],
        'La': [57, 253209.18],'Ce': [58, 255415.84],'Pr': [59, 256858.95],'Nd': [60, 262937.08],
        'Pm': [61, 264318.83],'Sm': [62, 274089.51],'Eu': [63, 277013.43],'Gd': [64, 286649.21],
        'Tb': [65, 289703.19],'Dy': [66, 296219.38],'Ho': [67, 300649.60],'Er': [68, 304894.51],
        'Tm': [69, 307948.24],'Yb': [70, 315458.14],'Lu': [71, 318944.97],'Hf': [72, 325367.37],
        'Ta': [73, 329847.81],'W': [74, 335119.82],'Re': [75, 339434.60],'Os': [76, 346768.08],
        'Ir': [77, 350390.16],'Pt': [78, 355616.38],'Au': [79, 359048.09],'Hg': [80, 365656.85],
        'Tl': [81, 372565.59],'Pb': [82, 377702.49],'Bi': [83, 380947.96],'Po': [84, 380983.69],
        'At': [85, 382806.58],'Rn': [86, 404681.24]
    }

    var parameters_inp = `&nml_inp_prm_kukan
    nprocx = 1 ! # of processes (x)
    nprocy = 1 ! # of processes (y)
    nprocz = 1 ! # of processes (z)
    nprock = 1 ! # of processes (k)
    xmax = %XMAX% ! length of supercell (x in bohr, total length is 2*xmax)
    ymax = %YMAX% ! length of supercell (y in bohr, total length is 2*ymax)
    zmax = %ZMAX% ! length of supercell (z in bohr, total length is 2*zmax)
    nxmax = %NXMAX% ! # of grid points (x, total number is 2*nxmax)
    nymax = %NYMAX% ! # of grid points (y, total number is 2*nymax)
    nzmax = %NZMAX% ! # of grid points (z, total number is 2*nzmax)
    neigmx = %NEIGMX% ! # of states per k point
    natom = %NATOM% ! # of atoms
    nperi = 3 ! switchs for periodic boundary conditions (0; isolated, 3; periodic)
    cexco = 'vwn' ! type of exchange correlation functional vwn,pz,pbe,pw91
    nspv = 2 ! spin (1; degenerate, 2; free_collinear, 4; free_noncollinear)
    eps_scf = 1.0d-6 ! criteria of the convergency for SCF
    looplimit = 1000 ! max. # of its. for SCF
    numkx =	%NUMKX% ! # of sampling k points (x)
    numky = %NUMKY% ! # of sampling k points (y)
    numkz = %NUMKZ% ! # of sampling k points (z)
%KPOINTS%
/
`
    var line = code.split(/\r?\n/);
    var title = line[0].trim();
    var scale = parseFloat(line[1].trim());
    var a_vec = [];
    for (var i=0; i<3; i++) {
        var tmp = line[2+i].trim().split(/\s+/);
        a_vec.push([
            parseFloat(tmp[0]) / bohr_ang * scale,
            parseFloat(tmp[1]) / bohr_ang * scale,
            parseFloat(tmp[2]) / bohr_ang * scale
        ])
    }

    for (var i=0; i<2; i++) {
        for (var j=i; j<3; j++) {
            if (i == j) {
                if (a_vec[i][i] < 0.01) {
                    return []; // Error
                }
            } else {
                if (Math.abs(a_vec[i][j]) > 0.01) {
                    return []; // Error
                }
            }
        }
    }

    var xmax = a_vec[0][0] * 0.5;
    var ymax = a_vec[1][1] * 0.5;
    var zmax = a_vec[2][2] * 0.5;

    var elem_list = line[5].trim().split(/\s+/)
    var tmp = line[6].trim().split(/\s+/);
    var natom_elem = [];
    var natom;
    for(var i=0; i<elem_list.length; i++) {
        natom_elem.push(parseInt(tmp[i]))
    }
    k = 7;
    if (line[k].match(/selective dynamics/i)) {
        k++;
    }
    if (line[k].match(/cartesian/i)) {
        flag_fractional = false;
        k++;
    } else if (line[k].match(/direct/i)) {
        flag_fractional = true;
        k++;
    }
    var x = [];
    var y = [];
    var z = [];
    var e = [];
    var natom = 0
    for (var i=0; i<elem_list.length; i++) {
        for (var j=0; j<natom_elem[i]; j++) {
            var tmp = line[k].trim().split(/\s+/);
            r1 = parseFloat(tmp[0]);
            r2 = parseFloat(tmp[1]);
            r3 = parseFloat(tmp[2]);
            if (flag_fractional) {
                x.push((r1 - 0.5) * 2 * xmax)
                y.push((r2 - 0.5) * 2 * ymax)
                z.push((r3 - 0.5) * 2 * zmax)
            } else {
                x.push(r1 / bohr_ang);
                y.push(r2 / bohr_ang);
                z.push(r3 / bohr_ang);
            }
            e.push(elem_list[i])
            natom++;
            k++;
        }
    }
    
    var nxmax = Math.round(xmax / grid)
    var nymax = Math.round(ymax / grid)
    var nzmax = Math.round(zmax / grid)
    var atom_xyz = "! [x], [y], [z], [atom number], switch [x], [y], [z], [weight], switches [soc], [pp], [na]\n";
    for (var i=0; i<natom; i++) {
        var iz = tbl[e[i]][0]
        var mass = tbl[e[i]][1]
        atom_xyz += fortran_float(x[i], false) 
            + ' ' + fortran_float(y[i], false) 
            + ' ' + fortran_float(z[i], false)
            + '  ' + iz + '  1 1 1  ' 
            + fortran_float(mass, false, 2)
            + '  11  ' + (i+1) + "a" + "\n";
    }
    var ik = 1;
    var kpoints = "";
    for (var ikx=0; ikx<nkx; ikx++) {
        var kx = 1.0 / nkx * ikx;
        if (0.5 < kx) { kx -= 1.0 };
        for (var iky=0; iky<nky; iky++) {
            var ky = 1.0 / nky * iky;
            if (0.5 < ky) { ky -= 1.0 };
            for (var ikz=0; ikz<nkz; ikz++) {
                var kz = 1.0 / nkz * ikz;
                if (0.5 < kz) { kz -= 1.0 };
                kpoints += "    skpx(" + ik + ") = " + fortran_float(kx, false) + "\n";
                kpoints += "    skpy(" + ik + ") = " + fortran_float(ky, false) + "\n";
                kpoints += "    skpz(" + ik + ") = " + fortran_float(kz, false) + "\n";
                ik++;
            }
        }
    }
    parameters_inp = parameters_inp.replace(/%XMAX%/, fortran_float(xmax))
    parameters_inp = parameters_inp.replace(/%YMAX%/, fortran_float(ymax))
    parameters_inp = parameters_inp.replace(/%ZMAX%/, fortran_float(zmax))
    parameters_inp = parameters_inp.replace(/%NXMAX%/, nxmax)
    parameters_inp = parameters_inp.replace(/%NYMAX%/, nymax)
    parameters_inp = parameters_inp.replace(/%NZMAX%/, nzmax)
    parameters_inp = parameters_inp.replace(/%NATOM%/, natom)
    parameters_inp = parameters_inp.replace(/%NEIGMX%/, (natom*9))
    parameters_inp = parameters_inp.replace(/%NUMKX%/, nkx)
    parameters_inp = parameters_inp.replace(/%NUMKY%/, nky)
    parameters_inp = parameters_inp.replace(/%NUMKZ%/, nkz)
    parameters_inp = parameters_inp.replace(/%NKY%/, (natom*9))
    parameters_inp = parameters_inp.replace(/%NKZ%/, (natom*9))
    parameters_inp = parameters_inp.replace(/%KPOINTS%/, kpoints)
    return [parameters_inp, atom_xyz]
}
