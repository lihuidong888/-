window.measureObj = []; // 用于存放标签对象的删除
window.labelObj = []; // 用于存放标签对象的修改
let convertObj = {
    // 相同数据转换
    "m-m": function (value) {
        return value;
    },
    "km-km": function (value) {
        return value;
    },
    "nmi-nmi": function (value) {
        return value;
    },
    "丈-丈": function (value) {
        return value;
    },
    // 转换数据的公式
    "m-km": function (value) {
        return value * 0.001;
    },
    "m-nmi": function (value) {
        return value / 1852;
    },
    "m-丈": function (value) {
        return (value / 10) * 3;
    },
    "km-m": function (value) {
        return value * 1000;
    },
    "nmi-m": function (value) {
        return value * 1852;
    },
    "丈-m": function (value) {
        return (value * 10) / 3;
    },
    "km-nmi": function (value) {
        return value / 1.852;
    },
    "km-丈": function (value) {
        return value * 300;
    },
    "nmi-km": function (value) {
        return value * 1.852;
    },
    "丈-km": function (value) {
        return value / 300;
    },
    "nmi-丈": function (value) {
        return value * 555.6;
    },
    "丈-nmi": function (value) {
        return value / 555.6;
    },
};
function measureLengthStarts() {
    // 用于防止重复点击
    if (window.instance) {
        window.instance.remove();
        window.instance = null;
    }
    let type = { type: "line" };
    window.instance = new SSmap.Measure(type);

    document.onmousedown = function (e) {
        if (e.button == 2) {
            if (window.instance.cache.labelList.length) {// 判断条件是需要等用户测量完成才保存标签对象
                window.instance.cache.labelList.forEach((labelItem) => {
                    window.labelObj.push(labelItem);
                });
                window.measureObj.push(window.instance);
                window.instance = null;
                if (window.newUnit != "m") {
                    window.labelObj.forEach((item) => {
                        let textMeasureObj = item.text;
                        if (
                            textMeasureObj.indexOf("km") === -1 &&
                            textMeasureObj.indexOf("nmi") === -1 &&
                            textMeasureObj.indexOf("m")
                        ) {
                            const numIndexStart =
                                textMeasureObj.indexOf("：") + 1;
                            const numIndexEnd = textMeasureObj.indexOf("m");
                            let newData = convertObj["m-" + window.newUnit](
                                textMeasureObj.slice(numIndexStart, numIndexEnd)
                            );
                            item.text =
                                Number(newData).toFixed(2) + window.newUnit;
                        }
                    });
                }
                document.onmousedown = null;
            }
        }
    };
}
function listenersLength() {
    let convertUnit = window.oldUnit + "-" + window.newUnit;
    window.labelObj.forEach((item) => {
        let textMeasureObj = item.text;
        const num1IndexStart = textMeasureObj.indexOf("：") + 1;
        const num1IndexEnd = textMeasureObj.indexOf(window.oldUnit);
        let newData = convertObj[convertUnit](
            textMeasureObj.slice(num1IndexStart, num1IndexEnd)
        );
        item.text = Number(newData).toFixed(2) + window.newUnit;
    });
}
export default measureLengthStarts;
export const listenerLength = listenersLength;
