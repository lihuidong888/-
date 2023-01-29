<template>
    <div>
        <div class="baseMap" v-if="showBaseMap">
            <div class="title">
                <div class="left">底图</div>
                <div class="right" @click="closeBase">X</div>
            </div>
            <div class="shadow">
                <div @click="addxyzimageryLayer('xyz')">
                    <img src="../assets/images/remoteSensing.png" /><br />
                    遥感影像
                </div>
                <div @click="addwmtsimageryLayer('wmts')">
                    <img src="../assets/images/wms.png" /><br />
                    wmts影像
                </div>
                <div @click="addarcgisimageryLayer('arcgis')">
                    <img src="../assets/images/arcGis.png" /><br />
                    ArcGIS影像
                </div>
                <div @click="addTdtimageryLayer('Tdt')">
                    <img src="../assets/images/tianditu.png" /><br />
                    天地图影像
                </div>
            </div>
            <div class="slide">
                <el-switch
                    v-model="value"
                    active-color="#2D85F0"
                    inactive-color="#797778"
                    active-value="100"
                    inactive-value="0"
                >
                </el-switch>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: "baseMap",
    data() {
        return {
            showArrow: false,
            value: "0",
        };
    },
    mounted() {
        // setTimeout(() => {
        //   this.addTerrainProvider();
        // }, 2000);
    },
    methods: {
        // 关闭底图
        closeBase() {
            this.$emit("update:showBaseMap", false);
        },
        // 加载遥感影像
        addxyzimageryLayer(type) {
            this.addimageryLayer(type, {
                type: "xyz",
                // url: "https://ss-sdk.oss-cn-shenzhen.aliyuncs.com/data/dom/ft/{z}/{x}/{y}.png",
                url: "./dom/ft/{z}/{x}/{y}.png",
                rectangle: [-180, -90, 180, 90],
                useWebMercator: true,
                maximumLevel: 15,
                minimumLevel: 0,
                tileWidth: 256,
                tileHeight: 256,
                hasAlphaChannel: true,
            });
        },
        // 加载wmts影像
        addwmtsimageryLayer(type) {
            this.addimageryLayer(type, {
                type: "wmts",
                url: "crs=EPSG:3857&format=image/jpeg&layers=World_Imagery&styles=default&tileMatrixSet=default028mm&url=https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/WMTS",
            });
        },
        // 加载ArcGIS影像
        addarcgisimageryLayer(type) {
            this.addimageryLayer(type, {
                type: "arcgis",
                // url: "crs='EPSG:4547' format='PNG32' layer='0' url='https://pnr.sz.gov.cn/d-suplicmap/dynamap_1/rest/services/NET_XGYZT/MapServer'",
                // url: "http://map.geoq.cn/arcgis/rest/services/ChinaOnlineStreetPurplishBlue/MapServer",
                url: "http://map.geoq.cn/arcgis/rest/services/ChinaOnlineCommunity_Mobile/MapServer",
            });
        },
        // 加载天地图影像
        addTdtimageryLayer(type) {
            this.addimageryLayer(type, {
                type: "Tdt",
                url: "https://t2.tianditu.gov.cn/DataServer?T=img_c&x={x}&y={y}&l={z}&tk=56b81006f361f6406d0e940d2f89a39c",
                useWebMercator: false,
                maximumLevel: 17,
                minimumLevel: 0,
                tileWidth: 256,
                tileHeight: 256,
                hasAlphaChannel: true,
                isLabel: false,
            });
        },
        // 添加影像
        addimageryLayer(type, layerObj) {
            let ImageryLayerType = [];
            window.nowimagerlayer.ImageryLayerCollection.forEach(
                (ImageryLayer) => {
                    ImageryLayerType.push(ImageryLayer.attropt.type);
                }
            );
            if (ImageryLayerType.includes(type)) {
                window.nowimagerlayer.showByType(type, true);
                // 其他隐藏
                let typeIndex = ImageryLayerType.indexOf(type);
                ImageryLayerType.forEach((layerType, index) => {
                    if (typeIndex != index) {
                        window.nowimagerlayer.showByType(layerType, false);
                    }
                });
            } else {
                if (layerObj.type === "xyz") {
                    window.nowimagerlayer.xyzLayer(layerObj);
                } else if (layerObj.type === "wmts") {
                    window.nowimagerlayer.wmtsLayer(layerObj);
                } else if (layerObj.type === "arcgis") {
                    window.nowimagerlayer.ArcgisLayer(layerObj);
                }
            }
        },
        // 加载地形
        addTerrainProvider() {
            let scene = GlobalViewer.scene;
            let globe = scene.globe;
            globe.setTerrainProviderUrl(
                window.document.location.origin + "/" + "data/sz/"
            );
        },
        // 移除地形
        addDefaultTerrain() {
            let scene = GlobalViewer.scene;
            let globe = scene.globe;
            globe.setDefaultTerrain();
        },
    },
    props: ["showBaseMap"],
    watch: {
        value(val) {
            if (val === "100") {
                this.addTerrainProvider();
            } else if (val === "0") {
                this.addDefaultTerrain();
            }
        },
    },
};
</script>

<style scoped>
.baseMap {
    position: absolute;
    top: 80px;
    right: 16px;
    z-index: 20;
    background-color: rgba(36, 56, 72, 0.9);
    color: #fff;
    width: 430px;
    text-align: center;
}
.baseMap .title {
    height: 36px;
    background-image: url("../assets/images/baseMaginTitle.png");
}
.baseMap .title .left {
    float: left;
    height: 36px;
    line-height: 36px;
    margin-left: 6px;
}
.baseMap .title .right {
    float: right;
    width: 16px;
    height: 36px;
    line-height: 36px;
    margin-right: 6px;
    cursor: pointer;
}
.baseMap .title .right:hover {
    color: rgba(45, 133, 240, 0.8);
}
.baseMap .shadow {
    margin: 16px 0;
}
.baseMap .shadow > div {
    display: inline-block;
    margin: 0 6px;
    font-size: 15px;
    cursor: pointer;
}
.baseMap .shadow > div:hover {
    color: rgba(45, 133, 240, 0.8);
}
.baseMap .shadow img {
    width: 80px;
    height: 80px;
}
.baseMap .slide {
    margin-bottom: 16px;
    text-align: left;
}
.baseMap .slide .el-switch {
    display: inline-block;
    margin-left: 6px;
}
</style>
