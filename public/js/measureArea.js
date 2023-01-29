window.measureObj = []; // 用于存放标签对象
let convertObj = {
    // 相同数据转换
    "m²-m²": function (value) {
        return value;
    },
    "km²-km²": function (value) {
        return value;
    },
    // 转换数据的公式
    "m²-km²": function (value) {
        return value / 1000000;
    },
    "km²-m²": function (value) {
        return value * 1000000;
    },
};
function measureAreaStarts() {
    // 用于防止重复点击
    if (window.instance) {
        window.instance.remove();
        window.instance = null;
    }
    let type = "area";
    window.instance = new SSmap.Measure(type);
    document.onmousedown = function (e) {
        if (e.button == 2) {
            if (window.instance.cache.labelList[0]) {// 判断条件是需要等用户测量完成才保存测量对象
                window.measureObj.push(window.instance);
                window.instance = null;
                if (window.newUnit != "m²") {
                    window.measureObj.forEach((item) => {
                        let textMeasureObj = item.cache.labelList[0].text;
                        if (
                            textMeasureObj.indexOf("km²") === -1 &&
                            textMeasureObj.indexOf("m²")
                        ) {
                            const numIndexStart =
                                textMeasureObj.indexOf("：") + 1;
                            const numIndexEnd = textMeasureObj.indexOf("m²");
                            let newData = convertObj["m²-" + window.newUnit](
                                textMeasureObj.slice(numIndexStart, numIndexEnd)
                            );
                            item.cache.labelList[0].text =
                                "面积：" +
                                Number(newData).toFixed(2) +
                                window.newUnit;
                        }
                    });
                }
                document.onmousedown = null;
            }
        }
    };
}
function listenersArea() {
    let convertUnit = window.oldUnit + "-" + window.newUnit;
    window.measureObj.forEach((item) => {
        let textMeasureObj = item.cache.labelList[0].text;
        const num1IndexStart = textMeasureObj.indexOf("：") + 1;
        const num1IndexEnd = textMeasureObj.indexOf(window.oldUnit);
        let newData = convertObj[convertUnit](
            textMeasureObj.slice(num1IndexStart, num1IndexEnd)
        );
        item.cache.labelList[0].text =
            "面积：" + Number(newData).toFixed(2) + window.newUnit;
    });
}
export default measureAreaStarts;
export const listenerArea = listenersArea;
