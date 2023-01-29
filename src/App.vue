<template>
    <div id="root">
        <div class="ui-wrapper">
            <div @click="baseMap">
                <img
                    class="base"
                    src="../public/assets/images/globe.png"
                    width="21px"
                    height="21px"
                />
                底图
            </div>
            <div @click="dataLayer">
                <img
                    class="data"
                    src="../public/assets/images/dataLayer.png"
                    width="24px"
                    height="24px"
                />
                数据图层
            </div>
            <div class="tool">
                <img
                    src="../public/assets/images/tool.png"
                    width="24px"
                    height="24px"
                />
                工具
                <img
                    v-if="showArrow"
                    src="../public/assets/images/upArrow.png"
                    width="24px"
                    height="24px"
                />
                <img
                    v-else
                    src="../public/assets/images/downArrow.png"
                    width="24px"
                    height="24px"
                />
                <!-- 工具选项 -->
                <div class="toolItem">
                    <div @click="openMeasure">
                        <img
                            src="../public/assets/images/尺子.png"
                            width="24px"
                            height="24px"
                        />
                        图上量算
                    </div>
                    <div>
                        <img
                            src="../public/assets/images/空间.png"
                            width="24px"
                            height="24px"
                        />
                        空间分析
                    </div>
                    <div @click="openPositionSetting">
                        <img
                            src="../public/assets/images/定位.png"
                            width="24px"
                            height="24px"
                        />
                        坐标定位
                    </div>
                    <div>
                        <img
                            src="../public/assets/images/飞行.png"
                            width="24px"
                            height="24px"
                        />
                        飞行漫游
                    </div>
                </div>
            </div>
        </div>
        <baseMap :showBaseMap.sync="showBaseMap" />
        <dataLayer :showDataLayer.sync="showDataLayer" />
        <measure :showMeasure.sync="showMeasure" />
        <position :showPosition.sync="showPosition" />
        <div id="container"></div>
    </div>
</template>

<script>
import baseMap from "../public/components/baseMap.vue";
import dataLayer from "../public/components/dataLayer.vue";
import measure from "../public/components/tool/measure.vue";
import position from "../public/components/tool/position.vue";
export default {
    name: "App",
    mounted() {
        this.initMap();
        // 初始化样式
        this.styleInit();
    },
    components: {
        baseMap,
        dataLayer,
        measure,
        position,
    },
    data() {
        return {
            showBaseMap: false,
            showDataLayer: false,
            showArrow: false,
            showMeasure: false,
            showPosition: false,
        };
    },
    methods: {
        initMap() {
            let container = document.getElementById("container");
            window.SSmap.init({
                el: container,
                //path: "../assets",
            }).then(([Li, GlobalViewer]) => {
                let viewer = GlobalViewer;
                window.viewer = viewer;
                var scene = viewer.scene;
                var camera = scene.mainCamera;
                camera.flyTo(
                    window.SSmap.Cartographic.fromDegrees(
                        114.054494,
                        22.540745,
                        1000
                    )
                );
                //通过类型加载影像  天地图
                window.nowimagerlayer = new window.SSmap.ImageryLayer({
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
                //通过类型加载影像  xyz 金字塔
                // window.nowimagerlayer = new SSmap.ImageryLayer({
                //   type: "xyz",
                //   url: "http://localhost:8090/examples/data/ft/{z}/{x}/{y}.png",
                //   rectangle: [-180, -90, 180, 90],
                //   useWebMercator: true,
                //   maximumLevel: 15,
                //   minimumLevel: 0,
                //   tileWidth: 256,
                //   tileHeight: 256,
                //   hasAlphaChannel: false,
                // });
            });
        },
        // 展示底图,关闭其他
        baseMap() {
            this.showBaseMap = true;
            this.showDataLayer = false;
            this.showMeasure = false;
            this.showPosition = false;
        },
        // 数据图层,关闭其他
        dataLayer() {
            this.showBaseMap = false;
            this.showDataLayer = true;
            this.showMeasure = false;
            this.showPosition = false;
        },
        // 打开测量
        openMeasure() {
            this.showMeasure = true;
        },
        // 打开位置设置
        openPositionSetting() {
            this.showPosition = true;
        },
        // 初始化样式
        styleInit() {
            var oTool = document.getElementsByClassName("tool")[0];
            var oToolItem = document.getElementsByClassName("toolItem")[0];
            oTool.addEventListener("mouseenter", () => {
                this.showArrow = true;
                this.showMeasure = false;
                this.showBaseMap = false;
                this.showDataLayer = false;
                this.showPosition = false;
                // this.showSpace = false;

                oToolItem.style.display = "block";
                oToolItem.style.height = "0px";

                setTimeout(() => {
                    oToolItem.style.height = "200px";
                    oToolItem.style.transition = "all 1s";
                }, 100);
            });
            oTool.addEventListener("mouseleave", () => {
                this.showArrow = false;
                oToolItem.style.display = "none";
            });
            // 点击对应的工具选项显示对应的选项卡,隐藏工具栏
            oToolItem.addEventListener("click", (e) => {
                oToolItem.style.display = "none";
            });
        },
    },
};
</script>

<style>
html,
body,
#root,
#container {
    height: 100%;
    margin: 0;
}
.ui-wrapper {
    position: absolute;
    right: 16px;
    top: 16px;
    width: 336px;
    height: 50px;
    z-index: 20;
    background-color: rgba(36, 56, 72, 0.9);
    color: #fff;
    display: flex;
    justify-content: space-around;
}
.ui-wrapper > div {
    width: 112px;
    height: 50px;
    text-align: center;
    line-height: 50px;
    cursor: pointer;
}
.ui-wrapper img {
    vertical-align: middle;
}
.ui-wrapper > div:hover {
    color: rgba(45, 133, 240, 0.8);
}
/* 下面是工具模块的样式 */
.ui-wrapper > div:hover div {
    color: #fff;
}
.toolItem {
    background-color: rgba(36, 56, 72, 0.9);
    height: 0;
    overflow: hidden;
}
.ui-wrapper .toolItem div:hover {
    color: rgba(45, 133, 240, 0.8);
}
</style>
