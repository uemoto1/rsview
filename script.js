// Web RSPACE Viewer
//  Mitsuharu UEMOTO @ Kobe University
//  Copyright(c) 2019 All rights reserved.

// グローバル変数
var natom = 0; // 全原子数
var atom_type = []; // 元素種
var atom_line = []; // 行番号(atom.xyz)
var atom_coor = []; // 原子座標
var nperi = 0; // 周期境界条件フラグ
var xmax = 0; // xmax
var ymax = 0; // ymax
var zmax = 0; // zmax

// 内部状態
var flag_change = true; // テキストボックスの内容が変更された場合

// 表示領域サイズ
var window_width;
var window_height;
var viewer_width;
var viewer_height;
var viewer_unit;
var viewer_zoom = 1.00;

// 三次元レンダラ関連
var renderer; // レンダラオブジェクト
var camera; // カメラ
var scene; // シーン
var object; // オブジェクト
var axis; // 座標軸オブジェクト

//
const panelLeft = document.getElementById("panelLeft");
const panelLeftCell1 = document.getElementById("panelLeftCell1");
const panelLeftCell2 = document.getElementById("panelLeftCell2");
const panelLeftCell3 = document.getElementById("panelLeftCell3");
const parameters_inp = document.getElementById("parameters_inp");
const atom_xyz = document.getElementById("atom_xyz");
const panelRight = document.getElementById("panelRight");
const viewer = document.getElementById("viewer");
const footer = document.getElementById("footer")


var qdir_0 = new THREE.Quaternion(0.80, 0.27 , 0.20, -0.50);
var qdir_xy = new THREE.Quaternion(1.00, 0.00, 0.00, 0.00);
var qdir_yz = new THREE.Quaternion(0.50, 0.50, 0.50, -0.50);
var qdir_xz = new THREE.Quaternion(0.70, 0.00, 0.00, -0.70);

// オブジェクト回転用クオータニオン
var quaternion = qdir_0.normalize();


// エラー警告
var errmsg = [];

var bohr_angstrom = 0.529177210903;


ace.config.setModuleUrl("ace/mode/rspaceparameters", "mode-rspaceparameters.js")
ace.config.setModuleUrl("ace/mode/rspaceatom", "mode-rspaceatom.js")

var crystal3d = new Crystal3D($('#viewer')[0]);
var editor_parameters_inp = ace.edit("parameters_inp",{
theme: "ace/theme/eclipse",
mode: "ace/mode/rspaceparameters"});
var editor_atom_xyz = ace.edit("atom_xyz",{
theme: "ace/theme/eclipse",
mode: "ace/mode/rspaceatom"});

// editor_parameters_inp.session.setMode("ace/mode/rspaceparameters");
// editor_atom_xyz.session.setMode("ace/mode/rspaceatom");

var Range = ace.require('ace/range').Range

function showErrorMsg(name, errlog) {


}

// parameters.inpファイルの展開
function parse(parameters_inp, atom_xyz) {
    natom = 0;
    xmax = 1.0;
    ymax = 1.0;
    zmax = 1.0;

    atom_line = [];
    atom_coor = [];
    atom_type = [];

    errmsg = [];

    while (true) {
        [param, errlog_nml] = parseNamelist(parameters_inp);
        if (errlog_nml.length > 0) break;

        [atom, errlog_atom] = parseAtom(atom_xyz);
        if (errlog_atom.length > 0) break;

        errlog_nml = errlog_nml.concat(checkParam(param, atom));
        if (errlog_nml.length > 0) break;

        errlog_atom = errlog_atom.concat(checkAtom(param, atom));
        if (errlog_atom.length > 0) break;

        natom = parseInt(param.nml_inp_prm_kukan.natom.val);
        nxmax = parseInt(param.nml_inp_prm_kukan.nxmax.val);
        nymax = parseInt(param.nml_inp_prm_kukan.nymax.val);
        nzmaz = parseInt(param.nml_inp_prm_kukan.nzmax.val);
        xmax = ffloat(param.nml_inp_prm_kukan.xmax.val);
        ymax = ffloat(param.nml_inp_prm_kukan.ymax.val);
        zmax = ffloat(param.nml_inp_prm_kukan.zmax.val);

        for (var i = 0; i < natom; i++) {
            atom_line.push(atom[i].line);
            atom_coor.push(new THREE.Vector3(atom[i].x, atom[i].y, atom[i].z));
            atom_type.push(atom[i].k);
        }
        return 0;
    }


    for (var i = 0; i < errlog_nml.length; i++) {
        errmsg.push("<li>parameters.inp: line " + errlog_nml[i].line + ": " + errlog_nml[i].msg + "</li>");
    }
    for (var i = 0; i < errlog_atom.length; i++) {
        errmsg.push("<li>atom.xyz: line " + errlog_atom[i].line + ": " + errlog_atom[i].msg + "</li>");
    }

    $("#errmsg").empty();
    $("#errmsg").html(errmsg.join("\n"));
    $("#errmsgModal").modal("show");

    return 0;
}

function execute() {
    // 変更済みフラグを切る
    flag_change = false;
    // エディタのセレクタ解除
    // $('#parameters_inp div').removeClass('selected');
    // $('#parameters_inp div').removeClass('error');
    // $('#atom_xyz div').removeClass('selected');
    // $('#atom_xyz div').removeClass('error');
    $("#error").hide();
    // テキストの読み込み
    parse(
        editor_parameters_inp.getValue(),
        editor_atom_xyz.getValue()
    );
    plot_structure();
    generate_element_list();
    

    if (errmsg.length == 0) {
        // ボタン表示を変更
        $("#run").removeClass().addClass("btn btn-outline-primary");
        $('#btn_export_cif').removeClass('disabled');
    } else {
        $("#run").removeClass().addClass("btn btn-outline-danger");
        $('#btn_export_cif').addClass('disbled');
    }
    resize();
}

cell3d_material = new THREE.LineBasicMaterial({
    color: 0x000000
});

bond_material = new THREE.MeshLambertMaterial({
    color: 0xcccccc
});

function prepare_cylinder_mesh(r, v1, v2, rr, material) {
    var d = new THREE.Vector3()
    var g = new THREE.Vector3()
    var q = new THREE.Quaternion();
    var y = new THREE.Vector3(0, 1, 0);
    d.subVectors(v2, v1)
    g.addVectors(v1, v2).multiplyScalar(0.5)
    var geometry = new THREE.CylinderGeometry(r, r, d.length()-2*rr, 8);
    var mesh = new THREE.Mesh(geometry, material);
    q.setFromUnitVectors(y, d.normalize())
    mesh.applyQuaternion(q)
    mesh.position.set(g.x, g.y, g.z)
    return mesh;
}

function plot_structure() {
    crystal3d.vec_a1.x = xmax*2;
    crystal3d.vec_a1.y = 0.00;
    crystal3d.vec_a1.z = 0.00;
    crystal3d.vec_a2.x = 0.00;
    crystal3d.vec_a2.y = ymax*2;
    crystal3d.vec_a2.z = 0.00;
    crystal3d.vec_a3.x = 0.00;
    crystal3d.vec_a3.y = 0.00;
    crystal3d.vec_a3.z = zmax*2;
    crystal3d.origin_center = true;

    crystal3d.atom_data = []
    for (i = 0; i < natom; i++) {
        // 周期境界条件によるレプリカの配置
        x = atom_coor[i].x / (2 * xmax);
        y = atom_coor[i].y / (2 * ymax); 
        z = atom_coor[i].z / (2 * zmax); 
        iz = atom_type[i];
        crystal3d.atom_data.push({
            t1:x, t2:y, t3:z, iz:iz
        });
    }
    crystal3d.plot(true);

}


function generate_element_list() {
    var zlist = [];
    $("#element_list").empty();
    for (i = 0; i < natom; i++) {
        t = atom_type[i];
        if (zlist.indexOf(t) < 0)
            zlist.push(t);
    }
    for (i = 0; i < zlist.length; i++) {
        c = atom_color_table[zlist[i]];
        s = atom_symbol_table[zlist[i]];
        $("#element_list").append("<span class='rounded-pill' style='margin:4px; padding:16px;background-color:#" + c + ";'>" + s + "</span>");
    }

}


function notify_change() {
    if (flag_change == false) {
        // ボタンの説明を挿入
        $('#run').popover({
            //"title": "Change detected",
            "content": "Click here to update 3D model.",
            "placement": "right",
        });
        $('#run').popover("show");
        $("#run").removeClass().addClass("btn btn-primary");
        $("#download").addClass("disabled");
        flag_change = true;
    }
}

$('#run').click(function (e) {
    $('#run').popover("dispose");
    execute();
});

$('#zoom').change(function (e) {
    crystal3d.zoom = parseFloat($(this).val());
    resize();
});


$('#supecell_x,#supecell_y,#supecell_z').change(function (e) {
    crystal3d.ncell1 = parseInt($('#supecell_x').val());
    crystal3d.ncell2 = parseInt($('#supecell_y').val());
    crystal3d.ncell3 = parseInt($('#supecell_z').val());
    plot_structure();
});

$('#bond').change(function (e) {
    crystal3d.bond_length = parseFloat($(this).val());
    plot_structure();
});





function resize() {

    panelLeft.style.height = (window.innerHeight - panelLeft.offsetTop - footer.offsetHeight) + "px";
    panelRight.style.height = (window.innerHeight - panelRight.offsetTop - footer.offsetHeight) + "px";

    panelLeftCell2.style.height = ((panelLeft.offsetHeight - panelLeftCell1.offsetHeight) * 0.5) + "px";
    panelLeftCell3.style.height = ((panelLeft.offsetHeight - panelLeftCell1.offsetHeight) * 0.5) + "px";
    parameters_inp.style.height = (panelLeftCell2.offsetHeight + (panelLeftCell2.offsetTop-parameters_inp.offsetTop)) + "px";
    atom_xyz.style.height = (panelLeftCell3.offsetHeight + (panelLeftCell3.offsetTop-atom_xyz.offsetTop)) + "px";

    viewer.style.height = (panelLeft.offsetHeight - (viewer.offsetTop - panelLeft.offsetTop)) + "px";

    viewer_width = $("#viewer").innerWidth();
    viewer_height = $("#viewer").innerHeight();
    viewer_unit = Math.min(viewer_width, viewer_height);

    crystal3d.redraw();
}


function init() {



    editor_parameters_inp.setValue(template_parameters_inp);
    editor_parameters_inp.clearSelection();
    editor_atom_xyz.setValue(template_atom_xyz);
    editor_atom_xyz.clearSelection();

    execute();
    
    // $('#run').popover({
    //     "content": "Write parameters.inp and atom.xyz in editor and click 'Plot structure' button.",
    //     "placement": "bottom",
    //     '.popover-dismiss': {
    //         trigger: 'focus'
    //     },
    // });
    // $('#run').popover("show");
    // $('#run').removeClass().addClass("btn btn-primary")

}




$(function () {
    init();
});

$(window).resize(function () {
    resize();
});

$("#dir_0").click(function() {
    object.quaternion.copy(qdir_0.normalize());
    axis.quaternion.copy(object.quaternion);
    renderer.render(scene, camera);
});
$("#dir_xy").click(function() {
    object.quaternion.copy(qdir_xy.normalize());
    axis.quaternion.copy(object.quaternion);
    renderer.render(scene, camera);
});
$("#dir_yz").click(function() {
    object.quaternion.copy(qdir_yz.normalize());
    axis.quaternion.copy(object.quaternion);
    renderer.render(scene, camera);
});
$("#dir_xz").click(function() {
    object.quaternion.copy(qdir_xz.normalize());
    axis.quaternion.copy(object.quaternion);
    renderer.render(scene, camera);
});
$("#chk_axis").change(function() {
    axis.visible = $(this).prop("checked");
    cell3d.visible = $(this).prop("checked");
    renderer.render(scene, camera);
})
$('#btn_export_cif').click(function() {
    export_cif();
})
$('#btn_save_parameters_inp').click(function() {
    save_parameters_inp();
})
$('#btn_save_atom_xyz').click(function() {
    save_atom_xyz();
})

function selectAtom() {
    var i = crystal3d.selected_index;
    if (i >= 0) {
      var iz = crystal3d.atom_data[i].iz;
      var t1 = crystal3d.atom_data[i].t1;
      var t2 = crystal3d.atom_data[i].t2;
      var t3 = crystal3d.atom_data[i].t3;
      var lineNum = crystal3d.atom_data[i].lineNum;
      footer.innerHTML = (
        "<small>"+ "Atom " + (i+1) + " Z=" + iz
        + " (" + t1.toFixed(3) + ", " + t2.toFixed(3) + ", " + t3.toFixed(3) + ")"
         + "</small>"
      );
        editor_atom_xyz.gotoLine(i+1+1, 0, true);
    }
}

function getTimeStamp() {
    var now = new Date();
    var year = now.getFullYear();
    var month = ('0' + (now.getMonth() + 1)).slice(-2);
    var day = ('0' + now.getDate()).slice(-2);
    var hour = ('0' + now.getHours()).slice(-2);
    var minute = ('0' + now.getMinutes()).slice(-2);
    var second = ('0' + now.getSeconds()).slice(-2);
    return year + month + day + hour + minute + second;
}

function downloadFile(filename, content) {
    var blob = new Blob([content], {"type": "text/plain"});
    var link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function save_parameters_inp() {
    var content = editor_parameters_inp.getValue();
    content = content.replace(/\r\n/g, '\n');
    downloadFile("parameters." + getTimeStamp() + ".inp", content);
}

function save_atom_xyz() {
    var content = editor_atom_xyz.getValue();
    content = content.replace(/\r\n/g, '\n');
    downloadFile("atom." + getTimeStamp() + ".xyz", content);
}

function export_cif() {
    var content = crystal3d.to_cif();
    downloadFile("export." + getTimeStamp() + ".cif", content);
}

viewer.onclick = selectAtom;
