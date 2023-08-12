

tbl_vartype = {
    'ndisp': {'type': 'int'},
    'catmfn': {'type': 'str'},
    'nprocx': {'type': 'int'},
    'nprocy': {'type': 'int'},
    'nprocz': {'type': 'int'},
    'nprock': {'type': 'int'},
    'xmax': {'type': 'real'},
    'ymax': {'type': 'real'},
    'zmax': {'type': 'real'},
    'nxmax': {'type': 'int'},
    'nymax': {'type': 'int'},
    'nzmax': {'type': 'int'},
    'npxmax': {'type': 'int'},
    'npymax': {'type': 'int'},
    'npzmax': {'type': 'int'},
    'nsym': {'type': 'int'},
    'neigmx': {'type': 'int'},
    'natom': {'type': 'int'},
    'num_atcell': {'type': 'int'},
    'num_ppcell': {'type': 'int'},
    'num_ppcell_d': {'type': 'int'},
    'nperi': {'type': 'int'},
    'npopshow': {'type': 'int'},
    'numkx': {'type': 'int'},
    'numky': {'type': 'int'},
    'numkz': {'type': 'int'},
    'ksym': {'type': 'int'},
    'kband': {'type': 'int'},
    'skpx': {'type': 'other'},
    'skpy': {'type': 'other'},
    'skpz': {'type': 'other'},
    'nwkp': {'type': 'other'},
    'cexco': {'type': 'str'},
    'nspv': {'type': 'int'},
    'epsvh': {'type': 'real'},
    'epssd': {'type': 'real'},
    'ratio_diis': {'type': 'real'},
    'eps_scf': {'type': 'real'},
    'ncgmin': {'type': 'real'},
    'ncgmax': {'type': 'real'},
    'ncgres': {'type': 'real'},
    'nprecon_cg': {'type': 'real'},
    'nprecon_diis': {'type': 'real'},
    'nsdmax': {'type': 'real'},
    'nkscg': {'type': 'real'},
    'ndiismax': {'type': 'real'},
    'ncgscf': {'type': 'real'},
    'nretcg': {'type': 'int'},
    'nrrz': {'type': 'int'},
    'nchange': {'type': 'int'},
    'eta': {'type': 'real'},
    'looplimit': {'type': 'real'},
    'nbrydn': {'type': 'int'},
    'etamag': {'type': 'other'},
    'tmstep': {'type': 'real'},
    'nmd_start': {'type': 'real'},
    'nmd_end': {'type': 'real'},
    'ngdiis': {'type': 'int'},
    'sconst': {'type': 'real'},
    'biasx': {'type': 'real'},
    'biasy': {'type': 'real'},
    'biasz': {'type': 'real'},
    'tf': {'type': 'real'},
    'tfmin': {'type': 'real'},
    'tfmax': {'type': 'real'},
    'chrgd': {'type': 'real'},
    'npolcon': {'type': 'int'},
    'polconocc': {'type': 'real'},
    'endjel': {'type': 'real'},
    'chrjel': {'type': 'real'},
    'fcut': {'type': 'real'},
    'npre': {'type': 'int'},
    'nevhist': {'type': 'real'},
    'northo': {'type': 'real'},
    'lveffout': {'type': 'other'},
    'nso': {'type': 'int'},
    'socang': {'type': 'other'},
    'eps': {'type': 'real'},
    'eps_eig_diis': {'type': 'real'},
    'alambda_diis': {'type': 'real'},
    'alambda_min': {'type': 'real'},
    'alambda_max': {'type': 'real'},
    'nradmx': {'type': 'real'},
    'nrprjmx': {'type': 'real'},
    'nprjmx': {'type': 'real'},
    'lsphel': {'type': 'int'},
    'nlmax': {'type': 'int'},
    'lrhomx': {'type': 'int'},
    'nfiltyp': {'type': 'int'},
    'gmaxps': {'type': 'real'},
    'psctoff': {'type': 'real'},
    'nqmx': {'type': 'int'},
    'psftrad': {'type': 'real'},
    'psctrat': {'type': 'real'},
    'psext': {'type': 'real'},
    'filpp': {'type': 'real'},
    'rctpcc': {'type': 'real'},
    'veta': {'type': 'real'},
    'new_pwx': {'type': 'int'},
    'new_pwy': {'type': 'int'},
    'new_pwz': {'type': 'int'},
    'new_rsx': {'type': 'int'},
    'new_rsy': {'type': 'int'},
    'new_rsz': {'type': 'int'},
    'nint1dmax': {'type': 'int'},
    'nf': {'type': 'real'},
    'nfdg': {'type': 'real'},
    'nfh': {'type': 'real'},
    'nmesh': {'type': 'int'},
    'npmesh': {'type': 'int'},
    'zs_pre': {'type': 'real'},
    'pol_pre': {'type': 'real'},
    'kmeshgen': {'type': 'int'},
}

template_parameters_inp = `! alpha SiO2 (quartz)
&nml_inp_prm_kukan
    nprocx =       1 ! # of processes (x)
    nprocy =       1 ! # of processes (y)
    nprocz =       1 ! # of processes (z)
    nprock =       1 ! # of processes (k)
    ymax   =   8.041 ! length of supercell (y in bohr, total length is 2*ymax)
    xmax   =   4.642 ! length of supercell (x in bohr, total length is 2*xmax)
    zmax   =   5.107 ! length of supercell (z in bohr, total length is 2*zmax)
    nxmax  =      14 ! # of grid points (x, total number is 2*nxmax)
    nymax  =      18 ! # of grid points (y, total number is 2*nymax)
    nzmax  =      26 ! # of grid points (z, total number is 2*nzmax)
    neigmx =      52 ! # of states per k point
    natom  =      18 ! # of atoms
    nperi  =       3 ! switchs for periodic boundary conditions (0; isolated, 3; periodic)
    numkx  =       1 ! # of sampling k points (x)
    numky  =       1 ! # of sampling k points (y)
    numkz  =       1 ! # of sampling k points (z)
    cexco  =   'vwn' ! type of exchange correlation functional vwn,pz,pbe,pw91
    nspv   =       1 ! spin (1; degenerate, 2; free_collinear, 4; free_noncollinear)
    eps_scf=  1.0d-6 ! criteria of the convergency for SCF
    ncgmax =     300 ! max. # of its. for CG (P. eq.)
/
`;



template_atom_xyz = `! [x], [y], [z], [atom number], switch [x], [y], [z], [weight], switches [soc], [pp], [na]
  4.365  0.000 -5.107  14  1 1 1  51194.00  11   1a
 -2.183  3.779  1.703  14  1 1 1  51194.00  11   2a
 -2.183 -3.779 -1.703  14  1 1 1  51194.00  11   3a
  2.598  2.152 -3.891   8  1 1 1  29164.45  11   4a
  0.565  3.326  0.486   8  1 1 1  29164.45  11   5a
 -3.162  1.174  2.919   8  1 1 1  29164.45  11   6a
 -3.162 -1.174 -2.919   8  1 1 1  29164.45  11   7a
  0.565 -3.326 -0.486   8  1 1 1  29164.45  11   8a
  2.598 -2.152  3.891   8  1 1 1  29164.45  11   9a
 -0.278 -8.041 -5.107  14  1 1 1  51194.00  11  10a
  2.460 -4.262  1.703  14  1 1 1  51194.00  11  11a
  2.460  4.262 -1.703  14  1 1 1  51194.00  11  12a
 -2.045 -5.889 -3.891   8  1 1 1  29164.45  11  13a
 -4.078 -4.715  0.486   8  1 1 1  29164.45  11  14a
  1.480 -6.867  2.919   8  1 1 1  29164.45  11  15a
  1.480  6.867 -2.919   8  1 1 1  29164.45  11  16a
 -4.078  4.715 -0.486   8  1 1 1  29164.45  11  17a
 -2.045  5.889  3.891   8  1 1 1  29164.45  11  18a
`;
