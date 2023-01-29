<template>
  <div class="block" >
    <div class="bottomdiv" v-if = "sunshineAnalyze">
      <el-slider
        id="sunslider"
        v-model="timeline"
        :max="720"
        :marks="nowmarks"
        range
        :format-tooltip="formatTooltip"
        @input="realtimeupdate"
      >
      </el-slider>
      <!-- 播放 -->
      <el-tooltip :content="playSunMock ? '播放' : '暂停'" placement="top">
        <el-button
          style="margin: 5px 10px; float: right; font-size: 20px"
          @click="playSun"
          type="text"
          :icon="playSunMock ? 'el-icon-video-play' : 'el-icon-video-pause'"
          circle
        ></el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script>
export default {
  name: "sunshine",
  data() {
    return {
      timeline: [0, 720],
      playSunMock: true, // 是否启动播放条,true是待播放状态,不启动播放条
      preNum: 0, // 用户检测的日照分析范围第一个时间点
      nextNum: 0, // 用户检测的日照分析范围第二个时间点
      nowmarks: {
        0: "7:00",
        60: "8:00",
        120: "9:00",
        180: "10:00",
        240: "11:00",
        300: "12:00",
        360: "13:00",
        420: "14:00",
        480: "15:00",
        540: "16:00",
        600: "17:00",
        660: "18:00",
        720: "19:00"
      },
      h: 0, // 小时
      m: 0 // 分钟
    };
  },
  props:["sunshineAnalyze"],
  methods: {
    // 数据改变时触发（使用鼠标拖曳时，活动过程实时触发）
    realtimeupdate() {
      // 播放图标,暂停状态,用收集用户移动的滑条值记录在preNum和nextNum,用来作为用户监测日照分析时间范围
      if (this.playSunMock) {
        this.preNum = this.timeline[0];
        this.nextNum = this.timeline[1];
      } else {
        // 在监测日照时间范围内移动,则正常v-model收集数据;
        if (this.timeline[0] > this.preNum && this.timeline[1] < this.nextNum)
          this.timeline = [this.timeline[0], this.timeline[1]];
        window.a = this.timeline[1];
        // 移动超出监测日照时间范围,就用监测时间点赋值给this.timeline[0]或this.timeline[1]
        if (this.timeline[1] > this.nextNum) {
          this.timeline = [this.preNum, this.nextNum - 5];
        }
      }
    },
    // 控制进度条播放和暂停
    playSun() {
      if (this.playSunMock) {
        // 播放,300毫秒执行一次,相当于一分钟
        this.playSunMock = false;
        window.a = this.preNum;

        this.timer = setInterval(() => {
          window.a++;
          this.timeline = [this.preNum, window.a];
          if (window.a >= this.nextNum) {
            clearInterval(this.timer);
            this.playSunMock = true;
          }
          this.setsunshadows();
        }, 300);
      } else {
        // 暂停
        clearInterval(this.timer);
        this.playSunMock = true;
      }
    },
    // 格式化提示信息(更改提示信息),前后两个提示值传进该函数然后运算,然后用新值提示
    formatTooltip(val) {
      var minute = 420 + val;
      var h = Math.floor(minute / 60);
      var m = minute % 60 > 9 ? minute % 60 : "0" + (minute % 60);
      this.h = h;
      this.m = m;
      return h + ":" + m;
    },
    //定时控制不同时间的太阳
    setsunshadows() {
      var allTime = this.h * 3600 + this.m * 60;
      var hour = Math.floor(allTime / 3600); //时
      var restTimeOfRemoveHour = allTime - 3600 * hour;
      var minute = Math.floor(restTimeOfRemoveHour / 60); //分
      minute = Number(minute > 9 ? minute : "0" + minute);
      var today = new Date();
      var year = today.getFullYear();
      var month = today.getMonth() + 1;
      var date = today.getDate();
      GlobalViewer.timeSystem.setYear(year);
      GlobalViewer.timeSystem.setMonth(month);
      GlobalViewer.timeSystem.setDay(date);
      GlobalViewer.timeSystem.setHour(hour);
      GlobalViewer.timeSystem.setMinute(minute);
      GlobalViewer.timeSystem.setSecond(0);
    }
  }
};
</script>

<style>
.block {
  position: fixed;
  width: 100%;
  height: 50px;
  bottom: 2px;
  z-index: 1;
}
.block .bottomdiv {
  width: 60%;
  height: 100%;
  margin: 0 auto;
  background-color: rgba(59, 59, 59, 0.8);
}
.block .bottomdiv #sunslider {
  width: 85%;
  float: left;
  margin-left: 3%;
}
</style>
