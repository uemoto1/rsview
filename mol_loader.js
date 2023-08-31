


function load_mol(code, spacing=0.5, margin=10.0) {
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
    nperi = 1 ! switchs for periodic boundary conditions (0; isolated, 3; periodic)
    cexco = 'vwn' ! type of exchange correlation functional vwn,pz,pbe,pw91
    nspv = 2 ! spin (1; degenerate, 2; free_collinear, 4; free_noncollinear)
    eps_scf = 1.0d-6 ! criteria of the convergency for SCF
    ncgmax = 300 ! max. # of its. for CG (P. eq.)
/
`

    line = code.split(/\r?\n/);
    title = line[0].trim();
    program = line[1].trim();
    comment = line[2].trim();
    tmp = line[3].trim().split(/\s+/);
    natom = parseInt(tmp[0])
    var xmax = 0.0;
    var ymax = 0.0;
    var zmax = 0.0;
    var atom_xyz = "! [x], [y], [z], [atom number], switch [x], [y], [z], [weight], switches [soc], [pp], [na]\n";
    for (var i=0; i<natom; i++) {
        var tmp = line[i+4].trim().split(/\s+/);
        var x = parseFloat(tmp[0]) / 0.52917721;
        var y = parseFloat(tmp[1]) / 0.52917721;
        var z = parseFloat(tmp[2]) / 0.52917721;
        xmax = Math.max(xmax, Math.abs(x))
        ymax = Math.max(ymax, Math.abs(y))
        zmax = Math.max(zmax, Math.abs(z))
        var e = tmp[3]
        var iz = tbl[e][0]
        var mass = tbl[e][1]
        atom_xyz += (x.toFixed(6) + ' ' + y.toFixed(6) + ' ' + z.toFixed(6)
            + '  ' + iz + '  1 1 1  ' + mass.toFixed(2) + '  11  ' + (i+1) + "a");
        atom_xyz += "\n";
    }
    xmax += margin;
    ymax += margin;
    zmax += margin;
    var nxmax = Math.round(xmax / spacing)
    var nymax = Math.round(ymax / spacing)
    var nzmax = Math.round(zmax / spacing)
    xmax = spacing * nxmax
    ymax = spacing * nymax
    zmax = spacing * nzmax
    parameters_inp = parameters_inp.replace(/%XMAX%/, xmax.toFixed(6))
    parameters_inp = parameters_inp.replace(/%YMAX%/, ymax.toFixed(6))
    parameters_inp = parameters_inp.replace(/%ZMAX%/, zmax.toFixed(6))
    parameters_inp = parameters_inp.replace(/%NXMAX%/, nxmax)
    parameters_inp = parameters_inp.replace(/%NYMAX%/, nymax)
    parameters_inp = parameters_inp.replace(/%NZMAX%/, nzmax)
    parameters_inp = parameters_inp.replace(/%NATOM%/, natom)
    parameters_inp = parameters_inp.replace(/%NEIGMX%/, (natom*9))

    console.log(parameters_inp)
    console.log(atom_xyz)

    return [parameters_inp, atom_xyz]
}

load_mol(`


  6  6  0  0000  0  0  0  0  0999 V2000
    1.9950   -2.3036    0.0000 C   0  0  0  0  0  0  0  0  0  0  0
    2.6600   -1.1518    0.0000 C   0  0  0  0  0  0  0  0  0  0  0
    1.9950    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0
    0.6650    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0
    0.0000   -1.1518    0.0000 C   0  0  0  0  0  0  0  0  0  0  0
    0.6650   -2.3036    0.0000 C   0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0
  1  6  2  0
  2  3  2  0
  3  4  1  0
  4  5  2  0
  5  6  1  0
M  END

> <StdInChI>
InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H

> <StdInChIKey>
UHOVQNZJYSORNB-UHFFFAOYSA-N

> <AuxInfo>
1/0/N:1,2,6,3,5,4/E:(1,2,3,4,5,6)/rA:6nCCCCCC/rB:s1;d2;s3;d4;d1s5;/rC:1.995,-2.3036,0;2.66,-1.1518,0;1.995,0,0;.665,0,0;0,-1.1518,0;.665,-2.3036,0;

> <Formula>
C6 H6

> <Mw>
78.11184

> <SMILES>
C1=CC=CC=C1

> <CSID>
236

$$$$
`)