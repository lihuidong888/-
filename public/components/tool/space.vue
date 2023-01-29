<template>
  <div id="root">
    <div class="measure" v-if="showSpace">
      <div class="title">
        <div class="left">图上量算</div>
        <div class="right" @click="closeSpace">X</div>
      </div>
      <div class="content">
        <div class="box" style="margin-top:14px">
          <div class="measureOption1">
            <div @click = "showSunshine">
              <div class="one">
                <img src="../../assets/image图片/太阳，天气.png" />
              </div>
              日照分析
            </div>
            <div>
              <div class="two">
                <img src="../../assets/image图片/视域分析.png" />
              </div>
              可视域
            </div>
            <div>
              <div class="three">
                <img src="../../assets/image图片/gis_方量分析.png" />
              </div>
              开挖方量
            </div>
          </div>
        </div>
        <div class="box">
          <div class="measureOption1">
            <div>
              <div class="four">
                <img src="../../assets/image图片/gis_地形开挖.png" />
              </div>
              地形开挖
            </div>
            <div>
              <div class="five">
                <img src="../../assets/image图片/透明.png" />
              </div>
              地表透明
            </div>
            <div>
              <div class="six">
                <img src="../../assets/image图片/坡向分析.png" />
              </div>
              坡度分析
            </div>
          </div>
        </div>
        <div class="box" style="margin-bottom:18px">
          <div class="measureOption1">
            <div>
              <div class="seven">
                <img src="../../assets/image图片/剖切.png" />
              </div>
              剖切分析
            </div>
            <div>
              <div class="eight">
                <img src="../../assets/image图片/iconfont图标_压平.png" />
              </div>
              压平分析
            </div>
            <div>
              <div class="nine">
                <img src="../../assets/image图片/限幅器.png" />
              </div>
              限高分析
            </div>
          </div>
        </div>
      </div>
    </div>
    <sunshine :sunshineAnalyze.sync = "sunshineAnalyze"/>
  </div>
</template>

<script>
import sunshine from "./space/sunshine.vue";
export default {
  name: "Space",
  props: ["showSpace"],
  methods: {
    // 关闭测量
    closeSpace() {
      this.$emit("update:showSpace", false);
    },
    // 日照分析
    showSunshine() {
       this.sunshineAnalyze = true;
    }
  },
  data() {
    return {
       sunshineAnalyze:false,
    };
  },
  components: { sunshine }
};
</script>

<style scoped>
.measure {
  position: absolute;
  top: 80px;
  right: 16px;
  z-index: 20;
  background-color: rgba(36, 56, 72, 0.9);
  color: #fff;
  width: 400px;
  text-align: center;
}
.measure .title {
  height: 36px;
  background-image: url("../../assets/image图片/baseMaginTitle.png");
}
.measure .title .left {
  float: left;
  height: 36px;
  line-height: 36px;
  margin-left: 6px;
}
.measure .title .right {
  float: right;
  width: 16px;
  height: 36px;
  line-height: 36px;
  margin-right: 6px;
  cursor: pointer;
}
.measure .title .right:hover {
  color: rgba(45, 133, 240, 0.8);
}
.measure .measureOption1 {
  width: 70%;
}
.measure .content {
  position: relative;
  width: 400px;
  height: auto;
}
.measure .box {
  display: flex;
  justify-content: center;
}
.measure .measureOption1 {
  margin: 16px 0;
  /* border: 1px solid green; */
  display: flex;
  justify-content: space-between;
}
.measure .measureOption1 > div {
  display: inline-block;
}
.measure .measureOption1 > div:hover {
  color: rgba(45, 133, 240, 0.8);
  cursor: pointer;
}
.measure .measureOption1 > div div {
  width: 60px;
  height: 60px;
  line-height: 60px;
  margin-bottom: 10px;
  /* border: 1px solid green; */
  border-radius: 50%;
  text-align: center;
}
.measure .measureOption1 .one {
  background-color: rgb(215, 116, 9);
}
.measure .measureOption1 .two,
.measure .measureOption1 .five {
  background-color: rgb(190, 148, 255);
}
.measure .measureOption1 .three {
  background-color: rgb(142, 185, 255);
}
.measure .measureOption1 .four {
  background-color: rgb(91, 228, 245);
}
.measure .measureOption1 .six {
  background-color: rgb(154, 210, 42);
}
.measure .measureOption1 .seven {
  background-color: rgb(102, 213, 160);
}
.measure .measureOption1 .eight {
  background-color: rgb(76, 187, 61);
}
.measure .measureOption1 .nine {
  background-color: rgb(186, 187, 40);
}
.measure .content .measureOption1 img {
  width: 30px;
  height: 30px;
  vertical-align: middle;
}
</style>
