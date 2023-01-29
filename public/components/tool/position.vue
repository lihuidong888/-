<template>
    <div class="position" v-if="showPosition">
        <div class="title">
            <div class="left">坐标拾取</div>
            <div class="right" @click="closePosition">X</div>
        </div>
        <div class="content">
            <div class="coordinate">
                <span>经度：</span><input type="text" v-model="lon" />
            </div>
            <div class="coordinate">
                <span>纬度：</span><input type="text" v-model="lat" />
            </div>
            <div class="coordinate">
                <span>高度：</span><input type="text" v-model="height" />
            </div>
            <div class="fly">
                <button type="button" @click="startPickUp">图上拾取</button>
                <button type="button" @click="flyToEntity">坐标定位</button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: "Position",
    props: ["showPosition"],
    methods: {
        // 关闭坐标定位模块
        closePosition() {
            this.$emit("update:showPosition", false);
        },
        //点击在底图上添加点坐标
        addPoint() {
            if (this.instance != null) {
                this.instance.remove();
                this.instance = null;
            }
            let position = SSmap.Cartographic.fromDegrees(
                Number(this.lon),
                Number(this.lat),
                Number(this.height)
            ).toVector3();
            this.instance = new SSmap.graphic.Billboard({
                url: SSmap.$baseUrl + "/assets/images/blueicon.png",
                position: {
                    x: position.x,
                    y: position.y,
                    z: position.z,
                },
                style: {
                    width: 20,
                    height: 32,
                },
            });
        },
        // 开始在图上拾取坐标
        startPickUp() {
            this.clear();
            this.instance = new SSmap.graphic.Billboard({
                url: SSmap.$baseUrl + "/assets/images/blueicon.png",
                style: {
                    width: 20,
                    height: 32,
                },
            });
            this.instance.$on("end", () => {
                let point = this.instance.instance.position.toCartographic();
                this.lon = Number(((point.lon / Math.PI) * 180).toFixed(6));
                this.lat = Number(((point.lat / Math.PI) * 180).toFixed(6));
                this.height = Number(point.height.toFixed(1));
                if (this.height == 0) this.height = 0;
            });
        },
        clear() {
            SSmap.graphic.Billboard.removeAll();
        },
        flyToEntity() {
            this.clear();
            // 底图上加点
            this.addPoint();
            let scene = viewer.scene;
            let camera = scene.mainCamera;
            camera.flyTo(
                SSmap.Cartographic.fromDegrees(
                    Number(this.lon),
                    Number(this.lat),
                    1000
                )
            );
        },
    },
    data() {
        return {
            lon: 0,
            lat: 0,
            height: 0,
            instance: null,
        };
    },
    watch: {
        showPosition(val) {
            if (val === false) {
                this.clear();
                this.lon = 0;
                this.lat = 0;
                this.height = 0;
            }
        },
    },
};
</script>

<style scoped>
.position {
    position: absolute;
    top: 80px;
    right: 16px;
    z-index: 20;
    background-color: rgba(36, 56, 72, 0.9);
    color: #fff;
    width: 400px;
    text-align: center;
}
.position .title {
    height: 36px;
    background-image: url("../../assets/images/baseMaginTitle.png");
}
.position .title .left {
    float: left;
    height: 36px;
    line-height: 36px;
    margin-left: 6px;
}
.position .title .right {
    float: right;
    width: 16px;
    height: 36px;
    line-height: 36px;
    margin-right: 6px;
    cursor: pointer;
}
.position .title .right:hover {
    color: rgba(45, 133, 240, 0.8);
}
.content {
    height: 220px;
}
.content .coordinate {
    margin: 16px 0;
    height: 30px;
}
.content .coordinate input {
    width: 200px;
    height: 30px !important;
    box-sizing: border-box;
    border: 1px solid #fff;
    padding: 2px 10px;
    border-radius: 2px;
    outline: none;
    color: #fff;
    background: none;
}
.content .fly {
    height: 50px;
    line-height: 50px;
}
.content .fly button {
    width: 90px;
    height: 36px;
    font-size: 16px;
    color: #fff;
    font-weight: 500;
    background: rgb(64, 158, 255);
    border-radius: 4px;
    font-family: Arial, Helvetica, sans-serif;
    border: none;
    cursor: pointer;
    margin: 0 5px;
}
</style>
