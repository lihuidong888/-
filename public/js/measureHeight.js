window.measureObj = []; // 用于存放标签对象的删除
let convertObj = {
    // 相同数据转换
    "米-米": function (value) {
        return value;
    },
    "千米-千米": function (value) {
        return value;
    },
    // 转换数据的公式
    "米-千米": function (value) {
        return value * 0.001;
    },
    "千米-米": function (value) {
        return value * 1000;
    },
};
function measureHeightStarts() {
    // 用于防止重复点击
    if (window.instance) {
        window.instance.remove();
        window.instance = null;
    }
    let type = { type: "height" };
    window.instance = new SSmap.Measure(type);
    document.onmousedown = function () {
        if (window.instance.cache.labelList[0]) {
            // 判断条件是需要等用户测量完成才保存测量对象
            window.measureObj.push(window.instance);
            window.instance = null;
            if (window.newUnit != "米") {
                window.measureObj.forEach((item) => {
                    let textMeasureObj = item.cache.labelList[0].text;
                    if (
                        textMeasureObj.indexOf("千米") === -1 &&
                        textMeasureObj.indexOf("米")
                    ) {
                        const numIndexStart = textMeasureObj.indexOf(":") + 1;
                        const numIndexEnd = textMeasureObj.indexOf("米");
                        let newData = convertObj["米-" + window.newUnit](
                            textMeasureObj.slice(numIndexStart, numIndexEnd)
                        );
                        item.cache.labelList[0].text =
                            "高度差:" +
                            Number(newData).toFixed(2) +
                            window.newUnit;
                    }
                });
            }
            document.onmousedown = null;
        }
    };
}
function listenersHeight() {
    let convertUnit = window.oldUnit + "-" + window.newUnit;
    window.measureObj.forEach((item) => {
        let textMeasureObj = item.cache.labelList[0].text;
        const num1IndexStart = textMeasureObj.indexOf(":") + 1;
        const num1IndexEnd = textMeasureObj.indexOf(window.oldUnit);
        let newData = convertObj[convertUnit](
            textMeasureObj.slice(num1IndexStart, num1IndexEnd)
        );
        item.cache.labelList[0].text =
            "高度差:" + Number(newData).toFixed(2) + window.newUnit;
    });
}
export default measureHeightStarts;
export const listenerHeight = listenersHeight;
