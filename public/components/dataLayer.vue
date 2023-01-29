<template>
    <div class="dataLayer" v-if="showDataLayer">
        <div class="title">
            <div class="left">图层</div>
            <div class="right" @click="closeLayer">X</div>
        </div>
        <el-tree
            :data="dataTree"
            show-checkbox
            node-key="id"
            :props="defaultProps"
            @check="handleClick"
            :check-on-click-node="true"
        >
        </el-tree>
    </div>
</template>

<script>
// 跳转的位置点
window.point = [
    { lon: 114.03585691, lat: 22.54412276, height: 20, id: 0 },
    { lon: 114.11640021, lat: 22.55061716, height: 20, id: 1 },
    { lon: 114.05505, lat: 22.511489, height: 20, id: 2 },
    { lon: 114.1590136, lat: 22.51254139, height: 20, id: 3 },
    { lon: 114.045519, lat: 22.536469, height: 20, id: 4 },
    { lon: 114.05300844, lat: 22.530465169, height: 20, id: 5 },
];
window.FieldList = []; //撒点属性
window.checkObj = []; //选中的节点
window.entityLine = []; //线实体
window.entityFace = []; //面实体
import data from "../data/modelFile/writeFile";

export default {
    data() {
        return {
            nowscale: 1, // 缩放比例
            dataTree: [],
            defaultProps: {
                children: "children",
                label: "label",
            },
            GeoJsonModel: null,
            Label: null,
            modelopt: {
                show: true,
                url: "",
                position: {
                    longitude: 114.05216365713427,
                    latitude: 22.543903468272738,
                    height: 10.113542282832745,
                },
                offset: {
                    x: 0,
                    y: 0,
                    z: 0,
                },
                rotation: {
                    x: 0,
                    y: 0,
                    z: 0,
                },
                scale: 1,
            },
            Tiles3dmodelopt: {
                url: "",
                show: true,
            },
        };
    },
    props: ["showDataLayer"],
    methods: {
        closeLayer() {
            this.$emit("update:showDataLayer", false);
        },
        // 选中加载数据
        handleClick(node, checkObj) {
            // 生成不同随机数,飞不同点
            var preNum = 0;
            var num = Math.floor(Math.random() * 6);
            while (num === preNum) {
                num = Math.floor(Math.random() * 6);
            }
            preNum = num;
            // 目标多选框被去掉时候,删除模型不跳转
            // console.log("1111", node, checkObj);
            window.checkObj.push(checkObj);
            let length = window.checkObj.length;
            if (window.checkObj.length >= 2) {
                if (
                    window.checkObj[length - 1].checkedKeys.length <
                    window.checkObj[length - 2].checkedKeys.length
                ) {
                    if (
                        window.modelLayer &&
                        node.label === window.modelLayer.name
                    ) {
                        this.removemodel();
                    }
                    if (
                        window.Tiles3dLayer &&
                        node.label === window.Tiles3dLayer.name
                    ) {
                        this.removeTiles();
                    }
                    if (
                        this.GeoJsonModel &&
                        node.label === this.GeoJsonModel.name //node.label=dzsb-point,
                    ) {
                        this.clear();
                    }
                    return;
                }
            }
            // 全选一级或者二级标题加载对应三级标题的模型或矢量数据的第一个
            if (node.label == "三维模型" || node.label == "DAE") {
                // console.log(node);
                let cctvUrl = "./data/testdata/models/dae/cars/dabache.DAE";
                this.model(cctvUrl, window.point[preNum]);
            }
            if (node.label == "fbx") {
                let cctvUrl = "./data/testdata/models/fbx/Girl.fbx";
                this.model(cctvUrl, window.point[preNum]);
            }
            if (node.label == "glb") {
                let cctvUrl = "./data/testdata/models/gltf_glb/box.glb";
                this.model(cctvUrl, window.point[preNum]);
            }
            if (node.label == "3dtile") {
                this.addTilese("./data/testdata/3dtiles/ft");
            }
            if (node.label == "矢量数据" || node.label == "GeoJSON点") {
                let geojsonurl = "./data/testdata/geojson/dzsb-point.geojson";
                let geojsondataPath =
                    "./data/testdata/geojson/pointOrPolyline/dzsb-point.geojson";
                let name = "dzsb-point";
                this.spreadPoint(geojsonurl, geojsondataPath, name);
            }
            if (node.label == "GeoJSON线") {
                let geojsonurl =
                    "./data/testdata/geojson/ft-polyline-1370.geojson";
                let geojsondataPath =
                    "./data/testdata/geojson/pointOrPolyline/ft-polyline-1370.geojson";
                let name = "ft-polyline-1370";
                this.spreadPolyline(geojsonurl, geojsondataPath, name);
            }
            if (node.label == "GeoJSON面") {
                let geojsonurl = "./data/testdata/geojson/area-polygon.geojson";
                let geojsondataPath =
                    "./data/testdata/geojson/pointOrPolyline/area-polygon.geojson";
                let name = "area-polygon";
                this.spreadFace(geojsonurl, geojsondataPath, name);
            }
            // 加载glb模型
            if (
                Number(node.id) >= 312 &&
                Number(node.id) <= 340 &&
                !node.children
            ) {
                let glbPath = this.dataTree[0].children[2].path;
                let cctvUrl = glbPath + "/" + node.label + ".glb";
                this.model(cctvUrl, window.point[preNum]);
            }
            // 加载FBX模型
            if (
                Number(node.id) >= 39 &&
                Number(node.id) <= 310 &&
                !node.children
            ) {
                let FBXPath = this.dataTree[0].children[1].path;
                let cctvUrl = FBXPath + "/" + node.label + ".fbx";
                this.model(cctvUrl, window.point[preNum]);
            }
            // 加载3dtile模型
            if (
                Number(node.id) >= 342 &&
                Number(node.id) <= 346 &&
                !node.children
            ) {
                let tilesetPath = "";
                this.dataTree[0].children[3].children.forEach((tilesetItem) => {
                    if (tilesetItem.id == node.id) {
                        tilesetPath = tilesetItem.path;
                    }
                });
                this.addTilese(tilesetPath);
            }
            // 加载DAE模型
            if (
                Number(node.id) >= 34 &&
                Number(node.id) <= 37 &&
                !node.children
            ) {
                let daePath = this.dataTree[0].children[0].path;
                let cctvUrl = daePath + "/" + node.label + ".DAE";
                this.model(cctvUrl, window.point[preNum]);
            }
            // 加载Geojson点
            if (node.label.indexOf("point") > -1 && !node.children) {
                let geojsonurl =
                    "./data/testdata/geojson/" + node.label + ".geojson";
                let geojsondataPath =
                    "./data/testdata/geojson/pointOrPolyline/" +
                    node.label +
                    ".geojson";
                this.spreadPoint(geojsonurl, geojsondataPath, node.label);
            }
            // 加载Geojson线
            if (node.label.indexOf("polyline") > -1 && !node.children) {
                let geojsonurl =
                    "./data/testdata/geojson/" + node.label + ".geojson";
                let geojsondataPath =
                    "./data/testdata/geojson/pointOrPolyline/" +
                    node.label +
                    ".geojson";
                this.spreadPolyline(geojsonurl, geojsondataPath, node.label);
            }
            // 加载Geojson面
            if (node.label.indexOf("polygon") > -1 && !node.children) {
                let geojsonurl =
                    "./data/testdata/geojson/" + node.label + ".geojson";
                let geojsondataPath =
                    "./data/testdata/geojson/pointOrPolyline/" +
                    node.label +
                    ".geojson";
                this.spreadFace(geojsonurl, geojsondataPath, node.label);
            }
        },
        //添加模型
        model(path, point) {
            this.removemodel();
            if (!window.modelLayer) {
                window.modelLayer = new window.SSmap.ModelEntity();
                this.modelopt.url = path;
                this.modelopt.position.longitude = point.lon;
                this.modelopt.position.latitude = point.lat;
                this.modelopt.position.height = point.height;
                path.indexOf("DAE") > -1
                    ? (this.modelopt.rotation.x = -90)
                    : (this.modelopt.rotation.x = 0);
                window.modelLayer.add(this.modelopt);
                //模型飞行定位
                window.modelLayer.onloaded = function () {
                    window.SSmap.flyTo(window.modelLayer);
                };
                // 加名字标记删除
                let name = path.slice(
                    path.lastIndexOf("/") + 1,
                    path.lastIndexOf(".")
                );
                window.modelLayer.name = name;
                return window.modelLayer;
            }
        },
        //删除模型
        removemodel() {
            if (window.modelLayer) {
                window.modelLayer.remove();
                window.modelLayer = null;
            }
        },
        //删除3dtile
        removeTiles() {
            if (window.Tiles3dLayer) {
                window.Tiles3dLayer.remove();
                window.Tiles3dLayer = null;
            }
        },
        //3Dtiles 添加
        addTilese(tilesetPath) {
            this.removeTiles();
            window.Tiles3dLayer = new window.SSmap.Tiles3dLayer();
            this.Tiles3dmodelopt.url =
                window.document.location.origin +
                tilesetPath.slice(1) +
                "/" +
                "tileset.json";
            window.Tiles3dLayer.add(this.Tiles3dmodelopt);
            window.Tiles3dLayer.onloaded = function () {
                SSmap.flyTo(window.Tiles3dLayer); //模型定位
            };
            // 加名字标记删除
            let name = tilesetPath.slice(tilesetPath.lastIndexOf("/") + 1);
            window.Tiles3dLayer.name = name;
        },
        //点
        spreadPoint(geojsonurl, geojsondataPath, name) {
            this.clear();
            var script = document.createElement("script");
            script.src = geojsondataPath;
            document.body.appendChild(script);
            let iconUrl =
                window.document.location.origin + "/assets/images/blueicon.png";
            let selectedIconUrl =
                window.document.location.origin + "/assets/images/redicon.png";
            setTimeout(() => {
                // flyToHome
                let scene = viewer.scene;
                let camera = scene.mainCamera;
                let point = a.features[0].geometry.coordinates;
                camera.flyTo(
                    SSmap.Cartographic.fromDegrees(point[0], point[1], 1000)
                );
                let feature = Object.keys(a.features[0].properties);
                // 点
                this.GeoJsonModel = new window.SSmap.graphic.GeoJsonModel({
                    iconUrl,
                    selectedIconUrl,
                    style: {
                        width: 30,
                        height: 40,
                    },
                    data: {
                        url: geojsonurl,
                        keys: feature,
                    },
                });
                // 标签
                a.features.forEach((item) => {
                    let position = item.geometry.coordinates;
                    position.push(0);
                    this.Label = new SSmap.graphic.Label({
                        position,
                        style: {
                            text: item.properties[feature[0]],
                            width: 30,
                            height: 40,
                            fontSize: 8,
                            offset: [0, -24],
                            color: "#FFF",
                        },
                    });
                });
                // 标记
                this.GeoJsonModel.name = name;
                window.SSmap.graphic.GeoJsonModel.pick(function (data) {
                    console.log(data);
                });
            }, 500);
        },
        //线
        spreadPolyline(geojsonurl, geojsondataPath, name) {
            this.clear();
            var script = document.createElement("script");
            script.src = geojsondataPath;
            document.body.appendChild(script);
            setTimeout(() => {
                // flyToHome
                let scene = viewer.scene;
                let camera = scene.mainCamera;
                let point = a.features[0].geometry.coordinates[0][0];
                camera.flyTo(
                    SSmap.Cartographic.fromDegrees(point[0], point[1], 1000)
                );
                // 线
                a.features.forEach((item) => {
                    let pointList = item.geometry.coordinates[0];
                    pointList.forEach((position) => {
                        position.push(0);
                    });
                    let polyline = new window.SSmap.graphic.Polyline({
                        positions: pointList,
                        style: {
                            color: "#00ffff",
                        },
                    });
                    window.entityFace.push(polyline);
                });
                // 标记用于删除
                this.GeoJsonModel = { name };
            }, 500);
        },
        //面
        spreadFace(geojsonurl, geojsondataPath, name) {
            this.clear();
            var script = document.createElement("script");
            script.src = geojsondataPath;
            document.body.appendChild(script);
            setTimeout(() => {
                // flyToHome
                let coordinates = a.features[0].geometry.coordinates;
                let point = coordinates[0][0][0];
                let scene = viewer.scene;
                let camera = scene.mainCamera;
                camera.flyTo(
                    SSmap.Cartographic.fromDegrees(point[0], point[1], 1000)
                );
                // 面
                a.features.forEach((item) => {
                    let pointList = item.geometry.coordinates[0][0];
                    pointList.forEach((position) => {
                        position.push(0);
                    });
                    let polygon = new window.SSmap.graphic.Polygon({
                        positions: pointList,
                        style: {
                            width: 5, //线宽
                            color: "#00ffff",
                            glow: true,
                        },
                    });
                    window.entityFace.push(polygon);
                });
                // 标记用于删除
                this.GeoJsonModel = { name };
            }, 500);
        },
        // 删除数据矢量
        clear() {
            // 删除点
            if (
                this.GeoJsonModel &&
                this.GeoJsonModel.name.indexOf("polyline") === -1 &&
                this.GeoJsonModel.name.indexOf("polygon") === -1
            ) {
                this.GeoJsonModel.remove();
                this.GeoJsonModel = null;
            }
            // 删除标签
            if (this.Label) {
                SSmap.graphic.Label.removeAll();
                this.Label = null;
            }
            // 删除创建的线
            if (window.entityLine.length != 0) {
                for (let i = 0; i < window.entityLine.length; i++) {
                    var entitys = window.entityLine[i];
                    entitys.remove();
                }
                window.entityLine = [];
            }
            // 删除创建的面
            if (window.entityFace.length != 0) {
                for (let i = 0; i < window.entityFace.length; i++) {
                    var entitys = window.entityFace[i];
                    entitys.remove();
                }
                window.entityFace = [];
            }
        },
    },
    mounted() {
        document.body.style.overflow = "hidden";
        let dataFrame = [
            {
                id: 0,
                label: "三维模型",
                children: [],
            },
            {
                id: -1,
                label: "矢量数据",
                children: [
                    {
                        id: 1,
                        label: "GeoJSON点",
                        children: [],
                    },
                    {
                        id: 0,
                        label: "GeoJSON线",
                        children: [],
                    },
                    {
                        id: -1,
                        label: "GeoJSON面",
                        children: [],
                    },
                ],
            },
        ];
        let GeoJSONPoint = dataFrame[1].children[0].children;
        let GeoJSONPolily = dataFrame[1].children[1].children;
        let GeoJSONPoligon = dataFrame[1].children[2].children;
        let model = dataFrame[0].children;
        // 数据分类---
        data.forEach((item) => {
            if (
                item.label === "DAE" ||
                item.label === "fbx" ||
                item.label === "glb" ||
                item.label === "3dtile"
            ) {
                model.push(item);
            } else {
                item.children.forEach((geojsonItem) => {
                    if (geojsonItem.label.indexOf("point") > -1) {
                        GeoJSONPoint.push(geojsonItem);
                    } else if (geojsonItem.label.indexOf("polyline") > -1) {
                        GeoJSONPolily.push(geojsonItem);
                    } else if (geojsonItem.label.indexOf("polygon") > -1) {
                        GeoJSONPoligon.push(geojsonItem);
                    }
                });
            }
        });
        this.dataTree = dataFrame;
        // console.log(JSON.stringify(this.dataTree));
    },
};
</script>
<style scoped>
.dataLayer {
    position: absolute;
    z-index: 20;
    width: 340px;
    right: 16px;
    top: 80px;
    color: #fff;
    background-color: rgba(36, 56, 72, 0.9);
}
.dataLayer .title {
    height: 36px;
    background-image: url("../assets/images/baseMaginTitle.png");
}
.dataLayer .title .left {
    float: left;
    height: 36px;
    line-height: 36px;
    margin-left: 6px;
}
.dataLayer .title .right {
    float: right;
    width: 16px;
    height: 36px;
    line-height: 36px;
    margin-right: 6px;
    cursor: pointer;
}
.dataLayer .title .right:hover {
    color: rgba(45, 133, 240, 0.8);
}
.el-tree {
    padding-left: 20px;
    height: 400px;
    /* padding-left: 20px; */
    overflow-y: scroll;
    background-color: rgba(36, 56, 72, 0.9);
    color: #fff;
}
.el-tree::-webkit-scrollbar {
    display: none;
}
</style>
