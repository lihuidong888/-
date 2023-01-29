window.measureObj = []; // 用于存放标签对象
function measureVolumeStarts() {
    // 用于防止重复点击
    if (window.instance) {
        window.instance.remove();
        window.instance = null;
    }
    // 定义开关，判断存储实体时间点
    let toggle = false;
    let type = { type: "volume" };
    window.instance = new SSmap.Measure(type);
    document.onmousedown = function (e) {
        if (e.button == 2) {
            toggle = true;
        }
        if (e.button == 0 && toggle == true) {
            window.measureObj.push(window.instance);
            window.instance = null;
            document.onmousedown = null;
            toggle = false;
        }
    };
}
export default measureVolumeStarts;
