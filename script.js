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
var flag_init = false; // 初期化済みの場合はtrue
var flag_load = false; // 入力ファイル読み込み済みの場合はtrue
var flag_drag = false; // ドラッグによる回転中の場合
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

var group_atom; // 原子(球)
var group_bond; // 結合(円柱)
var cell3d; // 格子セル(ワイヤーフレーム)
var select3d; // セレクタ


var qdir_0 = new THREE.Quaternion(0.80, 0.27 , 0.20, -0.50);
var qdir_xy = new THREE.Quaternion(1.00, 0.00, 0.00, 0.00);
var qdir_yz = new THREE.Quaternion(0.50, 0.50, 0.50, -0.50);
var qdir_xz = new THREE.Quaternion(0.70, 0.00, 0.00, -0.70);

// オブジェクト回転用クオータニオン
var quaternion = qdir_0.normalize();

// トレース用オブジェクト
var raycaster = new THREE.Raycaster();

// エラー警告
var errmsg = [];

var nrepx = 10;
var nrepy = 10;
var nrepz = 10;

var bohr_angstrom = 0.529177210903;

var nxcell = 1;
var nycell = 1;
var nzcell = 1;

var d_bond = 4.5;


// 主要なオブジェクト
var panelLeft = document.getElementById("panelLeft");
var controlLeft = document.getElementById("controlLeft");
var panelRight = document.getElementById("panelRight");
var controlRight = document.getElementById("controlRight");
var parameters_inp = document.getElementById("parameters_inp");
var atom_xyz = document.getElementById("atom_xyz");
var parameters_inp_wrapper = document.getElementById("parameters_inp_wrapper");
var atom_xyz_wrapper = document.getElementById("atom_xyz_wrapper");
var navbar = document.getElementById("navbar");
var footer = document.getElementById("footer");
var infoRight = document.getElementById("infoRight");
var viewer = document.getElementById("viewer");
// エディタオブジェクト
var editor_parameters_inp = ace.edit("parameters_inp");
var editor_atom_xyz = ace.edit("atom_xyz");


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

    // for (var i = 0; i < errlog_nml.length; i++) {
    //     errmsg.push("<li>parameters.inp: line " + errlog_nml[i].line + ": " + errlog_nml[i].msg + "</li>");
    //     $('#parameters_inp div.label:eq(' + (errlog_nml[i].line - 1) + ")").addClass('error');
    // }
    // for (var i = 0; i < errlog_atom.length; i++) {
    //     errmsg.push("<li>atom.xyz: line " + errlog_atom[i].line + ": " + errlog_atom[i].msg + "</li>");
    //     $('#atom_xyz div.label:eq(' + (errlog_atom[i].line - 1) + ")").addClass('error');
    // }

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
    parse(editor_parameters_inp.getValue(), editor_atom_xyz.getValue());
    plot_structure();
    generate_element_list();

    if (errmsg.length == 0) {
        generate_cif();
        // ボタン表示を変更
        $("#run").removeClass().addClass("btn btn-outline-primary");
        $('#download').removeClass('disabled');
    } else {
        $("#run").removeClass().addClass("btn btn-outline-danger");
        $('#download').addClass('disbled');
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
    vxmax = xmax * nxcell;
    vymax = ymax * nycell;
    vzmax = zmax * nzcell;

    scale = Math.max(vxmax, vymax, vzmax);

    // 古いオブジェクトの消去
    while (object.children.length > 0)
        object.remove(object.children[0]);

    // 格子（直方体）の作成
    var geometry = new THREE.BoxGeometry(2 * xmax / scale, 2 * ymax / scale, 2 * zmax / scale);
    var edges = new THREE.EdgesGeometry(geometry);
    var line = new THREE.LineSegments(edges, cell3d_material);
    cell3d = line;

    // 原子（球）の作成
    group_atom = new THREE.Group();
    for (i = 0; i < natom; i++) {
        // 周期境界条件によるレプリカの配置
        for (ix = -nrepx; ix <= nrepx; ix++) {
            x = atom_coor[i].x + 2 * xmax * ix;
            if ((x < -vxmax) || (vxmax < x)) continue;

            for (iy = -nrepy; iy <= nrepy; iy++) {
                y = atom_coor[i].y + 2 * ymax * iy;
                if ((y < -vymax) || (vymax < y)) continue;

                for (iz = -nrepz; iz <= nrepz; iz++) {
                    z = atom_coor[i].z + 2 * zmax * iz;
                    if ((z < -vzmax) || (vzmax < z)) continue;

                    // 球のメッシュを作成 
                    var geometry = new THREE.SphereGeometry(1.0 / scale, 8, 8);
                    var material = new THREE.MeshLambertMaterial({
                        color: parseInt(tbl_color[atom_type[i]], 16)
                    });
                    var mesh = new THREE.Mesh(geometry, material);
                    // NOTE: exchange y and z to replace left handed system (data) to right handed system (display)!
                    mesh.position.x = x / scale;
                    mesh.position.y = y / scale;
                    mesh.position.z = -z / scale;
                    mesh.atom_index = i;
                    group_atom.add(mesh);
                }
            }
        }
    }


    group_bond = new THREE.Group();
    for (var i = 0; i < group_atom.children.length; i++) {
        ri = group_atom.children[i].position;
        for (var j = 0; j < i; j++) {
            rj = group_atom.children[j].position;
            d = ri.distanceTo(rj) * scale;
            if (d < d_bond) {
                mesh = prepare_cylinder_mesh(0.125/scale, ri, rj, 1.0/scale, bond_material);
                group_bond.add(mesh);
            }
        }
    }

    

    // 原子セレクタ（球）の追加
    var geometry = new THREE.SphereGeometry(1.00 / scale, 8, 8);
    var edges = new THREE.EdgesGeometry(geometry);
    var line = new THREE.LineSegments(edges, cell3d_material);
    select3d = line;
    select3d.visible = false;

    object.add(group_bond);
    object.add(group_atom);
    object.add(cell3d);
    object.add(select3d);

    renderer.render(scene, camera);
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
        c = tbl_color[zlist[i]];
        s = tbl_symbol[zlist[i]];
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

// 半角英数の入力を検知
$('textarea').keypress(function () {
    notify_change();
});

// deleteキーとbackspaceキーの入力を検知
$('textarea').keyup(function (e) {
    if (e.keyCode == 46 || e.keyCode == 8) {
        notify_change();
    }
});

// クリップボードからの貼り付けを検知
$('textarea').on('paste', function (e) {
    notify_change();
});







$('#viewer').click(function (e) {

    if (flag_drag) return;

    var mouse = new THREE.Vector2(
        +(e.offsetX / $(this).width()) * 2 - 1,
        -(e.offsetY / $(this).height()) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);

    var intersects = raycaster.intersectObjects(group_atom.children);

    if (intersects.length > 0) {
        // $('#atom_xyz div.selected').removeClass('selected');

        var i = intersects[0].object.atom_index;
        var p = intersects[0].object.position;

        select3d.position.copy(p);
        select3d.visible = true;

        // label = $('#atom_xyz div.label');
        // $(label[atom_line[i] - 1]).addClass('selected');
        // $('#atom_xyz textarea').scrollTop(
        //     $('#atom_xyz div.selected')[0].offsetTop - $('#atom_xyz textarea')[0].offsetTop
        // );

        // $("#atom_info").text(
        //     "Element:" + atom_type[i] + ', Line:' + (atom_line[i])
        // );


    }

    renderer.render(scene, camera);
});

$('#run').click(function (e) {
    $('#run').popover("dispose");
    execute();
});

$('#viewer').mousemove(function (e) {
    if (e.buttons == 1 && flag_drag) {
        x1 = e.clientX;
        y1 = e.clientY;

        q = new THREE.Quaternion();
        v1 = new THREE.Vector3(0, 0, 1);
        v2 = new THREE.Vector3((x1 - x0) / viewer_unit, (y1 - y0) / viewer_unit, 0.25);

        q.setFromUnitVectors(v1, v2.normalize());
        object.quaternion.copy(q.multiply(quaternion));
        axis.quaternion.copy(object.quaternion);
        renderer.render(scene, camera);
    }
});

$('#viewer').mousedown(function (e) {
    if (e.buttons == 1) {
        x0 = e.clientX;
        y0 = e.clientY;
        quaternion = new THREE.Quaternion();
        quaternion.copy(object.quaternion);
        flag_drag = true;
    }
});

$('#viewer').mouseup(function (e) {
    flag_drag = false;
});

$('#zoom').change(function (e) {
    viewer_zoom = parseFloat($(this).val());
    resize();
});

$('#zoom_in').click(function (e) {
    if (viewer_zoom < 2.5) {
        viewer_zoom += 0.1;
        $('#zoom').val(viewer_zoom);
        resize();
    }
});

$('#zoom_out').click(function (e) {
    if (viewer_zoom > 0.2) {
        viewer_zoom -= 0.1;
        $('#zoom').val(viewer_zoom);
        resize();
    }
});

$('#zoom_reset').click(function (e) {
    viewer_zoom = 1.0;
    $('#zoom').val(viewer_zoom);
    resize();
});

$('#supecell_x,#supecell_y,#supecell_z').change(function (e) {
    nxcell = parseInt($('#supecell_x').val());
    nycell = parseInt($('#supecell_y').val());
    nzcell = parseInt($('#supecell_z').val());
    plot_structure();
});

$('#bond').change(function (e) {
    d_bond = parseFloat($(this).val());
    plot_structure();
});





function resize() {



    panelLeft.style.height = (window.innerHeight - navbar.offsetHeight - footer.offsetHeight) + "px";
    panelRight.style.height = (window.innerHeight - navbar.offsetHeight - footer.offsetHeight) + "px";

    parameters_inp_wrapper.style.height = ((panelLeft.clientHeight - controlLeft.offsetHeight) * 0.5) + "px";
    atom_xyz_wrapper.style.height = ((panelLeft.clientHeight - controlLeft.offsetHeight) * 0.5) + "px";



    
    
    editor_atom_xyz.resize();
    editor_parameters_inp.resize();

    viewer.style.height = (panelRight.clientHeight - controlRight.offsetHeight - infoRight.offsetHeight) + "px";
    viewer.style.width = panelRight.clientWidth + "px";

    viewer_width = $("#viewer").innerWidth();
    viewer_height = $("#viewer").innerHeight();
    viewer_unit = Math.min(viewer_width, viewer_height);

    camera.top = -2 * viewer_height / (viewer_unit * viewer_zoom);
    camera.left = -2 * viewer_width / (viewer_unit * viewer_zoom);
    camera.right = +2 * viewer_width / (viewer_unit * viewer_zoom);
    camera.bottom = +2 * viewer_height / (viewer_unit * viewer_zoom);
    camera.updateProjectionMatrix();

    renderer.setSize(viewer_width, viewer_height);
    renderer.render(scene, camera);
}


function init() {
    // ３次元表示画面の初期化
    renderer = new THREE.WebGLRenderer({
        canvas: $('#viewer')[0]
    });
    renderer.setClearColor(0xffffff, 1.0);
    // カメラ作成
    camera = new THREE.OrthographicCamera(-2.0, +2.0, -2.0, +2.0);
    camera.position.set(0, 0, 2);
    camera.lookAt(0, 0, 0);
    // シーン作成
    scene = new THREE.Scene();
    scene.add(camera);
    // オブジェクト作成
    object = new THREE.Group();
    object.quaternion.copy(quaternion);
    scene.add(object);
    // 座標軸ヘルパー作成
    // axis = new THREE.AxisHelper(0.50);
    axis = new THREE.Group();
    var ah = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0,0,0 ), 0.5, 0xff0000, 0.2, 0.2 );
    axis.add(ah);
    var ah = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0,0,0 ), 0.5, 0xff00, 0.2, 0.2  );
    axis.add(ah);
    var ah = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0,0,0 ), 0.5, 0xff, 0.2, 0.2  );
    axis.add(ah);
    axis.position.set(-1.25, -1.25, 1.25);
    axis.quaternion.copy(quaternion);
    scene.add(axis);
    // ライト作成
    light1 = new THREE.DirectionalLight(0xFFFFFF, 0.40);
    light1.position.set(-2, -2, -2).normalize();
    light2 = new THREE.AmbientLight(0xFFFFFF, 0.60);
    scene.add(light1);
    scene.add(light2);
    // フォッグを有効化
    scene.fog = new THREE.Fog(0xFFFFFF, 0, 7);
    // エディタ画面作成
    // $('div.editor').each(function (i, item) {
    //     div = $(item).children('div');
    //     textarea = $(item).children('textarea');
    //     for (var j = 1; j <= 1000; j++) {
    //         div.append("<div class='label'>" + j + "</div>");
    //     }
    //     textarea.scroll(function () {
    //         $(this).prev('div').scrollTop($(this).scrollTop());
    //     })
    // });
    // テンプレート挿入
    // $("#parameters_inp textarea").text(template_parameters_inp);
    // $("#atom_xyz textarea").text(template_atom_xyz);
    ace.config.setModuleUrl("ace/mode/rspace", "mode-rspace.js")
    //ace.config.setModuleUrl("ace/mode/salmon", "mode-salmon.js")
    editor_parameters_inp.setValue(template_parameters_inp);
    editor_parameters_inp.clearSelection();
    editor_parameters_inp.session.setMode("ace/mode/rspace");
    editor_atom_xyz.setValue(template_atom_xyz);
    editor_atom_xyz.clearSelection();

    // 計算結果を表示
    execute();
    // ボタンの説明を挿入
    /*
    $('#run').popover({
        "title": "Welcome to Web RSPACE view!",
        "content": "Write parameters.inp and atom.xyz in editor and click 'Plot structure' button.",
        "placement": "bottom",
    });
    $('#run').popover("show");
    $('#run').removeClass().addClass("btn btn-primary")
    */
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

function generate_cif() {
    tmp = []
    tmp.push("# generated using wsviewer");
    tmp.push("# data_");
    tmp.push("_symmetry_space_group_name_H-M   'P 1'");
    tmp.push("_cell_length_a " + String(xmax * 2 * bohr_angstrom));
    tmp.push("_cell_length_b " + String(ymax * 2 * bohr_angstrom));
    tmp.push("_cell_length_c " + String(zmax * 2 * bohr_angstrom));
    tmp.push("_cell_angle_alpha 90.0");
    tmp.push("_cell_angle_beta  90.0");
    tmp.push("_cell_angle_gamma 90.0");
    tmp.push("loop_");
    tmp.push("_atom_site_type_symbol");
    tmp.push("_atom_site_fract_x");
    tmp.push("_atom_site_fract_y");
    tmp.push("_atom_site_fract_z");
    for (i = 0; i < natom; i++) {
        r = atom_coor[i];
        x = String(r.x / xmax * 0.5 + 0.5);
        y = String(r.y / ymax * 0.5 + 0.5);
        z = String(r.z / zmax * 0.5 + 0.5);
        t = tbl_symbol[atom_type[i]];
        tmp.push([t, x, y, z].join(" "));
    }

    var content = tmp.join("\n");
    var blob = new Blob([content], {
        "type": "text/plain"
    });
    if (window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, "test.cif");
        window.navigator.msSaveOrOpenBlob(blob, "test.cif");
    } else {
        document.getElementById("download").href = window.URL.createObjectURL(blob);
    }
}

