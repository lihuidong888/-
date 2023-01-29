<template>
  <div class="measure" v-if="showMeasure">
    <div class="title">
      <div class="left">图上量算</div>
      <div class="right" @click="closeMeasure">X</div>
    </div>
    <div class="content">
      <div class="box">
        <div class="measureOption1">
          <div @click="measureLength">
            <div class="one">
              <img src="../../assets/images/尺子.png" />
            </div>
            距离量算
          </div>
          <div @click="measureArea">
            <div class="two">
              <img src="../../assets/images/面积.png" />
            </div>
            水平面积
          </div>
          <div @click="measureAngle">
            <div class="three">
              <img src="../../assets/images/角度.png" />
            </div>
            角度
          </div>
        </div>
      </div>
      <div class="box">
        <div class="measureOption2">
          <div @click="measureHeight">
            <div class="four">
              <img src="../../assets/images/高度.png" />
            </div>
            高度测量
          </div>
          <div @click="measureVolumn">
            <div class="five">
              <img src="../../assets/images/体积.png" />
            </div>
            体积测量
          </div>
        </div>
      </div>
      <div class="conversion">
        <el-form ref="form" :model="form" label-width="80px">
          <el-form-item label="单位" style="color: #fff">
            <el-select v-model="form.region" placeholder="自动" class="ss">
              <span v-for="(convertUnit, index) in convertUnits" :key="index">
                <div v-if="showOptions === index">
                  <el-option
                    v-for="Unit in convertUnit.unit"
                    :label="Unit.split('-')[0]"
                    :value="Unit.split('-')[1]"
                    :key="Unit"
                  ></el-option>
                </div>
              </span>
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      <el-button type="primary" style="width: 90%" @click="clearMeasure"
        >清空测量数据</el-button
      >
    </div>
  </div>
</template>

<script>
import measureLengthStarts from "../../js/measureLength";
import { listenerLength } from "../../js/measureLength";
import measureAreaStarts from "../../js/measureArea";
import { listenerArea } from "../../js/measureArea";
import measureAngleStarts from "../../js/measureAngle";
import { listenerAngle } from "../../js/measureAngle";
import measureHeightStarts from "../../js/measureHeight";
import { listenerHeight } from "../../js/measureHeight";
import measureVolumeStarts from "../../js/measureVolume";
export default {
  name: "Measure",
  props: ["showMeasure"],
  methods: {
    // 关闭测量
    closeMeasure() {
      this.$emit("update:showMeasure", false);
    },
    // 清除测量数据
    clearMeasure() {
      if (window.measureObj) {
        window.measureObj.forEach((item) => {
            item.remove();
        });
      }
      window.measureObj = [];
      window.labelObj = [];
    },
    // 测量面积
    measureArea() {


      measureAreaStarts();
      if (this.showOptions === 1) return;
      this.form.region = "m²";
      window.form = this.form;
      this.unit = "m²";
      this.showOptions = 1;
    },
    // 测量长度
    measureLength() {
      measureLengthStarts();
      if (this.showOptions === 0) return;
      // 初始化
      window.labelObj = [];
      this.form.region = "m";
      window.form = this.form;
      this.unit = "m";
      this.showOptions = 0;
    },
    // 测量角度
    measureAngle() {
      measureAngleStarts();
      if (this.showOptions === 2) return;
      window.labelObj = [];
      this.form.region = "度";
      window.form = this.form;
      this.unit = "度";
      this.showOptions = 2;
    },
    // 测量高度
    measureHeight() {
      measureHeightStarts();
      if (this.showOptions === 3) return;
      this.form.region = "米";
      window.form = this.form;
      this.unit = "米";
      this.showOptions = 3;
    },
    // 测量体积
    measureVolumn() {
      measureVolumeStarts();
      if (this.showOptions === 4) return;
      this.form.region = "m³";
      window.form = this.form;
      this.unit = "m³";
      this.showOptions = 4;
    }
  },
  data() {
    return {
      form: {
        region: "m" // 起初是新值
      },
      unit: "m", // 存放监控转换单位值,起初是旧值
      showOptions: 0, // 遍历选项
      convertUnits: [
        {
          id: 0,
          auto: "米",
          unit: ["米-m", "公里-km", "海里-nmi", "丈-丈"]
        },
        {
          id: 1,
          auto: "平方米",
          unit: ["平方米-m²", "平方千米-km²"]
        },
        {
          id: 2,
          auto: "度",
          unit: ["度-度", "弧度-rad"]
        },
        {
          id: 3,
          auto: "米",
          unit: ["米-米", "千米-千米"]
        },
        {
          id: 4,
          auto: "立方米",
          unit: ["立方米-m³"]
        }
      ],
    };
  },
  watch: {
    showOptions() {
      this.clearMeasure();// 每次换测量模块都清空存放的标签对象
    },
    form: {
      handler(newValue) {
        window.form = this.form; // 分割模块，提升变量

        window.oldUnit = this.unit;

        window.newUnit = newValue.region;
        this.unit = newValue.region; // 值转变，用于下次触发
        // 监控测量的长度
        if (this.showOptions === 0) {
          listenerLength();
        }
        // 监控测量的面积
        if (this.showOptions === 1) {
          listenerArea();
        }
        // 监控测量的角度
        if (this.showOptions === 2) {
          listenerAngle();
        }
        // 监控测量的高度
        if (this.showOptions === 3) {
          listenerHeight();
        }
      },
      deep: true,
      immediate: true
    },
  }
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
  background-image: url("../../assets/images/baseMaginTitle.png");
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
.measure .measureOption2 {
  width: 46%;
}
.measure .content {
  position: relative;
  width: 400px;
  height: 370px;
}
.measure .box {
  display: flex;
  justify-content: center;
}
.measure .measureOption1,
.measure .measureOption2 {
  margin: 16px 0;
  /* border: 1px solid green; */
  display: flex;
  justify-content: space-between;
}
.measure .measureOption1 > div,
.measure .measureOption2 > div {
  display: inline-block;
}
.measure .measureOption1 > div:hover {
  color: rgba(45, 133, 240, 0.8);
  cursor: pointer;
}
.measure .measureOption2 > div:hover {
  color: rgba(45, 133, 240, 0.8);
  cursor: pointer;
}
.measure .measureOption1 > div div,
.measure .measureOption2 > div div {
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
.measure .measureOption1 .two {
  background-color: rgb(91, 228, 245);
}
.measure .measureOption1 .three {
  background-color: rgb(154, 210, 42);
}
.measure .measureOption2 .four {
  background-color: rgb(76, 187, 61);
}
.measure .measureOption2 .five {
  background-color: rgb(102, 213, 160);
}
.measure .content .measureOption1 img,
.measure .content .measureOption2 img {
  width: 30px;
  height: 30px;
  vertical-align: middle;
}
.measure .conversion {
  margin-bottom: 16px;
}
</style>
